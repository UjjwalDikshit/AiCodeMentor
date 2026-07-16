/**
 * MongoDB connection — isolated from controllers (SOLID: SRP / DIP).
 */
const mongoose = require('mongoose');
const { env } = require('./env');
const logger = require('../utils/logger');

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongodbUri);

  logger.info('MongoDB connected', { uri: maskUri(env.mongodbUri) });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

function maskUri(uri) {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '[unparseable-uri]';
  }
}

module.exports = { connectDatabase };
