/**
 * Authentication business logic — register, login, logout, refresh rotation.
 */
const User = require('../models/User.model');
const { AppError } = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/password');
const { hashToken } = require('../utils/tokenHash');
const { toPublicUser } = require('../utils/userSerializer');
const { generateTokenPair, verifyRefreshToken } = require('./token.service');
const { sanitizeObject } = require('../utils/sanitize');

async function persistRefreshToken(userId, refreshToken) {
  const hashed = hashToken(refreshToken);
  await User.findByIdAndUpdate(userId, { refreshToken: hashed });
}

async function register({ name, email, password }) {
  const clean = sanitizeObject({ name, email, password }, ['name', 'email']);

  const existing = await User.findOne({ email: clean.email });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const hashed = await hashPassword(clean.password);

  const user = await User.create({
    name: clean.name,
    email: clean.email,
    password: hashed,
    provider: 'local',
  });

  const tokens = generateTokenPair(user);
  await persistRefreshToken(user._id, tokens.refreshToken);

  return {
    user: toPublicUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

async function login({ email, password }) {
  const clean = sanitizeObject({ email, password }, ['email']);

  const user = await User.findOne({ email: clean.email }).select('+password +refreshToken');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await comparePassword(clean.password, user.password);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokens = generateTokenPair(user);
  await persistRefreshToken(user._id, tokens.refreshToken);

  return {
    user: toPublicUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

async function logout(userId) {
  if (userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }
}

async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token required', 401);
  }

  const decoded = verifyRefreshToken(rawRefreshToken);

  const user = await User.findById(decoded.sub).select('+refreshToken');
  if (!user || !user.refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  const incomingHash = hashToken(rawRefreshToken);
  if (incomingHash !== user.refreshToken) {
    await User.findByIdAndUpdate(user._id, { refreshToken: null });
    throw new AppError('Refresh token reuse detected — please sign in again', 401);
  }

  const tokens = generateTokenPair(user);
  await persistRefreshToken(user._id, tokens.refreshToken);

  return {
    user: toPublicUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

module.exports = {
  register,
  login,
  logout,
  refresh,
};
