const { asyncHandler } = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { conversationService } = require('../services/conversation.service');
const { chatService } = require('../services/chat.service');
const { templateService } = require('../services/template.service');
const { promptLibraryService } = require('../services/promptLibrary.service');
const { exportImportService } = require('../services/exportImport.service');
const { getOverview } = require('../services/chatAnalytics.service');

const conversationController = {
  list: asyncHandler(async (req, res) => {
    const data = await conversationService.list(req.user.id, req.query);
    return success(res, { message: 'Conversations', data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await conversationService.create(req.user.id, req.body);
    return success(res, { message: 'Conversation created', data, statusCode: 201 });
  }),

  get: asyncHandler(async (req, res) => {
    const data = await conversationService.getById(req.user.id, req.params.id);
    return success(res, { message: 'Conversation', data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await conversationService.update(req.user.id, req.params.id, req.body);
    return success(res, { message: 'Conversation updated', data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await conversationService.remove(req.user.id, req.params.id);
    return success(res, { message: 'Conversation deleted', data });
  }),

  duplicate: asyncHandler(async (req, res) => {
    const data = await conversationService.duplicate(req.user.id, req.params.id);
    return success(res, { message: 'Conversation duplicated', data, statusCode: 201 });
  }),

  messages: asyncHandler(async (req, res) => {
    const data = await conversationService.listMessages(req.user.id, req.params.id, req.query);
    return success(res, { message: 'Messages', data });
  }),

  search: asyncHandler(async (req, res) => {
    const data = await conversationService.search(req.user.id, req.query.q);
    return success(res, { message: 'Search results', data });
  }),

  exportOne: asyncHandler(async (req, res) => {
    const format = req.query.format || 'json';
    const file = await exportImportService.exportConversation(req.user.id, req.params.id, format);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    if (file.binary) return res.send(file.body);
    return res.send(file.body);
  }),

  importOne: asyncHandler(async (req, res) => {
    const data = await exportImportService.importConversation(req.user.id, req.body);
    return success(res, { message: 'Conversation imported', data, statusCode: 201 });
  }),
};

const chatController = {
  send: asyncHandler(async (req, res) => {
    const data = await chatService.send(req.user.id, req.body);
    return success(res, { message: 'Chat response', data });
  }),

  stream: asyncHandler(async (req, res) => {
    await chatService.stream(req.user.id, req.body, res);
  }),

  regenerate: asyncHandler(async (req, res) => {
    const data = await chatService.regenerate(req.user.id, req.body);
    return success(res, { message: 'Regenerated', data });
  }),

  retry: asyncHandler(async (req, res) => {
    const data = await chatService.retry(req.user.id, req.body);
    return success(res, { message: 'Retried', data });
  }),

  stop: asyncHandler(async (req, res) => {
    const data = await chatService.stop(req.user.id, req.body);
    return success(res, { message: 'Stop requested', data });
  }),

  providers: asyncHandler(async (_req, res) => {
    const data = await chatService.listProviders();
    return success(res, { message: 'Providers', data: data.data || data });
  }),

  models: asyncHandler(async (_req, res) => {
    const data = await chatService.listModels();
    return success(res, { message: 'Models', data: data.data || data });
  }),

  uploadAttachment: asyncHandler(async (req, res) => {
    if (!req.file) {
      return success(res, { message: 'No file', data: {}, statusCode: 400 });
    }
    const meta = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date().toISOString(),
    };
    return success(res, {
      message: 'Attachment uploaded (metadata only — no RAG)',
      data: meta,
      statusCode: 201,
    });
  }),

  analytics: asyncHandler(async (req, res) => {
    const data = await getOverview(req.user.id, req.query);
    return success(res, { message: 'Chat analytics', data });
  }),
};

const templateController = {
  list: asyncHandler(async (req, res) => {
    const data = await templateService.list(req.user.id);
    return success(res, { message: 'Templates', data });
  }),
  create: asyncHandler(async (req, res) => {
    const data = await templateService.create(req.user.id, req.body);
    return success(res, { message: 'Template created', data, statusCode: 201 });
  }),
  update: asyncHandler(async (req, res) => {
    const data = await templateService.update(req.user.id, req.params.id, req.body);
    return success(res, { message: 'Template updated', data });
  }),
  remove: asyncHandler(async (req, res) => {
    const data = await templateService.remove(req.user.id, req.params.id);
    return success(res, { message: 'Template deleted', data });
  }),
  duplicate: asyncHandler(async (req, res) => {
    const data = await templateService.duplicate(req.user.id, req.params.id);
    return success(res, { message: 'Template duplicated', data, statusCode: 201 });
  }),
};

const promptLibraryController = {
  list: asyncHandler(async (req, res) => {
    const data = await promptLibraryService.list(req.user.id, req.query);
    return success(res, { message: 'Prompt library', data });
  }),
  create: asyncHandler(async (req, res) => {
    const data = await promptLibraryService.create(req.user.id, req.body);
    return success(res, { message: 'Prompt created', data, statusCode: 201 });
  }),
  update: asyncHandler(async (req, res) => {
    const data = await promptLibraryService.update(req.user.id, req.params.id, req.body);
    return success(res, { message: 'Prompt updated', data });
  }),
  remove: asyncHandler(async (req, res) => {
    const data = await promptLibraryService.remove(req.user.id, req.params.id);
    return success(res, { message: 'Prompt deleted', data });
  }),
  duplicate: asyncHandler(async (req, res) => {
    const data = await promptLibraryService.duplicate(req.user.id, req.params.id);
    return success(res, { message: 'Prompt duplicated', data, statusCode: 201 });
  }),
  exportAll: asyncHandler(async (req, res) => {
    const data = await promptLibraryService.exportAll(req.user.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="prompts.json"');
    return res.send(JSON.stringify(data, null, 2));
  }),
  importAll: asyncHandler(async (req, res) => {
    const data = await promptLibraryService.importMany(req.user.id, req.body);
    return success(res, { message: 'Prompts imported', data, statusCode: 201 });
  }),
};

module.exports = {
  conversationController,
  chatController,
  templateController,
  promptLibraryController,
};
