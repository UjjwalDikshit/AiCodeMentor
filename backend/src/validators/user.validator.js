/**
 * Zod validation schemas for user profile endpoints.
 */
const { z } = require('zod');
const { passwordSchema } = require('./auth.validator');

const updateProfileSchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      currentGoal: z.string().trim().max(500).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
};

const updatePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, 'Confirm password is required'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
};

module.exports = {
  updateProfileSchema,
  updatePasswordSchema,
};
