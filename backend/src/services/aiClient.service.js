/**
 * AI service HTTP client (dependency-injected URL via env).
 * Controllers never call FastAPI directly — they go through this adapter.
 */
const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../utils/logger');

const client = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: env.aiServiceTimeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

async function health() {
  const { data } = await client.get('/health');
  return data;
}

async function postPlaceholder(path, payload = {}) {
  logger.debug('AI client placeholder call', { path });
  const { data } = await client.post(path, payload);
  return data;
}

module.exports = {
  health,
  postPlaceholder,
  client,
};
