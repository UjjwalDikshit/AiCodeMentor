/**
 * Code Intelligence — Express orchestration.
 * Deterministic analysis + AI via aiClient → /code-intel (never Groq/Ollama directly).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const CodeReview = require('../models/CodeReview.model');
const Conversation = require('../models/Conversation.model');
const { AppError } = require('../utils/AppError');
const aiClient = require('./aiClient.service');
const { chatService } = require('./chat.service');
const logger = require('../utils/logger');

async function assertOwner(id, userId) {
  const doc = await CodeReview.findOne({ _id: id, userId });
  if (!doc) throw new AppError('Code review not found', 404);
  return doc;
}

function serialize(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    userId: o.userId.toString(),
    title: o.title,
    sourceType: o.sourceType,
    language: o.language,
    languageConfidence: o.languageConfidence,
    filename: o.filename,
    code: o.code,
    oldCode: o.oldCode || '',
    status: o.status,
    error: o.error || '',
    deterministic: o.deterministic,
    aiReview: o.aiReview,
    refactor: o.refactor,
    interviewCoach: o.interviewCoach,
    diffResult: o.diffResult,
    qualityScore: o.qualityScore,
    securityScore: o.securityScore,
    cyclomatic: o.cyclomatic,
    fileStats: o.fileStats || [],
    conversationId: o.conversationId ? o.conversationId.toString() : null,
    reviewHistory: o.reviewHistory || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function applyAnalysisResult(doc, data) {
  const det = data.deterministic || (data.files && data.files[0] && data.files[0].deterministic) || null;
  doc.deterministic = det;
  doc.aiReview = data.aiReview || null;
  if (data.files) {
    doc.fileStats = data.files.map((f) => ({
      filename: f.filename,
      language: f.deterministic?.language,
      lineCount: f.deterministic?.ast?.lineCount,
      qualityScore: f.deterministic?.quality?.overallScore,
      complexity: f.deterministic?.complexity?.cyclomaticComplexity,
      securityIssues: f.deterministic?.security?.findingCount,
      staticIssues: f.deterministic?.static?.findingCount,
    }));
    doc.language = doc.fileStats[0]?.language || doc.language;
  }
  if (det) {
    doc.language = det.language || doc.language;
    doc.languageConfidence = det.languageConfidence || 0;
    doc.qualityScore = det.quality?.overallScore ?? null;
    doc.securityScore = det.security?.score ?? null;
    doc.cyclomatic = det.complexity?.cyclomaticComplexity ?? null;
    doc.reviewHistory.push({
      at: new Date(),
      qualityScore: doc.qualityScore,
      securityIssues: det.security?.findingCount || 0,
      summary: `Quality ${doc.qualityScore ?? '—'} · security findings ${det.security?.findingCount || 0}`,
    });
  }
  doc.status = 'ready';
  doc.error = '';
}

async function fetchGithubRaw(url) {
  if (!/^https:\/\/(raw\.githubusercontent\.com|gist\.githubusercontent\.com)\//i.test(url)) {
    throw new AppError('Only raw.githubusercontent.com / gist raw URLs allowed', 400);
  }
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 15000 }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new AppError(`GitHub fetch failed (${res.statusCode})`, 400));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').slice(0, 200000)));
      })
      .on('error', (err) => reject(new AppError(err.message, 400)));
  });
}

async function list(userId, { page = 1, limit = 20, language } = {}) {
  const q = { userId };
  if (language) q.language = language;
  const take = Math.min(50, Number(limit) || 20);
  const skip = (Math.max(1, Number(page)) - 1) * take;
  const [items, total] = await Promise.all([
    CodeReview.find(q).sort({ updatedAt: -1 }).skip(skip).limit(take),
    CodeReview.countDocuments(q),
  ]);
  return { items: items.map(serialize), pagination: { page: Number(page) || 1, limit: take, total } };
}

async function getById(userId, id) {
  return serialize(await assertOwner(id, userId));
}

async function create(userId, body = {}) {
  const doc = await CodeReview.create({
    userId,
    title: body.title || body.filename || 'Code Review',
    sourceType: body.sourceType || 'snippet',
    filename: body.filename || '',
    code: body.code || '',
    oldCode: body.oldCode || '',
    status: 'pending',
  });
  return serialize(doc);
}

async function remove(userId, id) {
  await assertOwner(id, userId);
  await CodeReview.deleteOne({ _id: id, userId });
  return { deleted: id };
}

async function runAnalyze(userId, id, options = {}) {
  const doc = await assertOwner(id, userId);
  doc.status = 'analyzing';
  await doc.save();

  try {
    let code = options.code != null ? options.code : doc.code;
    let files = options.files || [];
    let zipBase64 = options.zipBase64;
    let githubUrl = options.githubRawUrl;

    if (githubUrl) {
      code = await fetchGithubRaw(githubUrl);
      doc.sourceType = 'github_url';
      doc.code = code;
    }
    if (options.code) doc.code = options.code;
    if (options.filename) doc.filename = options.filename;
    if (options.title) doc.title = options.title;
    if (options.diffText) {
      doc.sourceType = 'diff';
      doc.code = options.diffText;
      code = options.diffText;
    }

    const payload = {
      code: code || '',
      filename: doc.filename || undefined,
      language: options.language || undefined,
      files,
      zip_base64: zipBase64 || undefined,
      github_raw_url: githubUrl || undefined,
      include_ai_review: options.includeAiReview !== false,
      provider: options.provider,
      model: options.model,
    };

    const result = await aiClient.codeAnalyze(payload);
    applyAnalysisResult(doc, result.data || {});
    await doc.save();
    return serialize(doc);
  } catch (err) {
    logger.error('Code analyze failed', { err: err.message });
    doc.status = 'failed';
    doc.error = err.message || 'Analysis failed';
    await doc.save();
    throw new AppError(doc.error, 502);
  }
}

/** Background analyze after upload — optimistic UI polls status */
function enqueueAnalyze(userId, id, options = {}) {
  setImmediate(() => {
    runAnalyze(userId, id, options).catch((e) => logger.error('Background code analyze', { error: e.message }));
  });
}

async function uploadAndAnalyze(userId, file, body = {}) {
  if (!file) throw new AppError('File required', 400);
  const ext = path.extname(file.originalname).toLowerCase();
  let code = '';
  let zipBase64;
  let sourceType = 'snippet';

  if (ext === '.zip') {
    zipBase64 = fs.readFileSync(file.path).toString('base64');
    sourceType = 'zip';
  } else {
    code = fs.readFileSync(file.path, 'utf8').slice(0, 400000);
    sourceType = 'files';
  }

  const doc = await CodeReview.create({
    userId,
    title: body.title || file.originalname,
    sourceType,
    filename: file.originalname,
    code,
    status: 'pending',
  });

  enqueueAnalyze(userId, doc._id, {
    code,
    zipBase64,
    filename: file.originalname,
    provider: body.provider,
    model: body.model,
  });

  return serialize(doc);
}

async function complexity(userId, id) {
  const doc = await assertOwner(id, userId);
  const result = await aiClient.codeComplexity({ code: doc.code, filename: doc.filename });
  return result.data;
}

async function security(userId, id) {
  const doc = await assertOwner(id, userId);
  const result = await aiClient.codeSecurity({ code: doc.code, filename: doc.filename });
  return result.data;
}

async function performance(userId, id) {
  const doc = await assertOwner(id, userId);
  const result = await aiClient.codePerformance({ code: doc.code, filename: doc.filename });
  return result.data;
}

async function refactor(userId, id, { provider, model } = {}) {
  const doc = await assertOwner(id, userId);
  const result = await aiClient.codeRefactor({
    code: doc.code,
    filename: doc.filename,
    provider,
    model,
  });
  doc.refactor = result.data?.refactor || result.data;
  await doc.save();
  return serialize(doc);
}

async function interview(userId, id, { provider, model } = {}) {
  const doc = await assertOwner(id, userId);
  const result = await aiClient.codeInterview({
    code: doc.code,
    filename: doc.filename,
    provider,
    model,
  });
  doc.interviewCoach = result.data?.coach || result.data;
  await doc.save();
  return serialize(doc);
}

async function diff(userId, id, { oldCode, newCode, provider, model } = {}) {
  const doc = await assertOwner(id, userId);
  const old_code = oldCode != null ? oldCode : doc.oldCode || '';
  const new_code = newCode != null ? newCode : doc.code || '';
  if (!old_code || !new_code) throw new AppError('oldCode and newCode required', 400);
  const result = await aiClient.codeDiff({
    old_code,
    new_code,
    filename: doc.filename,
    provider,
    model,
  });
  doc.oldCode = old_code;
  doc.code = new_code;
  doc.sourceType = 'diff';
  doc.diffResult = result.data;
  await doc.save();
  return serialize(doc);
}

async function ensureChat(userId, id) {
  const doc = await assertOwner(id, userId);
  if (doc.conversationId) {
    const existing = await Conversation.findOne({ _id: doc.conversationId, userId });
    if (existing) return { conversationId: existing._id.toString(), created: false };
  }
  const conversation = await Conversation.create({
    userId,
    title: `Code: ${doc.title}`.slice(0, 200),
    systemPrompt: 'chat',
    memoryKind: 'window',
    provider: 'dummy',
    model: 'dummy-echo',
  });
  doc.conversationId = conversation._id;
  await doc.save();
  return { conversationId: conversation._id.toString(), created: true };
}

async function chat(userId, id, { message, provider, model } = {}) {
  if (!message?.trim()) throw new AppError('Message required', 400);
  const doc = await assertOwner(id, userId);
  const { conversationId } = await ensureChat(userId, id);

  const context = JSON.stringify({
    language: doc.language,
    quality: doc.deterministic?.quality,
    complexity: doc.deterministic?.complexity,
    staticFindings: (doc.deterministic?.static?.findings || []).slice(0, 15),
    securityFindings: (doc.deterministic?.security?.findings || []).slice(0, 10),
    functions: (doc.deterministic?.ast?.functions || []).slice(0, 10).map((f) => f.name),
  }).slice(0, 6000);

  const override = [
    'You are CodeMentor Code Intelligence chat.',
    'Use the analysis context. Be specific.',
    'Analysis context:',
    context || '(run analysis first)',
  ].join('\n');

  await Conversation.updateOne(
    { _id: conversationId, userId },
    {
      $set: {
        systemPrompt: 'chat',
        systemPromptOverride: override.slice(0, 8000),
        ...(provider ? { provider } : {}),
        ...(model ? { model } : {}),
      },
    }
  );

  return chatService.send(userId, { conversationId, message });
}

async function streamReview(userId, id, res, { provider, model } = {}) {
  const doc = await assertOwner(id, userId);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const abort = new AbortController();
  reqOnClose(res, () => abort.abort());

  try {
    const upstream = await aiClient.codeAnalyzeStream(
      { code: doc.code, filename: doc.filename, provider, model },
      { signal: abort.signal }
    );
    let analysisBuffer = null;
    upstream.data.on('data', (buf) => {
      const text = buf.toString('utf8');
      // capture analysis event for persistence
      const match = text.match(/event: analysis\ndata: (.+)\n/);
      if (match) {
        try {
          analysisBuffer = JSON.parse(match[1]);
        } catch {
          /* ignore */
        }
      }
      res.write(buf);
    });
    upstream.data.on('end', async () => {
      if (analysisBuffer) {
        doc.deterministic = analysisBuffer;
        doc.language = analysisBuffer.language || doc.language;
        doc.qualityScore = analysisBuffer.quality?.overallScore ?? doc.qualityScore;
        doc.securityScore = analysisBuffer.security?.score ?? doc.securityScore;
        doc.cyclomatic = analysisBuffer.complexity?.cyclomaticComplexity ?? doc.cyclomatic;
        doc.status = 'ready';
        await doc.save().catch(() => {});
      }
      res.end();
    });
    upstream.data.on('error', (err) => {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

function reqOnClose(res, fn) {
  res.on('close', fn);
}

async function analytics(userId) {
  const items = await CodeReview.find({ userId, status: 'ready' }).sort({ updatedAt: -1 }).limit(200);
  const byLang = {};
  let qualitySum = 0;
  let qualityN = 0;
  let securityIssues = 0;
  const complexityTrend = [];
  const improvement = [];

  for (const r of items) {
    const lang = r.language || 'unknown';
    byLang[lang] = (byLang[lang] || 0) + 1;
    if (r.qualityScore != null) {
      qualitySum += r.qualityScore;
      qualityN += 1;
    }
    securityIssues += r.deterministic?.security?.findingCount || 0;
    complexityTrend.push({
      id: r._id.toString(),
      title: r.title,
      cyclomatic: r.cyclomatic,
      at: r.updatedAt,
    });
    for (const h of r.reviewHistory || []) {
      improvement.push({
        reviewId: r._id.toString(),
        qualityScore: h.qualityScore,
        securityIssues: h.securityIssues,
        at: h.at,
      });
    }
  }

  return {
    reviewCount: items.length,
    languagesReviewed: byLang,
    averageQuality: qualityN ? Math.round((qualitySum / qualityN) * 10) / 10 : null,
    securityIssues,
    securityHistory: improvement
      .filter((h) => h.securityIssues != null)
      .map((h) => ({ reviewId: h.reviewId, securityIssues: h.securityIssues, at: h.at }))
      .slice(0, 100),
    complexityHistory: complexityTrend.slice(0, 50),
    complexityTrends: complexityTrend.slice(0, 50),
    qualityTrend: improvement
      .filter((h) => h.qualityScore != null)
      .map((h) => ({ reviewId: h.reviewId, qualityScore: h.qualityScore, at: h.at }))
      .slice(0, 100),
    reviewHistory: items.slice(0, 50).map((r) => ({
      id: r._id.toString(),
      title: r.title,
      language: r.language,
      qualityScore: r.qualityScore,
      updatedAt: r.updatedAt,
    })),
    improvementHistory: improvement.slice(0, 100),
  };
}

module.exports = {
  list,
  getById,
  create,
  remove,
  runAnalyze,
  enqueueAnalyze,
  uploadAndAnalyze,
  complexity,
  security,
  performance,
  refactor,
  interview,
  diff,
  ensureChat,
  chat,
  streamReview,
  analytics,
  serialize,
  assertOwner,
};
