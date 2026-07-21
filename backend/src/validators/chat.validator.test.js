/**
 * Chat validator unit tests (no server required).
 * Run: node --test src/validators/chat.validator.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createConversationSchema,
  chatSendSchema,
  updateConversationSchema,
} = require('./chat.validator');

test('createConversationSchema accepts valid body', () => {
  const parsed = createConversationSchema.body.parse({
    title: 'Interview Preparation',
    provider: 'dummy',
    systemPrompt: 'chat_general',
  });
  assert.equal(parsed.title, 'Interview Preparation');
});

test('chatSendSchema requires conversationId and message', () => {
  assert.throws(() => chatSendSchema.body.parse({ message: 'hi' }));
  const id = '507f1f77bcf86cd799439011';
  const parsed = chatSendSchema.body.parse({ conversationId: id, message: 'hello' });
  assert.equal(parsed.conversationId, id);
});

test('updateConversationSchema rejects empty body', () => {
  assert.throws(() =>
    updateConversationSchema.body.parse({})
  );
});
