/**
 * Chat orchestration — always calls AIExecutionPipeline via ai-service.
 */
const Message = require('../models/Message.model');
const aiClient = require('./aiClient.service');
const { assertOwner, serializeMessage, serializeConversation } = require('./conversation.service');
const { recordUsage, applyConversationStats } = require('./chatAnalytics.service');
const { AppError } = require('../utils/AppError');
const logger = require('../utils/logger');

const activeStreams = new Map();

function buildPipelinePayload(conversation, { message, messages, attachmentsNote }) {
  const history = [...(messages || [])];
  let userContent = message || '';
  if (attachmentsNote) {
    userContent = `${userContent}\n\n[Attachments]\n${attachmentsNote}`.trim();
  }

  const override = (conversation.systemPromptOverride || '').trim();
  if (override) {
    history.unshift({ role: 'system', content: override });
  }

  return {
    messages: history,
    message: userContent,
    model: conversation.model,
    provider: conversation.provider,
    system_prompt: conversation.systemPrompt || 'chat_general',
    skip_system_prompt: Boolean(override),
    memory_kind: conversation.memoryKind || 'window',
    memory_window: 12,
    session_id: `chat:${conversation._id.toString()}`,
    output_format: 'text',
    temperature: conversation.temperature,
    max_tokens: conversation.maxTokens,
  };
}

async function loadHistory(conversationId, limit = 40) {
  const rows = await Message.find({ conversationId, status: { $ne: 'error' } })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
  return rows
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));
}

async function bumpConversation(conversation, lastMessage, { count = true } = {}) {
  conversation.lastMessage = String(lastMessage || '').slice(0, 500);
  conversation.lastActiveAt = new Date();
  if (count) conversation.messageCount = (conversation.messageCount || 0) + 1;
  await conversation.save();
}

function usageFromMeta(meta = {}, data = {}) {
  const usage = meta.usage || data.usage || {};
  return {
    prompt: usage.promptTokens || usage.prompt_tokens || 0,
    completion: usage.completionTokens || usage.completion_tokens || 0,
    total: usage.totalTokens || usage.total_tokens || 0,
    estimatedCost: usage.estimatedCost || 0,
  };
}

async function maybeAutoTitle(conversation, userText, assistantText, userId) {
  if (conversation.titleSource === 'manual') return;
  if (conversation.title !== 'New Chat' && conversation.titleSource !== 'default') return;
  if ((conversation.messageCount || 0) > 3) return;

  try {
    const ai = await aiClient.chat({
      message: 'Generate title',
      provider: conversation.provider || 'dummy',
      model: conversation.model,
      system_prompt: 'chat_title_generator',
      prompt_variables: {
        user_message: String(userText || '').slice(0, 500),
        assistant_preview: String(assistantText || '').slice(0, 500),
      },
      memory_kind: 'none',
      temperature: 0.2,
      max_tokens: 32,
      output_format: 'text',
    });
    const raw = (ai.data?.content || '').trim().replace(/^["']|["']$/g, '');
    const title = raw.split('\n')[0].slice(0, 60);
    if (title) {
      conversation.title = title;
      conversation.titleSource = 'auto';
      await conversation.save();
    }
  } catch (err) {
    logger.warn('auto-title failed', { err: err.message });
    if (conversation.title === 'New Chat' && userText) {
      conversation.title = String(userText).slice(0, 60);
      conversation.titleSource = 'auto';
      await conversation.save();
    }
  }
}

async function track(userId, conversation, tokens, latency, provider, model) {
  await applyConversationStats(conversation, { tokens, latency, provider, model });
  await conversation.save();
  await recordUsage(userId, { tokens, latency, provider, model });
}

const chatService = {
  async send(userId, body) {
    const conversation = await assertOwner(body.conversationId, userId);
    const history = await loadHistory(conversation._id);
    const attachmentsNote = (body.attachments || [])
      .map((a) => `- ${a.originalName || a.filename} (${a.mimeType || 'file'})`)
      .join('\n');

    const userMsg = await Message.create({
      conversationId: conversation._id,
      userId,
      role: 'user',
      content: body.message,
      attachments: body.attachments || [],
      status: 'completed',
    });
    await bumpConversation(conversation, body.message);

    const payload = buildPipelinePayload(conversation, {
      message: body.message,
      messages: history,
      attachmentsNote,
    });

    const ai = await aiClient.chat(payload);
    const meta = ai.meta || {};
    const data = ai.data || {};
    const content = data.content || '';
    const tokens = usageFromMeta(meta, data);

    const assistantMsg = await Message.create({
      conversationId: conversation._id,
      userId,
      role: 'assistant',
      content,
      parsed: data.parsed ?? null,
      tokens,
      latency: meta.latencyMs ?? null,
      provider: meta.provider || conversation.provider,
      model: meta.model || conversation.model,
      requestId: meta.requestId || null,
      status: 'completed',
    });
    await bumpConversation(conversation, content);
    await track(
      userId,
      conversation,
      tokens,
      meta.latencyMs || 0,
      meta.provider || conversation.provider,
      meta.model || conversation.model
    );
    await maybeAutoTitle(conversation, body.message, content, userId);

    return {
      conversation: serializeConversation(conversation),
      userMessage: serializeMessage(userMsg),
      assistantMessage: serializeMessage(assistantMsg),
      meta,
    };
  },

  async stream(userId, body, res) {
    const conversation = await assertOwner(body.conversationId, userId);
    const history = await loadHistory(conversation._id);
    const attachmentsNote = (body.attachments || [])
      .map((a) => `- ${a.originalName || a.filename} (${a.mimeType || 'file'})`)
      .join('\n');

    const userMsg = await Message.create({
      conversationId: conversation._id,
      userId,
      role: 'user',
      content: body.message,
      attachments: body.attachments || [],
      status: 'completed',
    });
    await bumpConversation(conversation, body.message);

    const assistantMsg = await Message.create({
      conversationId: conversation._id,
      userId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      provider: conversation.provider,
      model: conversation.model,
    });

    const payload = buildPipelinePayload(conversation, {
      message: body.message,
      messages: history,
      attachmentsNote,
    });

    const abort = new AbortController();
    let requestId = null;
    let assembled = '';
    let doneUsage = null;
    let doneLatency = 0;
    let doneProvider = conversation.provider;
    let doneModel = conversation.model;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    writeEvent('user', {
      userMessage: serializeMessage(userMsg),
      assistantMessageId: assistantMsg._id.toString(),
    });

    try {
      const upstream = await aiClient.chatStream(payload, { signal: abort.signal });
      const stream = upstream.data;

      await new Promise((resolve, reject) => {
        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk.toString();
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const lines = part.split('\n');
            let event = 'message';
            let dataLine = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              if (line.startsWith('data:')) dataLine += line.slice(5).trim();
            }
            if (!dataLine) continue;
            let payloadJson;
            try {
              payloadJson = JSON.parse(dataLine);
            } catch {
              continue;
            }
            if (payloadJson.requestId) {
              requestId = payloadJson.requestId;
              activeStreams.set(requestId, { abort, userId: String(userId) });
              assistantMsg.requestId = requestId;
            }
            if (event === 'token' && payloadJson.delta) assembled += payloadJson.delta;
            if (event === 'done') {
              assembled = payloadJson.content || assembled;
              if (payloadJson.usage) {
                doneUsage = {
                  prompt: payloadJson.usage.promptTokens || 0,
                  completion: payloadJson.usage.completionTokens || 0,
                  total: payloadJson.usage.totalTokens || 0,
                  estimatedCost: payloadJson.usage.estimatedCost || 0,
                };
                assistantMsg.tokens = doneUsage;
              }
              if (payloadJson.latencyMs != null) {
                doneLatency = payloadJson.latencyMs;
                assistantMsg.latency = doneLatency;
              }
              if (payloadJson.provider) {
                doneProvider = payloadJson.provider;
                assistantMsg.provider = doneProvider;
              }
              if (payloadJson.model) {
                doneModel = payloadJson.model;
                assistantMsg.model = doneModel;
              }
            }
            writeEvent(event, { ...payloadJson, assistantMessageId: assistantMsg._id.toString() });
          }
        });
        stream.on('end', resolve);
        stream.on('error', reject);
        res.on('close', () => {
          abort.abort();
          resolve();
        });
      });

      const stopped = assistantMsg.status === 'stopped';
      assistantMsg.content = assembled;
      assistantMsg.status = stopped ? 'stopped' : 'completed';
      if (!assistantMsg.tokens?.total && assembled) {
        assistantMsg.tokens = {
          prompt: 0,
          completion: Math.ceil(assembled.length / 4),
          total: Math.ceil(assembled.length / 4),
          estimatedCost: 0,
        };
        doneUsage = assistantMsg.tokens;
      }
      await assistantMsg.save();
      await bumpConversation(conversation, assembled || body.message);
      if (!stopped && doneUsage) {
        await track(userId, conversation, doneUsage, doneLatency, doneProvider, doneModel);
      }
      await maybeAutoTitle(conversation, body.message, assembled, userId);

      writeEvent('persisted', {
        assistantMessage: serializeMessage(assistantMsg),
        conversation: serializeConversation(conversation),
      });
    } catch (err) {
      if (abort.signal.aborted) {
        assistantMsg.status = 'stopped';
        assistantMsg.content = assembled;
        await assistantMsg.save();
        writeEvent('stopped', { requestId, assistantMessageId: assistantMsg._id.toString() });
      } else {
        logger.error('chat stream failed', { err: err.message });
        assistantMsg.status = 'error';
        assistantMsg.content = assembled || 'Generation failed';
        await assistantMsg.save();
        writeEvent('error', { error: err.message, assistantMessageId: assistantMsg._id.toString() });
      }
    } finally {
      if (requestId) activeStreams.delete(requestId);
      res.end();
    }
  },

  async regenerate(userId, body) {
    const conversation = await assertOwner(body.conversationId, userId);
    const lastAssistant = await Message.findOne({
      conversationId: conversation._id,
      role: 'assistant',
    }).sort({ createdAt: -1 });
    if (!lastAssistant) throw new AppError('No assistant message to regenerate', 400);

    const lastUser = await Message.findOne({
      conversationId: conversation._id,
      role: 'user',
      createdAt: { $lt: lastAssistant.createdAt },
    }).sort({ createdAt: -1 });
    if (!lastUser) throw new AppError('No user prompt found', 400);

    await lastAssistant.deleteOne();
    conversation.messageCount = Math.max(0, (conversation.messageCount || 1) - 1);
    await conversation.save();

    const history = await loadHistory(conversation._id);
    const prior = history.slice(0, -1);
    const payload = buildPipelinePayload(conversation, {
      message: lastUser.content,
      messages: prior,
    });

    const ai = await aiClient.chat(payload);
    const meta = ai.meta || {};
    const data = ai.data || {};
    const content = data.content || '';
    const tokens = usageFromMeta(meta, data);

    const assistantMsg = await Message.create({
      conversationId: conversation._id,
      userId,
      role: 'assistant',
      content,
      parsed: data.parsed ?? null,
      tokens,
      latency: meta.latencyMs ?? null,
      provider: meta.provider || conversation.provider,
      model: meta.model || conversation.model,
      requestId: meta.requestId || null,
      status: 'completed',
    });
    await bumpConversation(conversation, content);
    await track(
      userId,
      conversation,
      tokens,
      meta.latencyMs || 0,
      meta.provider || conversation.provider,
      meta.model || conversation.model
    );

    return {
      conversation: serializeConversation(conversation),
      userMessage: serializeMessage(lastUser),
      assistantMessage: serializeMessage(assistantMsg),
      meta,
    };
  },

  async retry(userId, body) {
    return this.regenerate(userId, body);
  },

  async stop(userId, { requestId }) {
    const entry = activeStreams.get(requestId);
    if (entry && entry.userId === String(userId)) {
      entry.abort.abort();
      activeStreams.delete(requestId);
    }
    await Message.updateOne({ requestId, userId }, { $set: { status: 'stopped' } });
    return { stopped: true, requestId };
  },

  async listProviders() {
    return aiClient.listProviders();
  },

  async listModels() {
    return aiClient.listModels();
  },
};

module.exports = { chatService, activeStreams };
