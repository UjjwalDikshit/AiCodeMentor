/**
 * Authentication integration tests (manual / CI).
 * Run: node scripts/test-auth.js
 * Requires: MongoDB + backend running on :5000
 */
const BASE = process.env.API_URL || 'http://localhost:5000/api/v1';

const testUser = {
  name: 'Auth Test User',
  email: `auth.test.${Date.now()}@codementor.ai`,
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

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (cookieJar) {
    headers.Cookie = cookieJar;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const newCookies = parseCookies(res);
  if (newCookies) cookieJar = newCookies;

  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log('Running auth tests against', BASE);

  // 1. Register
  const reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });
  assert(reg.res.status === 201, `Register failed: ${reg.body.message}`);
  assert(reg.body.data?.accessToken, 'Register should return accessToken');
  accessToken = reg.body.data.accessToken;
  console.log('✓ Registration works');

  // 2. Duplicate email
  const dup = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });
  assert(dup.res.status === 409, 'Duplicate email should return 409');
  console.log('✓ Duplicate email rejected');

  // 3. Login
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testUser.email, password: testUser.password }),
  });
  assert(login.res.status === 200, `Login failed: ${login.body.message}`);
  accessToken = login.body.data.accessToken;
  console.log('✓ Login works');

  // 4. Wrong password
  const badLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testUser.email, password: 'WrongPass1!' }),
  });
  assert(badLogin.res.status === 401, 'Wrong password should return 401');
  console.log('✓ Wrong password rejected');

  // 5. Profile
  const profile = await request('/user/profile');
  assert(profile.res.status === 200, `Profile failed: ${profile.body.message}`);
  assert(profile.body.data?.user?.email === testUser.email, 'Profile email mismatch');
  console.log('✓ Profile endpoint works');

  // 6. Refresh
  const refresh = await request('/auth/refresh', { method: 'POST' });
  assert(refresh.res.status === 200, `Refresh failed: ${refresh.body.message}`);
  accessToken = refresh.body.data.accessToken;
  console.log('✓ Refresh endpoint works');

  // 7. Logout
  const logout = await request('/auth/logout', { method: 'POST' });
  assert(logout.res.status === 200, `Logout failed: ${logout.body.message}`);
  console.log('✓ Logout works');

  // 8. Refresh after logout should fail
  const refreshAfterLogout = await request('/auth/refresh', { method: 'POST' });
  assert(refreshAfterLogout.res.status === 401, 'Refresh after logout should fail');
  console.log('✓ Logout invalidates refresh token');

  console.log('\nAll auth tests passed.');
}

run().catch((err) => {
  console.error('\nAuth tests failed:', err.message);
  process.exit(1);
});
