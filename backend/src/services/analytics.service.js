/**
 * Analytics series for Recharts — derived from Activity + Progress.
 */
const Activity = require('../models/Activity.model');
const Progress = require('../models/Progress.model');
const { startOfDay } = require('./progress.service');

function eachDay(days) {
  const result = [];
  const today = startOfDay();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push(d);
  }
  return result;
}

/** YYYY-MM-DD in local timezone — matches startOfDay (setHours local). */
function label(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getAnalytics(userId) {
  const since30 = startOfDay();
  since30.setDate(since30.getDate() - 29);

  const since7 = startOfDay();
  since7.setDate(since7.getDate() - 6);

  const [activities30, progress] = await Promise.all([
    Activity.find({ userId, createdAt: { $gte: since30 } }).lean(),
    Progress.findOne({ userId }).lean(),
  ]);

  const problemsByDay = {};
  const xpByDay = {};
  const interviewScores = [];

  eachDay(30).forEach((d) => {
    problemsByDay[label(d)] = 0;
    xpByDay[label(d)] = 0;
  });

  activities30.forEach((a) => {
    const key = label(startOfDay(a.createdAt));
    if (a.type === 'problem_solved' && problemsByDay[key] !== undefined) {
      problemsByDay[key] += 1;
    }
    if (a.points && xpByDay[key] !== undefined) {
      xpByDay[key] += a.points;
    }
    if (a.type === 'interview' && a.metadata?.score != null) {
      interviewScores.push({
        date: key,
        score: a.metadata.score,
      });
    }
  });

  // Cumulative XP growth over 30 days
  let running = Math.max(0, (progress?.currentXP || 0) - Object.values(xpByDay).reduce((s, n) => s + n, 0));
  const xpGrowth = eachDay(30).map((d) => {
    const key = label(d);
    running += xpByDay[key] || 0;
    return { date: key, xp: running };
  });

  const problemsSolved30 = eachDay(30).map((d) => ({
    date: label(d),
    count: problemsByDay[label(d)] || 0,
  }));

  // Weekly coding activity (last 7 days)
  const weeklyCoding = eachDay(7).map((d) => {
    const key = label(d);
    const dayActs = activities30.filter(
      (a) => label(startOfDay(a.createdAt)) === key && ['problem_solved', 'goal_completed', 'progress_updated'].includes(a.type)
    );
    return {
      date: key,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: dayActs.length,
    };
  });

  // Interview score trend — fall back to current score if no history
  const interviewScoreTrend =
    interviewScores.length > 0
      ? interviewScores
      : eachDay(7).map((d) => ({
          date: label(d),
          score: progress?.interviewScore || 0,
        }));

  return {
    problemsSolved30,
    interviewScoreTrend,
    xpGrowth,
    weeklyCoding,
    summary: {
      totalSolved: progress?.totalSolved || 0,
      currentXP: progress?.currentXP || 0,
      currentLevel: progress?.currentLevel || 1,
      codingScore: progress?.codingScore || 0,
      interviewScore: progress?.interviewScore || 0,
    },
  };
}

module.exports = { getAnalytics };
