/**
 * Centralized error handling middleware (Express 4-arg signature).
 */
const logger = require('../utils/logger');
const { AppError } = require('../utils/AppError');

function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Internal server error';

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large';
    err.isOperational = true;
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.message;
    err.isOperational = true;
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Email already registered';
    err.isOperational = true;
  }

  if (!err.isOperational) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    message = 'Internal server error';
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
