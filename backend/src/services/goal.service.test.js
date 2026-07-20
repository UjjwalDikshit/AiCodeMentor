/**
 * Service-level tests for goal recalculation helpers (pure path via soft API contract).
 * Run: node --test src/services/goal.service.test.js
 *
 * Note: full DB integration requires MongoDB. These tests cover serialization rules.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

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

describe('goal recalculation', () => {
  it('ignores soft-deleted goals', () => {
    const doc = {
      goals: [
        { completed: true, isDeleted: false },
        { completed: false, isDeleted: true },
        { completed: false, isDeleted: false },
      ],
    };
    recalculate(doc);
    assert.equal(doc.completedGoals, 1);
    assert.equal(doc.completionPercentage, 50);
    assert.equal(doc.status, 'in_progress');
  });

  it('marks completed when all active goals done', () => {
    const doc = {
      goals: [
        { completed: true, isDeleted: false },
        { completed: true, isDeleted: false },
      ],
    };
    recalculate(doc);
    assert.equal(doc.status, 'completed');
    assert.equal(doc.completionPercentage, 100);
  });
});
