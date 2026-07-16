/**
 * Centralized error handling middleware (Express 4-arg signature).
 */
const logger = require('../utils/logger');
const { AppError } = require('../utils/AppError');

function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  } else {
    logger.warn('Operational error', { statusCode, message });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { errors: err.details } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
