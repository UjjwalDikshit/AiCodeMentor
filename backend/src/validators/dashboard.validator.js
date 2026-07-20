/**
 * Zod schemas for dashboard domain endpoints.
 */
const { z } = require('zod');

const updateProgressSchema = {
  body: z
    .object({
      totalSolved: z.number().int().min(0).optional(),
      easySolved: z.number().int().min(0).optional(),
      mediumSolved: z.number().int().min(0).optional(),
      hardSolved: z.number().int().min(0).optional(),
      codingScore: z.number().min(0).max(100).optional(),
      interviewScore: z.number().min(0).max(100).optional(),
      resumeScore: z.number().min(0).max(100).optional(),
      githubScore: z.number().min(0).max(100).optional(),
      currentXP: z.number().min(0).optional(),
      weakTopics: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
      strongTopics: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
};

const createGoalSchema = {
  body: z.object({
    title: z.string().trim().min(1).max(300),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    date: z.string().optional(),
  }),
};

const updateGoalSchema = {
  body: z
    .object({
      title: z.string().trim().min(1).max(300).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      completed: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
  params: z.object({
    id: z.string().min(1),
  }),
};

const goalIdParamsSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

const listGoalsSchema = {
  query: z.object({
    date: z.string().optional(),
  }),
};

const listActivitySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    type: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sort: z.string().optional(),
  }),
};

const listNotificationsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

const notificationIdParamsSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

module.exports = {
  updateProgressSchema,
  createGoalSchema,
  updateGoalSchema,
  goalIdParamsSchema,
  listGoalsSchema,
  listActivitySchema,
  listNotificationsSchema,
  notificationIdParamsSchema,
};
