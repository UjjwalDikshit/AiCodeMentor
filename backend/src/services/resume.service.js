/**
 * Resume Intelligence — Express orchestration.
 * Never calls Groq/Ollama directly; all AI via aiClient → /resume-intel + /chat.
 */
const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume.model');
const JobDescription = require('../models/JobDescription.model');
const Conversation = require('../models/Conversation.model');
const Progress = require('../models/Progress.model');
const { AppError } = require('../utils/AppError');
const { env } = require('../config/env');
const aiClient = require('./aiClient.service');
const { chatService } = require('./chat.service');
const logger = require('../utils/logger');

function virusScanPlaceholder(_file) {
  return { scanned: true, clean: true, engine: 'placeholder' };
}

function loaderForExt(ext) {
  const e = (ext || '').toLowerCase().replace('.', '');
  if (e === 'pdf') return 'pdf';
  if (e === 'docx') return 'docx';
  if (e === 'md' || e === 'markdown') return 'md';
  return 'txt';
}

function aiVisiblePath(absPath) {
  const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
  const aiRoot = process.env.AI_UPLOAD_ROOT;
  if (aiRoot) {
    const rel = path.relative(uploadRoot, absPath).split(path.sep).join('/');
    return `${aiRoot.replace(/\/$/, '')}/${rel}`;
  }
  return absPath;
}

function readTextIfPossible(absPath, ext) {
  const e = (ext || '').toLowerCase();
  if (['.txt', '.md', '.markdown'].includes(e)) {
    return fs.readFileSync(absPath, 'utf8');
  }
  return null;
}

async function assertOwner(resumeId, userId) {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw new AppError('Resume not found', 404);
  return resume;
}

function versionDoc(resume, versionNum) {
  const v = resume.versions.find((x) => x.version === Number(versionNum));
  if (!v) throw new AppError('Resume version not found', 404);
  return v;
}

function currentVersionDoc(resume) {
  return versionDoc(resume, resume.currentVersion);
}

function serializeVersion(v) {
  const o = v.toObject ? v.toObject() : v;
  return {
    id: o._id?.toString?.() || undefined,
    version: o.version,
    label: o.label,
    file: o.file,
    structured: o.structured || {},
    chunkIds: o.chunkIds || [],
    chunkCount: o.chunkCount || 0,
    collectionName: o.collectionName || '',
    embeddingModel: o.embeddingModel || '',
    indexStatus: o.indexStatus,
    indexError: o.indexError || '',
    ats: o.ats,
    bullets: o.bullets,
    skills: o.skills,
    report: o.report,
    createdAt: o.createdAt,
    hasRawText: Boolean(o.rawText),
  };
}

function serializeResume(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    userId: o.userId.toString(),
    title: o.title,
    targetRole: o.targetRole,
    currentVersion: o.currentVersion,
    versions: (o.versions || []).map(serializeVersion),
    conversationId: o.conversationId ? o.conversationId.toString() : null,
    status: o.status,
    atsHistory: o.atsHistory || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function indexVersionAsync(userId, resumeId, versionNum) {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) return;
  const ver = resume.versions.find((x) => x.version === versionNum);
  if (!ver) return;

  ver.indexStatus = 'indexing';
  ver.indexError = '';
  await resume.save();

  try {
    const abs = ver.file?.path;
    const text = ver.rawText || (abs ? readTextIfPossible(abs, ver.file?.ext) : null);
    const payload = {
      user_id: String(userId),
      resume_id: String(resumeId),
      version: versionNum,
      loader: loaderForExt(ver.file?.ext),
      reindex: true,
      previous_chunk_ids: ver.chunkIds || [],
    };
    if (text) payload.text = text;
    else if (abs) payload.path = aiVisiblePath(abs);

    const result = await aiClient.resumeParseIndex(payload);
    const data = result?.data || {};
    ver.structured = data.structured || {};
    ver.chunkIds = data.chunkIds || [];
    ver.chunkCount = data.chunkCount || 0;
    ver.collectionName = data.collection || '';
    ver.embeddingModel = data.embeddingModel || '';
    ver.indexStatus = 'ready';
    ver.indexError = '';
    if (text) ver.rawText = text.slice(0, 200000);
    await resume.save();
  } catch (err) {
    logger.error('Resume indexing failed', { resumeId, versionNum, err: err.message });
    ver.indexStatus = 'failed';
    ver.indexError = err.message || 'Indexing failed';
    await resume.save();
  }
}

async function list(userId, { page = 1, limit = 20, status } = {}) {
  const q = { userId };
  if (status) q.status = status;
  const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Number(limit) || 20);
  const take = Math.min(50, Number(limit) || 20);
  const [items, total] = await Promise.all([
    Resume.find(q).sort({ updatedAt: -1 }).skip(skip).limit(take),
    Resume.countDocuments(q),
  ]);
  return {
    items: items.map(serializeResume),
    pagination: { page: Number(page) || 1, limit: take, total },
  };
}

async function getById(userId, resumeId) {
  const resume = await assertOwner(resumeId, userId);
  return serializeResume(resume);
}

async function upload(userId, file, { title, targetRole, label } = {}) {
  if (!file) throw new AppError('Resume file is required', 400);
  const scan = virusScanPlaceholder(file);
  if (!scan.clean) throw new AppError('File failed virus scan', 400);

  const absPath = file.path;
  const ext = path.extname(file.originalname).toLowerCase();
  const rawText = readTextIfPossible(absPath, ext) || '';

  const resume = await Resume.create({
    userId,
    title: title || file.originalname.replace(/\.[^.]+$/, '') || 'Untitled Resume',
    targetRole: targetRole || 'Software Engineer',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        label: label || 'v1',
        file: {
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          ext,
          path: absPath,
          virusScan: scan,
        },
        rawText,
        indexStatus: 'pending',
      },
    ],
  });

  // Async indexing — optimistic UI can poll indexStatus
  setImmediate(() => {
    indexVersionAsync(userId, resume._id, 1).catch((e) =>
      logger.error('Background index error', { error: e.message })
    );
  });

  return serializeResume(resume);
}

async function addVersion(userId, resumeId, file, { label } = {}) {
  const resume = await assertOwner(resumeId, userId);
  if (!file) throw new AppError('Resume file is required', 400);
  const scan = virusScanPlaceholder(file);
  const next = (resume.currentVersion || 1) + 1;
  const ext = path.extname(file.originalname).toLowerCase();
  const rawText = readTextIfPossible(file.path, ext) || '';

  resume.versions.push({
    version: next,
    label: label || `v${next}`,
    file: {
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      ext,
      path: file.path,
      virusScan: scan,
    },
    rawText,
    indexStatus: 'pending',
  });
  resume.currentVersion = next;
  await resume.save();

  setImmediate(() => {
    indexVersionAsync(userId, resume._id, next).catch((e) =>
      logger.error('Background index error', { error: e.message })
    );
  });

  return serializeResume(resume);
}

async function reindex(userId, resumeId, version) {
  const resume = await assertOwner(resumeId, userId);
  const verNum = version ? Number(version) : resume.currentVersion;
  versionDoc(resume, verNum);
  setImmediate(() => {
    indexVersionAsync(userId, resumeId, verNum).catch(() => {});
  });
  return { resumeId, version: verNum, status: 'indexing' };
}

async function remove(userId, resumeId) {
  const resume = await assertOwner(resumeId, userId);
  const chunkIds = resume.versions.flatMap((v) => v.chunkIds || []);
  if (chunkIds.length) {
    try {
      await aiClient.resumeDeleteChunks({ user_id: String(userId), chunk_ids: chunkIds });
    } catch (err) {
      logger.warn('Chunk delete failed', { err: err.message });
    }
  }
  await Resume.deleteOne({ _id: resumeId, userId });
  return { deleted: resumeId };
}

async function updateMeta(userId, resumeId, body) {
  const resume = await assertOwner(resumeId, userId);
  if (body.title != null) resume.title = body.title;
  if (body.targetRole != null) resume.targetRole = body.targetRole;
  if (body.status != null) resume.status = body.status;
  await resume.save();
  return serializeResume(resume);
}

async function search(userId, resumeId, { query, k, section, similarityThreshold, version } = {}) {
  const resume = await assertOwner(resumeId, userId);
  const ver = version ? versionDoc(resume, version) : currentVersionDoc(resume);
  const result = await aiClient.resumeSearch({
    user_id: String(userId),
    resume_id: String(resumeId),
    query,
    k: k || 5,
    section: section || null,
    version: ver.version,
    similarity_threshold: similarityThreshold ?? 0.15,
  });
  return { hits: result?.data?.hits || [], version: ver.version, collection: ver.collectionName };
}

async function runAts(userId, resumeId, { provider, model, version } = {}) {
  const resume = await assertOwner(resumeId, userId);
  const ver = version ? versionDoc(resume, version) : currentVersionDoc(resume);
  if (ver.indexStatus !== 'ready') throw new AppError('Resume not indexed yet', 409);
  const result = await aiClient.resumeAts({
    user_id: String(userId),
    resume_id: String(resumeId),
    version: ver.version,
    provider: provider || undefined,
    model: model || undefined,
  });
  const parsed = result?.data?.parsed || result?.data || {};
  ver.ats = parsed;
  resume.atsHistory.push({
    version: ver.version,
    overallScore: parsed.overallScore ?? parsed?.parsed?.overallScore,
    sectionScores: parsed.sectionScores || parsed?.parsed?.sectionScores,
  });
  await resume.save();

  try {
    const score = Number(parsed.overallScore ?? parsed?.parsed?.overallScore);
    if (!Number.isNaN(score)) {
      await Progress.findOneAndUpdate({ userId }, { resumeScore: Math.max(0, Math.min(100, score)) });
    }
  } catch {
    /* non-blocking */
  }

  return { ats: parsed, meta: result?.data?.meta, usage: result?.data?.usage };
}

async function improveBullets(userId, resumeId, { bullets, provider, model, version } = {}) {
  const resume = await assertOwner(resumeId, userId);
  const ver = version ? versionDoc(resume, version) : currentVersionDoc(resume);
  // Bullets omitted → AI service retrieves experience/project chunks via RAG
  const result = await aiClient.resumeBullets({
    user_id: String(userId),
    resume_id: String(resumeId),
    bullets: bullets || [],
    version: ver.version,
    provider,
    model,
  });
  const parsed = result?.data?.parsed || result?.data;
  ver.bullets = parsed;
  await resume.save();
  return { bullets: parsed };
}

async function skillGap(userId, resumeId, { targetRole, provider, model, version } = {}) {
  const resume = await assertOwner(resumeId, userId);
  const ver = version ? versionDoc(resume, version) : currentVersionDoc(resume);
  const result = await aiClient.resumeSkills({
    user_id: String(userId),
    resume_id: String(resumeId),
    version: ver.version,
    target_role: targetRole || resume.targetRole || 'Software Engineer',
    provider,
    model,
  });
  const parsed = result?.data?.parsed || result?.data;
  ver.skills = parsed;
  await resume.save();
  return { skills: parsed };
}

async function report(userId, resumeId, { provider, model, version, format = 'json' } = {}) {
  const resume = await assertOwner(resumeId, userId);
  const ver = version ? versionDoc(resume, version) : currentVersionDoc(resume);
  const result = await aiClient.resumeReport({
    user_id: String(userId),
    resume_id: String(resumeId),
    version: ver.version,
    ats: ver.ats || {},
    provider,
    model,
  });
  const parsed = result?.data?.parsed || result?.data;
  ver.report = parsed;
  await resume.save();

  if (format === 'markdown') {
    const md = [
      `# Resume Report — ${resume.title}`,
      '',
      '## Executive Summary',
      parsed.executiveSummary || '',
      '',
      '## Technical Summary',
      parsed.technicalSummary || '',
      '',
      '## Recruiter Summary',
      parsed.recruiterSummary || '',
      '',
      '## Strengths',
      ...(parsed.strengths || []).map((s) => `- ${s}`),
      '',
      '## Weaknesses',
      ...(parsed.weaknesses || []).map((s) => `- ${s}`),
      '',
      '## Recommendations',
      ...(parsed.recommendations || []).map((s) => `- ${s}`),
    ].join('\n');
    return { format: 'markdown', content: md, report: parsed };
  }

  if (format === 'pdf') {
    return {
      format: 'pdf',
      note: 'Native PDF export is a remaining TODO — use markdown/json meanwhile',
      report: parsed,
    };
  }

  return { format: 'json', report: parsed };
}

async function compareVersions(userId, resumeId, { v1, v2, provider, model } = {}) {
  const resume = await assertOwner(resumeId, userId);
  const a = versionDoc(resume, v1 || Math.max(1, resume.currentVersion - 1));
  const b = versionDoc(resume, v2 || resume.currentVersion);
  const result = await aiClient.resumeCompare({
    user_id: String(userId),
    resume_id: String(resumeId),
    version_a: a.version,
    version_b: b.version,
    provider,
    model,
  });
  return {
    comparison: result?.data?.parsed || result?.data,
    v1: a.version,
    v2: b.version,
    retrievedChunkCount: result?.data?.retrievedChunkCount,
  };
}

/** Rollback = point currentVersion at an existing older version (versions retained). */
async function rollback(userId, resumeId, version) {
  const resume = await assertOwner(resumeId, userId);
  const target = Number(version);
  versionDoc(resume, target);
  resume.currentVersion = target;
  await resume.save();
  return serializeResume(resume);
}

async function createJd(userId, { title, company, text, resumeId } = {}) {
  if (!text?.trim()) throw new AppError('Job description text is required', 400);
  if (resumeId) await assertOwner(resumeId, userId);
  const jd = await JobDescription.create({
    userId,
    resumeId: resumeId || null,
    title: title || 'Job Description',
    company: company || '',
    text,
  });
  const indexed = await aiClient.resumeJdIndex({
    user_id: String(userId),
    jd_id: String(jd._id),
    text,
  });
  jd.indexed = true;
  jd.chunkCount = indexed?.data?.chunkCount || 0;
  await jd.save();
  return {
    id: jd._id.toString(),
    title: jd.title,
    company: jd.company,
    indexed: jd.indexed,
    chunkCount: jd.chunkCount,
    resumeId: jd.resumeId ? jd.resumeId.toString() : null,
    createdAt: jd.createdAt,
  };
}

async function listJd(userId) {
  const items = await JobDescription.find({ userId }).sort({ updatedAt: -1 }).limit(50);
  return items.map((j) => ({
    id: j._id.toString(),
    title: j.title,
    company: j.company,
    indexed: j.indexed,
    chunkCount: j.chunkCount,
    resumeId: j.resumeId ? j.resumeId.toString() : null,
    lastMatch: j.lastMatch,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  }));
}

async function matchJd(userId, resumeId, jdId, { provider, model, version } = {}) {
  const resume = await assertOwner(resumeId, userId);
  const jd = await JobDescription.findOne({ _id: jdId, userId });
  if (!jd) throw new AppError('Job description not found', 404);
  const ver = version ? versionDoc(resume, version) : currentVersionDoc(resume);
  if (ver.indexStatus !== 'ready') throw new AppError('Resume not indexed yet', 409);

  const result = await aiClient.resumeJdMatch({
    user_id: String(userId),
    resume_id: String(resumeId),
    jd_id: String(jdId),
    jd_text: jd.text,
    version: ver.version,
    provider,
    model,
  });
  const parsed = result?.data?.parsed || result?.data;
  jd.lastMatch = parsed;
  jd.resumeId = resumeId;
  await jd.save();
  return { match: parsed, jdId: String(jdId), resumeId: String(resumeId), version: ver.version };
}

async function ensureResumeChat(userId, resumeId) {
  const resume = await assertOwner(resumeId, userId);
  if (resume.conversationId) {
    const existing = await Conversation.findOne({ _id: resume.conversationId, userId });
    if (existing) return { conversationId: existing._id.toString(), created: false };
  }
  const conversation = await Conversation.create({
    userId,
    title: `Resume: ${resume.title}`.slice(0, 200),
    systemPrompt: 'resume_chat',
    memoryKind: 'window',
    provider: 'dummy',
    model: 'dummy-echo',
  });
  resume.conversationId = conversation._id;
  await resume.save();
  return { conversationId: conversation._id.toString(), created: true };
}

async function chat(userId, resumeId, { message, provider, model } = {}) {
  if (!message?.trim()) throw new AppError('Message is required', 400);
  const resume = await assertOwner(resumeId, userId);
  const { conversationId } = await ensureResumeChat(userId, resumeId);
  const ver = currentVersionDoc(resume);

  let context = '';
  try {
    const hits = await aiClient.resumeSearch({
      user_id: String(userId),
      resume_id: String(resumeId),
      query: message,
      k: 5,
      version: ver.version,
      similarity_threshold: 0.1,
    });
    // RAG only — never fall back to whole structured resume
    context = (hits?.data?.hits || []).map((h) => h.document).join('\n\n').slice(0, 6000);
  } catch (err) {
    logger.warn('Resume chat RAG failed', { err: err.message });
    context = '';
  }

  // Reuse Copilot chat: RAG context via systemPromptOverride (pipeline still used by chatService)
  const override = [
    'You are CodeMentor Resume Intelligence coach.',
    'Answer using the resume context when provided. Be specific and actionable.',
    'Resume context:',
    context || '(no retrieved chunks yet)',
  ].join('\n');

  await Conversation.updateOne(
    { _id: conversationId, userId },
    {
      $set: {
        systemPrompt: 'resume_chat',
        systemPromptOverride: override.slice(0, 8000),
        ...(provider ? { provider } : {}),
        ...(model ? { model } : {}),
      },
    }
  );

  return chatService.send(userId, { conversationId, message });
}

async function analytics(userId, resumeId) {
  const resume = await assertOwner(resumeId, userId);
  const atsHistory = (resume.atsHistory || []).map((h) => ({
    version: h.version,
    overallScore: h.overallScore,
    createdAt: h.createdAt,
    sectionScores: h.sectionScores,
  }));
  const versions = resume.versions.map((v) => ({
    version: v.version,
    label: v.label,
    chunkCount: v.chunkCount,
    indexStatus: v.indexStatus,
    createdAt: v.createdAt,
    hasAts: Boolean(v.ats),
    overallScore: v.ats?.overallScore ?? v.ats?.parsed?.overallScore ?? null,
  }));

  const skillGrowth = resume.versions.map((v) => {
    const skills = v.skills || v.skills?.parsed || {};
    return {
      version: v.version,
      strong: (skills.strongSkills || skills?.parsed?.strongSkills || []).length,
      weak: (skills.weakSkills || skills?.parsed?.weakSkills || []).length,
      missing: (skills.missingSkills || skills?.parsed?.missingSkills || []).length,
    };
  });

  return {
    atsHistory,
    versions,
    skillGrowth,
    keywordCoverage: atsHistory.map((h) => ({
      version: h.version,
      keywordMatch: h.sectionScores?.keywordMatch ?? null,
      createdAt: h.createdAt,
    })),
    improvementTimeline: atsHistory,
  };
}

module.exports = {
  list,
  getById,
  upload,
  addVersion,
  reindex,
  remove,
  updateMeta,
  search,
  runAts,
  improveBullets,
  skillGap,
  report,
  compareVersions,
  createJd,
  listJd,
  matchJd,
  ensureResumeChat,
  chat,
  analytics,
  rollback,
  serializeResume,
  assertOwner,
};
