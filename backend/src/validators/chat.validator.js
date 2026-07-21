const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const createConversationSchema = {
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
    model: z.string().trim().min(1).max(100).optional(),
    systemPrompt: z.string().trim().min(1).max(100).optional(),
    systemPromptOverride: z.string().max(8000).optional(),
    memoryKind: z.enum(['none', 'buffer', 'conversation', 'window', 'summary']).optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().int().min(1).max(100).optional(),
    maxTokens: z.number().int().min(1).max(8192).optional(),
    templateId: objectId.optional().nullable(),
    color: z.string().max(20).optional(),
    icon: z.string().max(40).optional(),
    isFavorite: z.boolean().optional(),
  }),
};

const updateConversationSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
      model: z.string().trim().min(1).max(100).optional(),
      systemPrompt: z.string().trim().min(1).max(100).optional(),
      systemPromptOverride: z.string().max(8000).optional(),
      memoryKind: z.enum(['none', 'buffer', 'conversation', 'window', 'summary']).optional(),
      temperature: z.number().min(0).max(2).optional(),
      topP: z.number().min(0).max(1).optional(),
      topK: z.number().int().min(1).max(100).optional(),
      maxTokens: z.number().int().min(1).max(8192).optional(),
      isPinned: z.boolean().optional(),
      isFavorite: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      color: z.string().max(20).optional(),
      icon: z.string().max(40).optional(),
      templateId: objectId.optional().nullable(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' }),
};

const conversationIdParam = { params: z.object({ id: objectId }) };

const listConversationsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    archived: z.enum(['true', 'false']).optional(),
    favorites: z.enum(['true', 'false']).optional(),
    cursor: z.string().optional(),
  }),
};

const listMessagesSchema = {
  params: z.object({ id: objectId }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    before: z.string().optional(),
  }),
};

const searchSchema = {
  query: z.object({ q: z.string().trim().min(1).max(200) }),
};

const chatSendSchema = {
  body: z.object({
    conversationId: objectId,
    message: z.string().trim().min(1).max(50000),
    attachments: z
      .array(
        z.object({
          filename: z.string().optional(),
          originalName: z.string().optional(),
          mimeType: z.string().optional(),
          size: z.number().optional(),
          path: z.string().optional(),
          uploadedAt: z.string().optional(),
        })
      )
      .max(10)
      .optional(),
  }),
};

const chatStopSchema = { body: z.object({ requestId: z.string().trim().min(1) }) };
const regenerateSchema = { body: z.object({ conversationId: objectId }) };

const templateBody = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().trim().min(1).max(100).optional(),
  memoryKind: z.enum(['none', 'buffer', 'conversation', 'window', 'summary']).optional(),
  temperature: z.number().min(0).max(2).optional(),
  provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
  model: z.string().optional(),
  suggestions: z.array(z.string().max(300)).max(20).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(40).optional(),
  isFavorite: z.boolean().optional(),
});

const createTemplateSchema = { body: templateBody };
const updateTemplateSchema = {
  params: z.object({ id: objectId }),
  body: templateBody.partial().refine((d) => Object.keys(d).length > 0),
};

const promptBody = z.object({
  title: z.string().trim().min(1).max(160),
  category: z
    .enum(['Coding', 'Interview', 'Resume', 'Career', 'System Design', 'Debugging', 'Architecture', 'Other'])
    .optional(),
  registryKey: z.string().max(100).optional(),
  body: z.string().max(20000).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).max(20).optional(),
  isFavorite: z.boolean().optional(),
});

const createPromptSchema = { body: promptBody };
const updatePromptSchema = {
  params: z.object({ id: objectId }),
  body: promptBody.partial().refine((d) => Object.keys(d).length > 0),
};

module.exports = {
  createConversationSchema,
  updateConversationSchema,
  conversationIdParam,
  listConversationsSchema,
  listMessagesSchema,
  searchSchema,
  chatSendSchema,
  chatStopSchema,
  regenerateSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createPromptSchema,
  updatePromptSchema,
};
