const { Router } = require('express');
const { validate } = require('../middlewares/validate.middleware');
const { chatLimiter } = require('../middlewares/rateLimit.middleware');
const { uploadChatAttachment } = require('../config/multer');
const {
  chatController,
  templateController,
  promptLibraryController,
} = require('../controllers/chat.controller');
const {
  chatSendSchema,
  chatStopSchema,
  regenerateSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createPromptSchema,
  updatePromptSchema,
  conversationIdParam,
} = require('../validators/chat.validator');

const router = Router();

router.post('/', chatLimiter, validate(chatSendSchema), chatController.send);
router.post('/stream', chatLimiter, validate(chatSendSchema), chatController.stream);
router.post('/regenerate', chatLimiter, validate(regenerateSchema), chatController.regenerate);
router.post('/retry', chatLimiter, validate(regenerateSchema), chatController.retry);
router.post('/stop', chatLimiter, validate(chatStopSchema), chatController.stop);
router.post(
  '/attachments',
  chatLimiter,
  uploadChatAttachment.single('file'),
  chatController.uploadAttachment
);
router.get('/providers', chatController.providers);
router.get('/models', chatController.models);
router.get('/analytics', chatController.analytics);

router.get('/templates', templateController.list);
router.post('/templates', validate(createTemplateSchema), templateController.create);
router.post('/templates/:id/duplicate', validate(conversationIdParam), templateController.duplicate);
router.patch('/templates/:id', validate(updateTemplateSchema), templateController.update);
router.delete('/templates/:id', validate(conversationIdParam), templateController.remove);

router.get('/prompts/export', promptLibraryController.exportAll);
router.post('/prompts/import', promptLibraryController.importAll);
router.get('/prompts', promptLibraryController.list);
router.post('/prompts', validate(createPromptSchema), promptLibraryController.create);
router.post('/prompts/:id/duplicate', validate(conversationIdParam), promptLibraryController.duplicate);
router.patch('/prompts/:id', validate(updatePromptSchema), promptLibraryController.update);
router.delete('/prompts/:id', validate(conversationIdParam), promptLibraryController.remove);

module.exports = router;
