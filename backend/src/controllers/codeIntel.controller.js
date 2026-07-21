const { asyncHandler } = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const codeIntelService = require('../services/codeIntel.service');

const codeIntelController = {
  list: asyncHandler(async (req, res) => {
    const data = await codeIntelService.list(req.user.id, req.query);
    return success(res, { message: 'Code reviews', data });
  }),

  get: asyncHandler(async (req, res) => {
    const data = await codeIntelService.getById(req.user.id, req.params.id);
    return success(res, { message: 'Code review', data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await codeIntelService.create(req.user.id, req.body);
    return success(res, { message: 'Created', data, statusCode: 201 });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await codeIntelService.remove(req.user.id, req.params.id);
    return success(res, { message: 'Deleted', data });
  }),

  upload: asyncHandler(async (req, res) => {
    const data = await codeIntelService.uploadAndAnalyze(req.user.id, req.file, req.body || {});
    return success(res, { message: 'Uploaded — analyzing', data, statusCode: 201 });
  }),

  analyze: asyncHandler(async (req, res) => {
    const data = await codeIntelService.runAnalyze(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'Analysis complete', data });
  }),

  analyzeAsync: asyncHandler(async (req, res) => {
    codeIntelService.enqueueAnalyze(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'Analysis queued', data: { status: 'analyzing' } });
  }),

  stream: asyncHandler(async (req, res) => {
    await codeIntelService.streamReview(req.user.id, req.params.id, res, req.body || {});
  }),

  complexity: asyncHandler(async (req, res) => {
    const data = await codeIntelService.complexity(req.user.id, req.params.id);
    return success(res, { message: 'Complexity', data });
  }),

  security: asyncHandler(async (req, res) => {
    const data = await codeIntelService.security(req.user.id, req.params.id);
    return success(res, { message: 'Security', data });
  }),

  performance: asyncHandler(async (req, res) => {
    const data = await codeIntelService.performance(req.user.id, req.params.id);
    return success(res, { message: 'Performance', data });
  }),

  refactor: asyncHandler(async (req, res) => {
    const data = await codeIntelService.refactor(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'Refactor', data });
  }),

  interview: asyncHandler(async (req, res) => {
    const data = await codeIntelService.interview(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'Interview coach', data });
  }),

  diff: asyncHandler(async (req, res) => {
    const data = await codeIntelService.diff(req.user.id, req.params.id, req.body || {});
    return success(res, { message: 'Diff review', data });
  }),

  chat: asyncHandler(async (req, res) => {
    const data = await codeIntelService.chat(req.user.id, req.params.id, req.body);
    return success(res, { message: 'Code chat', data });
  }),

  ensureChat: asyncHandler(async (req, res) => {
    const data = await codeIntelService.ensureChat(req.user.id, req.params.id);
    return success(res, { message: 'Chat session', data });
  }),

  analytics: asyncHandler(async (req, res) => {
    const data = await codeIntelService.analytics(req.user.id);
    return success(res, { message: 'Code analytics', data });
  }),
};

module.exports = codeIntelController;
