const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const idParam = { params: z.object({ id: objectId }) };

const listSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
  }),
};

const updateSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    targetRole: z.string().trim().min(1).max(120).optional(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
  }),
};

const searchSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    query: z.string().trim().min(1).max(2000),
    k: z.number().int().min(1).max(50).optional(),
    section: z.string().trim().max(40).optional(),
    similarityThreshold: z.number().min(0).max(1).optional(),
    version: z.number().int().min(1).optional(),
  }),
};

const atsSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
      model: z.string().max(100).optional(),
      version: z.number().int().min(1).optional(),
    })
    .optional()
    .default({}),
};

const bulletsSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      bullets: z.array(z.string()).max(40).optional(),
      provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
      model: z.string().max(100).optional(),
      version: z.number().int().min(1).optional(),
    })
    .optional()
    .default({}),
};

const skillsSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      targetRole: z.string().max(120).optional(),
      provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
      model: z.string().max(100).optional(),
      version: z.number().int().min(1).optional(),
    })
    .optional()
    .default({}),
};

const reportSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      format: z.enum(['json', 'markdown', 'pdf']).optional(),
      provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
      model: z.string().max(100).optional(),
      version: z.number().int().min(1).optional(),
    })
    .optional()
    .default({}),
};

const compareSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    v1: z.number().int().min(1),
    v2: z.number().int().min(1),
    provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
    model: z.string().max(100).optional(),
  }),
};

const jdCreateSchema = {
  body: z.object({
    title: z.string().max(200).optional(),
    company: z.string().max(120).optional(),
    text: z.string().trim().min(20).max(100000),
    resumeId: objectId.optional(),
  }),
};

const matchSchema = {
  params: z.object({ id: objectId, jdId: objectId }),
  body: z
    .object({
      provider: z.enum(['dummy', 'groq', 'ollama']).optional(),
      model: z.string().max(100).optional(),
      version: z.number().int().min(1).optional(),
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

const reindexSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      version: z.number().int().min(1).optional(),
    })
    .optional()
    .default({}),
};

const rollbackSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    version: z.number().int().min(1),
  }),
};

module.exports = {
  objectId,
  idParam,
  listSchema,
  updateSchema,
  searchSchema,
  atsSchema,
  bulletsSchema,
  skillsSchema,
  reportSchema,
  compareSchema,
  jdCreateSchema,
  matchSchema,
  chatSchema,
  reindexSchema,
  rollbackSchema,
};
