/**
 * Structured logger utility.
 * Swap transport for Winston/Pino later without touching call sites.
 */
const { env } = require('../config/env');

const levels = { error: 0, warn: 1, info: 2, debug: 3 };

function format(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'backend',
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };
  return JSON.stringify(entry);
}

function shouldLog(level) {
  const current = env.nodeEnv === 'production' ? 'info' : 'debug';
  return levels[level] <= levels[current];
}

const logger = {
  error(message, meta = {}) {
    if (shouldLog('error')) console.error(format('error', message, meta));
  },
  warn(message, meta = {}) {
    if (shouldLog('warn')) console.warn(format('warn', message, meta));
  },
  info(message, meta = {}) {
    if (shouldLog('info')) console.info(format('info', message, meta));
  },
  debug(message, meta = {}) {
    if (shouldLog('debug')) console.debug(format('debug', message, meta));
  },
};

module.exports = logger;
