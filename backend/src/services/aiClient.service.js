/**
 * AI service HTTP client — Express never invents LLM logic.
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

async function chat(payload) {
  const { data } = await client.post('/chat', payload);
  return data;
}

/**
 * Returns axios response with stream body for SSE proxy.
 */
function chatStream(payload, { signal } = {}) {
  return client.post('/chat/stream', payload, {
    responseType: 'stream',
    timeout: 0,
    signal,
    headers: { Accept: 'text/event-stream' },
  });
}

async function listProviders() {
  const { data } = await client.get('/providers');
  return data;
}

async function listModels() {
  const { data } = await client.get('/models');
  return data;
}

module.exports = {
  health,
  postPlaceholder,
  chat,
  chatStream,
  listProviders,
  listModels,
  resumeParseIndex,
  resumeSearch,
  resumeAts,
  resumeBullets,
  resumeSkills,
  resumeJdIndex,
  resumeJdMatch,
  resumeReport,
  resumeCompare,
  resumeDeleteChunks,
  codeAnalyze,
  codeAnalyzeStream,
  codeComplexity,
  codeSecurity,
  codePerformance,
  codeRefactor,
  codeInterview,
  codeDiff,
  codeDetectLanguage,
  client,
};

async function resumeParseIndex(payload) {
  const { data } = await client.post('/resume-intel/parse-index', payload, { timeout: 120000 });
  return data;
}

async function resumeSearch(payload) {
  const { data } = await client.post('/resume-intel/search', payload);
  return data;
}

async function resumeAts(payload) {
  const { data } = await client.post('/resume-intel/ats', payload, { timeout: 120000 });
  return data;
}

async function resumeBullets(payload) {
  const { data } = await client.post('/resume-intel/bullets', payload, { timeout: 120000 });
  return data;
}

async function resumeSkills(payload) {
  const { data } = await client.post('/resume-intel/skills', payload, { timeout: 120000 });
  return data;
}

async function resumeJdIndex(payload) {
  const { data } = await client.post('/resume-intel/jd/index', payload, { timeout: 120000 });
  return data;
}

async function resumeJdMatch(payload) {
  const { data } = await client.post('/resume-intel/jd/match', payload, { timeout: 120000 });
  return data;
}

async function resumeReport(payload) {
  const { data } = await client.post('/resume-intel/report', payload, { timeout: 120000 });
  return data;
}

async function resumeCompare(payload) {
  const { data } = await client.post('/resume-intel/compare', payload, { timeout: 120000 });
  return data;
}

async function resumeDeleteChunks(payload) {
  const { data } = await client.post('/resume-intel/chunks/delete', payload);
  return data;
}

async function codeAnalyze(payload) {
  const { data } = await client.post('/code-intel/analyze', payload, { timeout: 180000 });
  return data;
}

function codeAnalyzeStream(payload, { signal } = {}) {
  return client.post('/code-intel/analyze/stream', payload, {
    responseType: 'stream',
    timeout: 0,
    signal,
    headers: { Accept: 'text/event-stream' },
  });
}

async function codeComplexity(payload) {
  const { data } = await client.post('/code-intel/complexity', payload);
  return data;
}

async function codeSecurity(payload) {
  const { data } = await client.post('/code-intel/security', payload);
  return data;
}

async function codePerformance(payload) {
  const { data } = await client.post('/code-intel/performance', payload);
  return data;
}

async function codeRefactor(payload) {
  const { data } = await client.post('/code-intel/refactor', payload, { timeout: 180000 });
  return data;
}

async function codeInterview(payload) {
  const { data } = await client.post('/code-intel/interview', payload, { timeout: 180000 });
  return data;
}

async function codeDiff(payload) {
  const { data } = await client.post('/code-intel/diff', payload, { timeout: 180000 });
  return data;
}

async function codeDetectLanguage(payload) {
  const { data } = await client.post('/code-intel/detect-language', payload);
  return data;
}
