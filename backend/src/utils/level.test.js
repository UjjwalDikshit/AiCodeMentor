/**
 * Unit tests for level / XP utilities.
 * Run: node --test src/utils/level.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateLevel,
  xpToNextLevel,
  getRank,
  applyXpGain,
} = require('./level');

describe('level utils', () => {
  it('calculates level from XP', () => {
    assert.equal(calculateLevel(0), 1);
    assert.equal(calculateLevel(100), 2);
    assert.equal(calculateLevel(400), 3);
  });

  it('computes xp to next level', () => {
    assert.equal(xpToNextLevel(0), 100);
    assert.equal(xpToNextLevel(50), 50);
  });

  it('maps ranks', () => {
    assert.equal(getRank(1), 'Novice');
    assert.equal(getRank(10), 'Advanced');
    assert.equal(getRank(50), 'Grandmaster');
  });

  it('applies XP gain', () => {
    const result = applyXpGain(90, 20);
    assert.equal(result.currentXP, 110);
    assert.equal(result.currentLevel, 2);
  });
});
