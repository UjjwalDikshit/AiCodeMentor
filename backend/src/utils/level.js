/**
 * Reusable XP / level / rank calculations (gamification).
 * Level formula: level = floor(sqrt(xp / 100)) + 1
 * XP needed for next level: (level)^2 * 100
 */

function calculateLevel(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  return Math.floor(Math.sqrt(safeXp / 100)) + 1;
}

function xpForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return (safeLevel - 1) ** 2 * 100;
}

function xpToNextLevel(xp) {
  const level = calculateLevel(xp);
  const nextThreshold = level ** 2 * 100;
  return Math.max(0, nextThreshold - Math.max(0, Number(xp) || 0));
}

function getRank(level) {
  const lv = Number(level) || 1;
  if (lv >= 50) return 'Grandmaster';
  if (lv >= 30) return 'Master';
  if (lv >= 20) return 'Expert';
  if (lv >= 10) return 'Advanced';
  if (lv >= 5) return 'Intermediate';
  return 'Novice';
}

function applyXpGain(currentXp, points) {
  const xp = Math.max(0, (Number(currentXp) || 0) + (Number(points) || 0));
  return {
    currentXP: xp,
    currentLevel: calculateLevel(xp),
    rank: getRank(calculateLevel(xp)),
    xpToNext: xpToNextLevel(xp),
  };
}

module.exports = {
  calculateLevel,
  xpForLevel,
  xpToNextLevel,
  getRank,
  applyXpGain,
};
