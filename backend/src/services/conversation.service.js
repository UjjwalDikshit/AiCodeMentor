const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const { AppError } = require('../utils/AppError');

async function assertOwner(conversationId, userId) {
  const conversation = await Conversation.findOne({ _id: conversationId, userId });
  if (!conversation) throw new AppError('Conversation not found', 404);
  return conversation;
}

function serializeConversation(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const stats = o.usageStats || {};
  const providerUsage =
    stats.providerUsage instanceof Map
      ? Object.fromEntries(stats.providerUsage)
      : stats.providerUsage || {};
  const modelUsage =
    stats.modelUsage instanceof Map ? Object.fromEntries(stats.modelUsage) : stats.modelUsage || {};
  const avgLatency =
    stats.totalRequests > 0 ? Math.round((stats.totalLatencyMs || 0) / stats.totalRequests) : 0;

  return {
    id: o._id.toString(),
    userId: o.userId.toString(),
    title: o.title,
    titleSource: o.titleSource || 'default',
    lastMessage: o.lastMessage,
    provider: o.provider,
    model: o.model,
    systemPrompt: o.systemPrompt,
    systemPromptOverride: o.systemPromptOverride || '',
    memoryKind: o.memoryKind,
    temperature: o.temperature,
    topP: o.topP,
    topK: o.topK,
    maxTokens: o.maxTokens,
    templateId: o.templateId ? o.templateId.toString() : null,
    isPinned: o.isPinned,
    isFavorite: !!o.isFavorite,
    isArchived: o.isArchived,
    color: o.color || '#6366f1',
    icon: o.icon || 'message-square',
    messageCount: o.messageCount,
    lastOpenedAt: o.lastOpenedAt,
    lastActiveAt: o.lastActiveAt,
    usageStats: {
      promptTokens: stats.promptTokens || 0,
      completionTokens: stats.completionTokens || 0,
      totalTokens: stats.totalTokens || 0,
      estimatedCost: stats.estimatedCost || 0,
      totalRequests: stats.totalRequests || 0,
      averageLatencyMs: avgLatency,
      providerUsage,
      modelUsage,
    },
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function serializeMessage(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    conversationId: o.conversationId.toString(),
    userId: o.userId.toString(),
    role: o.role,
    content: o.content,
    parsed: o.parsed,
    attachments: o.attachments || [],
    tokens: o.tokens || {},
    latency: o.latency,
    provider: o.provider,
    model: o.model,
    requestId: o.requestId,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

const conversationService = {
  async list(userId, { page = 1, limit = 30, archived = false, cursor, favorites } = {}) {
    const filter = { userId, isArchived: archived === true || archived === 'true' };
    if (favorites === true || favorites === 'true') filter.isFavorite = true;
    if (cursor) filter.updatedAt = { $lt: new Date(cursor) };
    const items = await Conversation.find(filter)
      .sort({ isPinned: -1, isFavorite: -1, updatedAt: -1 })
      .skip(cursor ? 0 : (page - 1) * limit)
      .limit(Number(limit) + 1)
      .lean();
    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;
    return {
      items: slice.map(serializeConversation),
      hasMore,
      nextCursor: hasMore ? slice[slice.length - 1].updatedAt.toISOString() : null,
    };
  },

  async create(userId, body = {}) {
    const conversation = await Conversation.create({
      userId,
      title: body.title || 'New Chat',
      titleSource: body.title ? 'manual' : 'default',
      provider: body.provider || 'dummy',
      model: body.model || 'dummy-echo',
      systemPrompt: body.systemPrompt || 'chat_general',
      systemPromptOverride: body.systemPromptOverride || '',
      memoryKind: body.memoryKind || 'window',
      temperature: body.temperature ?? 0.2,
      topP: body.topP ?? 1,
      topK: body.topK ?? 40,
      maxTokens: body.maxTokens ?? 2048,
      templateId: body.templateId || null,
      color: body.color || '#6366f1',
      icon: body.icon || 'message-square',
      isFavorite: !!body.isFavorite,
      lastOpenedAt: new Date(),
      lastActiveAt: new Date(),
    });
    return serializeConversation(conversation);
  },

  async getById(userId, id) {
    const conversation = await assertOwner(id, userId);
    conversation.lastOpenedAt = new Date();
    await conversation.save();
    return serializeConversation(conversation);
  },

  async update(userId, id, body) {
    const conversation = await assertOwner(id, userId);
    const fields = [
      'title',
      'provider',
      'model',
      'systemPrompt',
      'systemPromptOverride',
      'memoryKind',
      'temperature',
      'topP',
      'topK',
      'maxTokens',
      'isPinned',
      'isFavorite',
      'isArchived',
      'color',
      'icon',
      'templateId',
    ];
    for (const key of fields) {
      if (body[key] !== undefined) conversation[key] = body[key];
    }
    if (body.title !== undefined) conversation.titleSource = 'manual';
    await conversation.save();
    return serializeConversation(conversation);
  },

  async remove(userId, id) {
    const conversation = await assertOwner(id, userId);
    await Message.deleteMany({ conversationId: conversation._id });
    await conversation.deleteOne();
    return { deleted: true, id };
  },

  async duplicate(userId, id) {
    const source = await assertOwner(id, userId);
    const copy = await Conversation.create({
      userId,
      title: `${source.title} (copy)`,
      titleSource: 'manual',
      provider: source.provider,
      model: source.model,
      systemPrompt: source.systemPrompt,
      systemPromptOverride: source.systemPromptOverride,
      memoryKind: source.memoryKind,
      temperature: source.temperature,
      topP: source.topP,
      topK: source.topK,
      maxTokens: source.maxTokens,
      templateId: source.templateId,
      color: source.color,
      icon: source.icon,
      lastMessage: '',
      messageCount: 0,
    });
    const messages = await Message.find({ conversationId: source._id }).sort({ createdAt: 1 }).lean();
    if (messages.length) {
      await Message.insertMany(
        messages.map((m) => ({
          conversationId: copy._id,
          userId,
          role: m.role,
          content: m.content,
          parsed: m.parsed,
          attachments: m.attachments || [],
          tokens: m.tokens || {},
          latency: m.latency,
          provider: m.provider,
          model: m.model,
          status: 'completed',
        }))
      );
      copy.messageCount = messages.length;
      copy.lastMessage = source.lastMessage;
      await copy.save();
    }
    return serializeConversation(copy);
  },

  async listMessages(userId, conversationId, { limit = 50, before } = {}) {
    await assertOwner(conversationId, userId);
    const filter = { conversationId };
    if (before) filter.createdAt = { $lt: new Date(before) };
    const items = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1)
      .lean();
    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;
    slice.reverse();
    return {
      items: slice.map(serializeMessage),
      hasMore,
      nextBefore: hasMore ? slice[0].createdAt.toISOString() : null,
    };
  },

  async search(userId, q) {
    const query = String(q || '').trim();
    if (!query) return { conversations: [], messages: [], templates: [], prompts: [] };
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const ChatTemplate = require('../models/ChatTemplate.model');
    const PromptLibrary = require('../models/PromptLibrary.model');

    const [conversations, messages, templates, prompts] = await Promise.all([
      Conversation.find({ userId, title: regex }).sort({ updatedAt: -1 }).limit(20).lean(),
      Message.find({ userId, content: regex }).sort({ createdAt: -1 }).limit(30).lean(),
      ChatTemplate.find({
        $or: [{ userId }, { isSystem: true }],
        name: regex,
      })
        .limit(20)
        .lean(),
      PromptLibrary.find({ userId, $or: [{ title: regex }, { body: regex }] })
        .limit(20)
        .lean(),
    ]);

    return {
      conversations: conversations.map(serializeConversation),
      messages: messages.map(serializeMessage),
      templates: templates.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        description: t.description,
        systemPrompt: t.systemPrompt,
      })),
      prompts: prompts.map((p) => ({
        id: p._id.toString(),
        title: p.title,
        category: p.category,
        registryKey: p.registryKey,
      })),
      query,
    };
  },
};

module.exports = {
  conversationService,
  assertOwner,
  serializeConversation,
  serializeMessage,
};
