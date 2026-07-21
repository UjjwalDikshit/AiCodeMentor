const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const idParam = { params: z.object({ id: objectId }) };

const listSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    language: z.string().max(40).optional(),
  }),
};

const createSchema = {
  body: z.object({
    title: z.string().max(200).optional(),
    code: z.string().max(500000).optional(),
    filename: z.string().max(260).optional(),
    oldCode: z.string().max(500000).optional(),
    sourceType: z.enum(['snippet', 'files', 'zip', 'github_url', 'diff', 'pr_diff']).optional(),
  }),
};

const analyzeSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      code: z.string().max(500000).optional(),
      filename: z.string().max(260).optional(),
      language: z.string().max(40).optional(),
      title: z.string().max(200).optional(),
      files: z.array(z.object({ filename: z.string(), content: z.string() })).max(20).optional(),
      zipBase64: z.string().max(8_000_000).optional(),
      githubRawUrl: z.string().url().optional(),
      diffText: z.string().max(500000).optional(),
      includeAiReview: z.boolean().optional(),
      provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
      model: z.string().max(100).optional(),
    })
    .optional()
    .default({}),
};

const chatSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    message: z.string().trim().min(1).max(8000),
    provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
    model: z.string().max(100).optional(),
  }),
};

const diffSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    oldCode: z.string().max(500000).optional(),
    newCode: z.string().max(500000).optional(),
    provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
    model: z.string().max(100).optional(),
  }),
};

const providerBody = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
      model: z.string().max(100).optional(),
    })
    .optional()
    .default({}),
};

module.exports = {
  objectId,
  idParam,
  listSchema,
  createSchema,
  analyzeSchema,
  chatSchema,
  diffSchema,
  providerBody,
};
