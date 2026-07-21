const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const { assertOwner, serializeConversation, serializeMessage } = require('./conversation.service');
const { AppError } = require('../utils/AppError');

function toMarkdown(conversation, messages) {
  const lines = [
    `# ${conversation.title}`,
    '',
    `- Provider: ${conversation.provider}`,
    `- Model: ${conversation.model}`,
    `- Prompt: ${conversation.systemPrompt}`,
    `- Memory: ${conversation.memoryKind}`,
    `- Exported: ${new Date().toISOString()}`,
    '',
    '---',
    '',
  ];
  for (const m of messages) {
    lines.push(`## ${m.role}`, '', m.content || '', '');
  }
  return lines.join('\n');
}

/** Minimal single-page text PDF */
function toPdf(text) {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .slice(0, 15000);
  const lines = escaped.split('\n').slice(0, 60);
  const contentLines = lines.map((l, i) => `BT /F1 10 Tf 40 ${780 - i * 12} Td (${l.slice(0, 90)}) Tj ET`);
  const stream = contentLines.join('\n');
  const objects = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj');
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj');
  objects.push('3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj');
  objects.push(`4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`);
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

const exportImportService = {
  async exportConversation(userId, id, format = 'json') {
    const conversation = await assertOwner(id, userId);
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).lean();
    const conv = serializeConversation(conversation);
    const msgs = messages.map(serializeMessage);
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      conversation: conv,
      messages: msgs,
    };

    if (format === 'markdown' || format === 'md') {
      return { contentType: 'text/markdown', filename: `${conv.title || 'chat'}.md`, body: toMarkdown(conv, msgs) };
    }
    if (format === 'pdf') {
      return {
        contentType: 'application/pdf',
        filename: `${conv.title || 'chat'}.pdf`,
        body: toPdf(toMarkdown(conv, msgs)),
        binary: true,
      };
    }
    return {
      contentType: 'application/json',
      filename: `${conv.title || 'chat'}.json`,
      body: JSON.stringify(payload, null, 2),
    };
  },

  async importConversation(userId, payload) {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const src = data.conversation || data;
    const messages = data.messages || [];
    if (!src) throw new AppError('Invalid import payload', 400);

    const conversation = await Conversation.create({
      userId,
      title: src.title || 'Imported Chat',
      titleSource: 'manual',
      provider: src.provider || 'dummy',
      model: src.model || 'dummy-echo',
      systemPrompt: src.systemPrompt || 'chat_general',
      systemPromptOverride: src.systemPromptOverride || '',
      memoryKind: src.memoryKind || 'window',
      temperature: src.temperature ?? 0.2,
      topP: src.topP ?? 1,
      topK: src.topK ?? 40,
      maxTokens: src.maxTokens ?? 2048,
      color: src.color || '#6366f1',
      icon: src.icon || 'message-square',
      lastMessage: src.lastMessage || '',
      messageCount: messages.length,
    });

    if (messages.length) {
      await Message.insertMany(
        messages.map((m) => ({
          conversationId: conversation._id,
          userId,
          role: m.role || 'user',
          content: m.content || '',
          attachments: m.attachments || [],
          tokens: m.tokens || {},
          status: 'completed',
          provider: m.provider,
          model: m.model,
        }))
      );
    }

    return serializeConversation(conversation);
  },
};

module.exports = { exportImportService };
