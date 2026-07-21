const { asyncHandler } = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const resumeService = require('../services/resume.service');

const resumeController = {
  list: asyncHandler(async (req, res) => {
    const data = await resumeService.list(req.user.id, req.query);
    return success(res, { message: 'Resumes', data });
  }),

  get: asyncHandler(async (req, res) => {
    const data = await resumeService.getById(req.user.id, req.params.id);
    return success(res, { message: 'Resume', data });
  }),

  upload: asyncHandler(async (req, res) => {
    const data = await resumeService.upload(req.user.id, req.file, req.body || {});
    return success(res, { message: 'Resume uploaded', data, statusCode: 201 });
  }),

  addVersion: asyncHandler(async (req, res) => {
    const data = await resumeService.addVersion(req.user.id, req.params.id, req.file, req.body || {});
    return success(res, { message: 'Version added', data, statusCode: 201 });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await resumeService.updateMeta(req.user.id, req.params.id, req.body);
    return success(res, { message: 'Resume updated', data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await resumeService.remove(req.user.id, req.params.id);
    return success(res, { message: 'Resume deleted', data });
  }),

  reindex: asyncHandler(async (req, res) => {
    const data = await resumeService.reindex(req.user.id, req.params.id, req.body?.version);
    return success(res, { message: 'Re-index started', data });
  }),

  search: asyncHandler(async (req, res) => {
    const data = await resumeService.search(req.user.id, req.params.id, req.body);
    return success(res, { message: 'Resume RAG search', data });
  }),

  ats: asyncHandler(async (req, res) => {
    const data = await resumeService.runAts(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'ATS evaluation', data });
  }),

  bullets: asyncHandler(async (req, res) => {
    const data = await resumeService.improveBullets(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'Bullet improvements', data });
  }),

  skills: asyncHandler(async (req, res) => {
    const data = await resumeService.skillGap(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'Skill gap', data });
  }),

  report: asyncHandler(async (req, res) => {
    const data = await resumeService.report(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'Resume report', data });
  }),

  compare: asyncHandler(async (req, res) => {
    const data = await resumeService.compareVersions(req.user.id, req.params.id, req.body);
    return success(res, { message: 'Version comparison', data });
  }),

  rollback: asyncHandler(async (req, res) => {
    const data = await resumeService.rollback(req.user.id, req.params.id, req.body.version);
    return success(res, { message: 'Rolled back to version', data });
  }),

  listJd: asyncHandler(async (req, res) => {
    const data = await resumeService.listJd(req.user.id);
    return success(res, { message: 'Job descriptions', data });
  }),

  createJd: asyncHandler(async (req, res) => {
    const data = await resumeService.createJd(req.user.id, req.body);
    return success(res, { message: 'JD created', data, statusCode: 201 });
  }),

  matchJd: asyncHandler(async (req, res) => {
    const data = await resumeService.matchJd(req.user.id, req.params.id, req.params.jdId, req.body || {});
    return success(res, { message: 'JD match', data });
  }),

  chat: asyncHandler(async (req, res) => {
    const data = await resumeService.chat(req.user.id, req.params.id, req.body);
    return success(res, { message: 'Resume chat', data });
  }),

  ensureChat: asyncHandler(async (req, res) => {
    const data = await resumeService.ensureResumeChat(req.user.id, req.params.id);
    return success(res, { message: 'Resume chat session', data });
  }),

  analytics: asyncHandler(async (req, res) => {
    const data = await resumeService.analytics(req.user.id, req.params.id);
    return success(res, { message: 'Resume analytics', data });
  }),
};

module.exports = resumeController;
