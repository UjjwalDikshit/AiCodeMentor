const ChatUsageDaily = require('../models/ChatUsageDaily.model');

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function recordUsage(userId, { tokens = {}, latency = 0, provider, model }) {
  const date = todayKey();
  const prompt = tokens.prompt || 0;
  const completion = tokens.completion || 0;
  const total = tokens.total || prompt + completion;
  const cost = tokens.estimatedCost || 0;

  const update = {
    $inc: {
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: total,
      estimatedCost: cost,
      requests: 1,
      latencySumMs: latency || 0,
    },
  };
  if (provider) update.$inc[`providers.${provider}`] = 1;
  if (model) update.$inc[`models.${model}`] = 1;

  await ChatUsageDaily.findOneAndUpdate({ userId, date }, update, { upsert: true, new: true });
}

async function applyConversationStats(conversation, { tokens = {}, latency = 0, provider, model }) {
  if (!conversation.usageStats) conversation.usageStats = {};
  const s = conversation.usageStats;
  s.promptTokens = (s.promptTokens || 0) + (tokens.prompt || 0);
  s.completionTokens = (s.completionTokens || 0) + (tokens.completion || 0);
  s.totalTokens = (s.totalTokens || 0) + (tokens.total || 0);
  s.estimatedCost = (s.estimatedCost || 0) + (tokens.estimatedCost || 0);
  s.totalRequests = (s.totalRequests || 0) + 1;
  s.totalLatencyMs = (s.totalLatencyMs || 0) + (latency || 0);

  if (!s.providerUsage) s.providerUsage = new Map();
  if (!s.modelUsage) s.modelUsage = new Map();
  if (provider) {
    const cur = s.providerUsage.get?.(provider) ?? s.providerUsage[provider] ?? 0;
    if (typeof s.providerUsage.set === 'function') s.providerUsage.set(provider, cur + 1);
    else s.providerUsage[provider] = cur + 1;
  }
  if (model) {
    const cur = s.modelUsage.get?.(model) ?? s.modelUsage[model] ?? 0;
    if (typeof s.modelUsage.set === 'function') s.modelUsage.set(model, cur + 1);
    else s.modelUsage[model] = cur + 1;
  }
  conversation.lastActiveAt = new Date();
  conversation.markModified('usageStats');
}

async function getOverview(userId, { days = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  const sinceKey = todayKey(since);
  const rows = await ChatUsageDaily.find({ userId, date: { $gte: sinceKey } })
    .sort({ date: 1 })
    .lean();

  const daily = rows.map((r) => ({
    date: r.date,
    promptTokens: r.promptTokens,
    completionTokens: r.completionTokens,
    totalTokens: r.totalTokens,
    estimatedCost: r.estimatedCost,
    requests: r.requests,
    averageLatencyMs: r.requests ? Math.round(r.latencySumMs / r.requests) : 0,
  }));

  const totals = daily.reduce(
    (acc, d) => {
      acc.promptTokens += d.promptTokens;
      acc.completionTokens += d.completionTokens;
      acc.totalTokens += d.totalTokens;
      acc.estimatedCost += d.estimatedCost;
      acc.requests += d.requests;
      return acc;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0, requests: 0 }
  );

  const providers = {};
  const models = {};
  for (const r of rows) {
    const p = r.providers instanceof Map ? Object.fromEntries(r.providers) : r.providers || {};
    const m = r.models instanceof Map ? Object.fromEntries(r.models) : r.models || {};
    for (const [k, v] of Object.entries(p)) providers[k] = (providers[k] || 0) + v;
    for (const [k, v] of Object.entries(m)) models[k] = (models[k] || 0) + v;
  }

  return { daily, weekly: rollup(daily, 7), monthly: rollup(daily, 30), totals, providers, models };
}

function rollup(daily, window) {
  const slice = daily.slice(-window);
  return slice.reduce(
    (acc, d) => {
      acc.totalTokens += d.totalTokens;
      acc.estimatedCost += d.estimatedCost;
      acc.requests += d.requests;
      return acc;
    },
    { totalTokens: 0, estimatedCost: 0, requests: 0, days: slice.length }
  );
}

module.exports = { recordUsage, applyConversationStats, getOverview };
