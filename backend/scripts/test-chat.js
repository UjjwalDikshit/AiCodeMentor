/**
 * Chat / conversation integration tests.
 * Run: node scripts/test-chat.js
 * Requires: MongoDB + backend (:5000) + ai-service (:8000) with AI_PROVIDER=dummy
 */
const BASE = process.env.API_URL || 'http://localhost:5000/api/v1';

const testUser = {
  name: 'Chat Test User',
  email: `chat.test.${Date.now()}@codementor.ai`,
  password: 'TestPass1!',
  confirmPassword: 'TestPass1!',
};

let accessToken = '';
let cookieJar = '';

function parseCookies(response) {
  const raw = response.headers.getSetCookie?.() || [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (cookieJar) headers.Cookie = cookieJar;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const newCookies = parseCookies(res);
  if (newCookies) cookieJar = newCookies;
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log('Running chat tests against', BASE);

  const reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });
  assert(reg.res.status === 201 || reg.res.status === 200, `Register failed: ${reg.body.message}`);
  accessToken = reg.body.data?.accessToken || accessToken;

  if (!accessToken) {
    const login = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    assert(login.res.status === 200, `Login failed: ${login.body.message}`);
    accessToken = login.body.data.accessToken;
  }

  const created = await request('/conversations', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Interview Preparation',
      provider: 'dummy',
      model: 'dummy-echo',
      systemPrompt: 'chat_general',
      memoryKind: 'window',
    }),
  });
  assert(created.res.status === 201, `Create conversation failed: ${JSON.stringify(created.body)}`);
  const conversationId = created.body.data.id;
  console.log('✓ conversation created', conversationId);

  const listed = await request('/conversations');
  assert(listed.body.data.items.some((c) => c.id === conversationId), 'List missing conversation');
  console.log('✓ conversation listed');

  const patched = await request(`/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: 'Resume Review', isPinned: true }),
  });
  assert(patched.body.data.title === 'Resume Review', 'Rename failed');
  assert(patched.body.data.isPinned === true, 'Pin failed');
  console.log('✓ conversation patched');

  const chat = await request('/chat', {
    method: 'POST',
    body: JSON.stringify({ conversationId, message: 'Explain Segment Tree briefly' }),
  });
  assert(chat.res.status === 200, `Chat failed: ${JSON.stringify(chat.body)}`);
  assert(chat.body.data.assistantMessage?.content, 'Missing assistant content');
  assert(chat.body.data.assistantMessage?.requestId || chat.body.meta, 'Missing telemetry-ish fields');
  console.log('✓ non-stream chat via pipeline');

  const messages = await request(`/conversations/${conversationId}/messages`);
  assert(messages.body.data.items.length >= 2, 'Expected user + assistant messages');
  console.log('✓ messages persisted', messages.body.data.items.length);

  const models = await request('/chat/models');
  assert(models.body.data.providers, 'Models catalog missing providers');
  console.log('✓ models catalog');

  const regenerated = await request('/chat/regenerate', {
    method: 'POST',
    body: JSON.stringify({ conversationId }),
  });
  assert(regenerated.res.status === 200, `Regenerate failed: ${JSON.stringify(regenerated.body)}`);
  console.log('✓ regenerate');

  const removed = await request(`/conversations/${conversationId}`, { method: 'DELETE' });
  assert(removed.body.data.deleted === true, 'Delete failed');
  console.log('✓ conversation deleted');

  console.log('\nAll chat tests passed.');
}

run().catch((err) => {
  console.error('\nChat tests failed:', err.message);
  process.exit(1);
});
