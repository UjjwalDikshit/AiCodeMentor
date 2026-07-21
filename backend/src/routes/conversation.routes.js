const { Router } = require('express');
const { validate } = require('../middlewares/validate.middleware');
const { conversationController } = require('../controllers/chat.controller');
const {
  createConversationSchema,
  updateConversationSchema,
  conversationIdParam,
  listConversationsSchema,
  listMessagesSchema,
  searchSchema,
} = require('../validators/chat.validator');

const router = Router();

router.get('/search', validate(searchSchema), conversationController.search);
router.post('/import', conversationController.importOne);
router.get('/', validate(listConversationsSchema), conversationController.list);
router.post('/', validate(createConversationSchema), conversationController.create);
router.get('/:id', validate(conversationIdParam), conversationController.get);
router.patch('/:id', validate(updateConversationSchema), conversationController.update);
router.delete('/:id', validate(conversationIdParam), conversationController.remove);
router.post('/:id/duplicate', validate(conversationIdParam), conversationController.duplicate);
router.get('/:id/messages', validate(listMessagesSchema), conversationController.messages);
router.get('/:id/export', validate(conversationIdParam), conversationController.exportOne);

module.exports = router;
