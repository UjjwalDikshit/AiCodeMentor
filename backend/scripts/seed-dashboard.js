/**
 * Development seed — populates a demo user with dashboard data.
 * Usage: node scripts/seed-dashboard.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const User = require('../src/models/User.model');
const Progress = require('../src/models/Progress.model');
const DailyGoal = require('../src/models/DailyGoal.model');
const Activity = require('../src/models/Activity.model');
const Achievement = require('../src/models/Achievement.model');
const Notification = require('../src/models/Notification.model');
const { hashPassword } = require('../src/utils/password');
const { calculateLevel } = require('../src/utils/level');
const { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_KEYS } = require('../src/models/Achievement.model');

const DEMO_EMAIL = 'demo@codementor.ai';
const DEMO_PASSWORD = 'DemoPass1!';

function startOfDay(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

async function seed() {
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (user) {
    await Promise.all([
      Progress.deleteMany({ userId: user._id }),
      DailyGoal.deleteMany({ userId: user._id }),
      Activity.deleteMany({ userId: user._id }),
      Achievement.deleteMany({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
    ]);
    console.log('Cleared existing demo dashboard data');
  } else {
    user = await User.create({
      name: 'Demo Coach',
      email: DEMO_EMAIL,
      password: await hashPassword(DEMO_PASSWORD),
      provider: 'local',
      isVerified: true,
      role: 'user',
    });
    console.log('Created demo user');
  }

  const xp = 1250;
  const progress = await Progress.create({
    userId: user._id,
    totalSolved: 47,
    easySolved: 20,
    mediumSolved: 18,
    hardSolved: 9,
    codingScore: 78,
    interviewScore: 72,
    resumeScore: 85,
    githubScore: 68,
    currentXP: xp,
    currentLevel: calculateLevel(xp),
    currentStreak: 12,
    longestStreak: 21,
    lastActiveDate: startOfDay(),
    weakTopics: ['Dynamic Programming', 'System Design', 'Graph Algorithms'],
    strongTopics: ['Arrays', 'Hash Maps', 'Two Pointers', 'SQL'],
  });

  const goalTemplates = [
    ['Solve 3 medium problems', 'high'],
    ['Review system design notes', 'medium'],
    ['Update resume bullet points', 'medium'],
    ['Complete one mock interview', 'high'],
    ['Read a GitHub PR carefully', 'low'],
  ];

  for (let i = 0; i < 5; i += 1) {
    const goals = goalTemplates.map(([title, priority], idx) => ({
      title: `${title} (day ${i})`,
      priority,
      completed: idx < (i % 3) + 1,
      isDeleted: false,
      createdAt: new Date(),
    }));
    const active = goals.filter((g) => !g.isDeleted);
    const completed = active.filter((g) => g.completed).length;
    await DailyGoal.create({
      userId: user._id,
      date: startOfDay(-i),
      goals,
      completedGoals: completed,
      completionPercentage: Math.round((completed / active.length) * 100),
      status: completed === active.length ? 'completed' : completed > 0 ? 'in_progress' : 'pending',
    });
  }

  const activityTypes = [
    ['problem_solved', 'Solved Two Sum', 15],
    ['problem_solved', 'Solved Binary Search', 20],
    ['goal_completed', 'Completed daily goals', 20],
    ['interview', 'Mock interview completed', 40],
    ['resume_reviewed', 'Resume review session', 25],
    ['xp_gained', 'Bonus XP awarded', 10],
    ['achievement_unlocked', 'Unlocked an achievement', 50],
    ['progress_updated', 'Updated coding score', 0],
    ['login', 'Daily check-in', 0],
    ['streak_updated', 'Streak extended', 5],
  ];

  const activities = [];
  for (let i = 0; i < 20; i += 1) {
    const [type, title, points] = activityTypes[i % activityTypes.length];
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(i / 2));
    createdAt.setHours(10 + (i % 8));
    activities.push({
      userId: user._id,
      type,
      title: `${title} #${i + 1}`,
      description: `Seeded activity ${i + 1}`,
      points,
      metadata: type === 'interview' ? { score: 60 + (i % 30) } : {},
      createdAt,
    });
  }
  await Activity.insertMany(activities);

  const unlockKeys = [
    ACHIEVEMENT_KEYS.FIRST_LOGIN,
    ACHIEVEMENT_KEYS.PROBLEMS_10,
    ACHIEVEMENT_KEYS.STREAK_7,
    ACHIEVEMENT_KEYS.RESUME_REVIEWED,
    ACHIEVEMENT_KEYS.FIRST_MOCK_INTERVIEW,
  ];

  for (const key of unlockKeys) {
    const def = ACHIEVEMENT_DEFINITIONS[key];
    await Achievement.create({
      userId: user._id,
      key,
      title: def.title,
      description: def.description,
      badge: def.badge,
      xpReward: def.xpReward,
      unlockedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
    });
  }

  const notifications = [
    ['Welcome to CodeMentor AI', 'Your coaching dashboard is ready.', 'success'],
    ['Achievement unlocked', 'You unlocked First Login!', 'achievement'],
    ['Streak reminder', 'Keep your 12-day streak alive today.', 'info'],
    ['Weekly summary', 'You solved 8 problems this week.', 'info'],
    ['Goal tip', 'Break large goals into smaller daily tasks.', 'warning'],
  ];

  await Notification.insertMany(
    notifications.map(([title, message, type], i) => ({
      userId: user._id,
      title,
      message,
      type,
      isRead: i > 2,
      createdAt: new Date(Date.now() - i * 3600000),
    }))
  );

  console.log('\nSeed complete');
  console.log('Demo login:', DEMO_EMAIL, '/', DEMO_PASSWORD);
  console.log('Progress XP:', progress.currentXP, 'Level:', progress.currentLevel);
  console.log('Goals: 5 days | Activities: 20 | Achievements: 5 | Notifications: 5');

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
