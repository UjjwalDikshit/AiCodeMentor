/**
 * Activity service — list with pagination, filtering, sorting, date range.
 */
const Activity = require('../models/Activity.model');
const { AppError } = require('../utils/AppError');

async function createActivity({ userId, type, title, description = '', points = 0, metadata = {} }) {
  return Activity.create({
    userId,
    type,
    title,
    description,
    points,
    metadata,
  });
}

async function listActivities(userId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = { userId };

  if (query.type) {
    filter.type = query.type;
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const sortField = query.sort?.replace(/^-/, '') || 'createdAt';
  const sortDir = query.sort?.startsWith('-') ? -1 : query.sort ? 1 : -1;
  const allowedSort = ['createdAt', 'points', 'type'];
  if (!allowedSort.includes(sortField)) {
    throw new AppError('Invalid sort field', 400);
  }

  const [items, total] = await Promise.all([
    Activity.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit)
      .lean(),
    Activity.countDocuments(filter),
  ]);

  return {
    activities: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    },
  };
}

module.exports = { createActivity, listActivities };
