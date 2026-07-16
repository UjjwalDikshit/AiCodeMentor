/**
 * JWT authentication and role-based authorization middleware.
 */
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { verifyAccessToken } = require('../services/token.service');
const User = require('../models/User.model');

async function authenticateUser(req, _res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.split(' ')[1];
  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);

    if (!user) {
      return next(new AppError('User not found', 401));
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    return next();
  };
}

/** @deprecated Use authenticateUser */
const authenticate = authenticateUser;
/** @deprecated Use authenticateUser */
const requireAuth = authenticateUser;

module.exports = {
  authenticateUser,
  authorizeRoles,
  authenticate,
  requireAuth,
};
