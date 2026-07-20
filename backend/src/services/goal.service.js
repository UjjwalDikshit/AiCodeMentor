/**
 * Daily goals service — soft-delete goal items inside DailyGoal.goals[].
 */
const DailyGoal = require('../models/DailyGoal.model');
const { AppError } = require('../utils/AppError');
const { createActivity } = require('./activity.service');
const { writeAudit } = require('./audit.service');
const { startOfDay } = require('./progress.service');
const progressService = require('./progress.service');

function recalculate(doc) {
  const active = doc.goals.filter((g) => !g.isDeleted);
  const completed = active.filter((g) => g.completed).length;
  doc.completedGoals = completed;
  doc.completionPercentage = active.length
    ? Math.round((completed / active.length) * 100)
    : 0;

  if (active.length === 0) doc.status = 'pending';
  else if (completed === active.length) doc.status = 'completed';
  else if (completed > 0) doc.status = 'in_progress';
  else doc.status = 'pending';
}

function activeGoals(doc) {
  return doc.goals.filter((g) => !g.isDeleted);
}

async function ensureToday(userId) {
  const date = startOfDay();
  let doc = await DailyGoal.findOne({ userId, date });
  if (!doc) {
    doc = await DailyGoal.create({ userId, date, goals: [] });
  }
  return doc;
}

async function createGoal(userId, { title, priority = 'medium', date } = {}) {
  if (!title?.trim()) {
    throw new AppError('Goal title is required', 400);
  }

  const targetDate = date ? startOfDay(new Date(date)) : startOfDay();
  let doc = await DailyGoal.findOne({ userId, date: targetDate });
  if (!doc) {
    doc = await DailyGoal.create({ userId, date: targetDate, goals: [] });
  }

  doc.goals.push({
    title: title.trim(),
    priority,
    completed: false,
    isDeleted: false,
    createdAt: new Date(),
  });

  recalculate(doc);
  await doc.save();

  const created = doc.goals[doc.goals.length - 1];

  await createActivity({
    userId,
    type: 'goal_created',
    title: 'Goal created',
    description: created.title,
    points: 5,
    metadata: { goalId: created._id.toString() },
  });

  await progressService.addXp(userId, 5, 'Created a goal');

  return {
    dailyGoal: serializeDailyGoal(doc),
    goal: created,
  };
}

async function updateGoalItem(userId, goalItemId, updates, { ip } = {}) {
  const doc = await DailyGoal.findOne({ userId, 'goals._id': goalItemId });
  if (!doc) {
    throw new AppError('Goal not found', 404);
  }

  const goal = doc.goals.id(goalItemId);
  if (!goal || goal.isDeleted) {
    throw new AppError('Goal not found', 404);
  }

  const wasCompleted = goal.completed;

  if (updates.title !== undefined) goal.title = updates.title.trim();
  if (updates.priority !== undefined) goal.priority = updates.priority;
  if (updates.completed !== undefined) goal.completed = Boolean(updates.completed);

  recalculate(doc);
  await doc.save();

  if (!wasCompleted && goal.completed) {
    await writeAudit({
      userId,
      action: 'goal_completion',
      details: { goalId: goalItemId, title: goal.title },
      ip,
    });

    await createActivity({
      userId,
      type: 'goal_completed',
      title: 'Goal completed',
      description: goal.title,
      points: 20,
      metadata: { goalId: goalItemId },
    });

    await progressService.addXp(userId, 20, 'Completed a goal');
  }

  return {
    dailyGoal: serializeDailyGoal(doc),
    goal,
  };
}

async function softDeleteGoalItem(userId, goalItemId) {
  const doc = await DailyGoal.findOne({ userId, 'goals._id': goalItemId });
  if (!doc) {
    throw new AppError('Goal not found', 404);
  }

  const goal = doc.goals.id(goalItemId);
  if (!goal || goal.isDeleted) {
    throw new AppError('Goal not found', 404);
  }

  goal.isDeleted = true;
  recalculate(doc);
  await doc.save();

  return { dailyGoal: serializeDailyGoal(doc), goal };
}

function serializeDailyGoal(doc, { includeDeleted = false } = {}) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const payload = {
    ...obj,
    goals: activeGoals(obj),
  };
  if (includeDeleted) {
    payload.deletedGoals = obj.goals.filter((g) => g.isDeleted);
  }
  return payload;
}

async function listGoals(userId, { date, includeDeleted } = {}) {
  const withDeleted = includeDeleted === true || includeDeleted === 'true';

  if (date) {
    const doc = await DailyGoal.findOne({
      userId,
      date: startOfDay(new Date(date)),
    });
    return { dailyGoals: doc ? [serializeDailyGoal(doc, { includeDeleted: withDeleted })] : [] };
  }

  const docs = await DailyGoal.find({ userId }).sort({ date: -1 }).limit(30);
  return {
    dailyGoals: docs.map((doc) => serializeDailyGoal(doc, { includeDeleted: withDeleted })),
  };
}

async function restoreGoalItem(userId, goalItemId) {
  const doc = await DailyGoal.findOne({ userId, 'goals._id': goalItemId });
  if (!doc) {
    throw new AppError('Goal not found', 404);
  }

  const goal = doc.goals.id(goalItemId);
  if (!goal || !goal.isDeleted) {
    throw new AppError('Deleted goal not found', 404);
  }

  goal.isDeleted = false;
  recalculate(doc);
  await doc.save();

  return { dailyGoal: serializeDailyGoal(doc), goal };
}

module.exports = {
  ensureToday,
  createGoal,
  listGoals,
  updateGoalItem,
  softDeleteGoalItem,
  restoreGoalItem,
  serializeDailyGoal,
};
