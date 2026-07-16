/**
 * Zod schema placeholders — wire into validate middleware when implementing.
 */
const { z } = require('zod');

const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
};

const registerSchema = {
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8),
  }),
};

module.exports = {
  loginSchema,
  registerSchema,
};
