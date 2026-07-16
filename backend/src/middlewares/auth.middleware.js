/**
 * JWT auth middleware placeholder.
 * Validates Authorization: Bearer <token> when auth is implemented.
 * Currently a no-op pass-through so routes can be wired early.
 */
const { env } = require('../config/env');
const logger = require('../utils/logger');

function authenticate(req, _res, next) {
  const header = req.headers.authorization;

  if (!header) {
    // Placeholder: do not block until auth is implemented
    req.user = null;
    return next();
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    req.user = null;
    return next();
  }

  // Placeholder — replace with jwt.verify(token, env.jwt.secret)
  logger.debug('JWT placeholder received token', {
    tokenPreview: `${token.slice(0, 8)}...`,
    secretConfigured: Boolean(env.jwt.secret),
  });

  req.user = { id: 'placeholder-user-id', role: 'user' };
  return next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required (placeholder)',
    });
  }
  return next();
}

module.exports = { authenticate, requireAuth };
