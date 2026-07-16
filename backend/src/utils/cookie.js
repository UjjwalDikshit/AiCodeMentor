/**
 * HTTP-only refresh token cookie helpers.
 */
const { env } = require('../config/env');

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: env.cookie.maxAgeMs,
    path: '/api/v1/auth',
  };
}

function setRefreshCookie(res, token) {
  res.cookie(env.cookie.refreshName, token, getRefreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(env.cookie.refreshName, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/api/v1/auth',
  });
}

module.exports = { setRefreshCookie, clearRefreshCookie, getRefreshCookieOptions };
