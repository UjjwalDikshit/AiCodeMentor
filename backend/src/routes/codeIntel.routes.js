const { Router } = require('express');
const codeIntelController = require('../controllers/codeIntel.controller');
const { uploadCode } = require('../config/multer');
const { validate } = require('../middlewares/validate.middleware');
const { codeIntelLimiter } = require('../middlewares/rateLimit.middleware');
const v = require('../validators/codeIntel.validator');
const { AppError } = require('../utils/AppError');

const router = Router();
router.use(codeIntelLimiter);

function handleMulter(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return next(new AppError(err.message || 'Upload failed', 400));
      return next();
    });
  };
}

router.get('/', validate(v.listSchema), codeIntelController.list);
router.get('/analytics', codeIntelController.analytics);
router.post('/', validate(v.createSchema), codeIntelController.create);
router.post('/upload', handleMulter(uploadCode.single('file')), codeIntelController.upload);

router.get('/:id', validate(v.idParam), codeIntelController.get);
router.delete('/:id', validate(v.idParam), codeIntelController.remove);
router.post('/:id/analyze', validate(v.analyzeSchema), codeIntelController.analyze);
router.post('/:id/analyze/async', validate(v.analyzeSchema), codeIntelController.analyzeAsync);
router.post('/:id/stream', validate(v.providerBody), codeIntelController.stream);
router.post('/:id/complexity', validate(v.idParam), codeIntelController.complexity);
router.post('/:id/security', validate(v.idParam), codeIntelController.security);
router.post('/:id/performance', validate(v.idParam), codeIntelController.performance);
router.post('/:id/refactor', validate(v.providerBody), codeIntelController.refactor);
router.post('/:id/interview', validate(v.providerBody), codeIntelController.interview);
router.post('/:id/diff', validate(v.diffSchema), codeIntelController.diff);
router.post('/:id/chat', validate(v.chatSchema), codeIntelController.chat);
router.post('/:id/chat/session', validate(v.idParam), codeIntelController.ensureChat);

module.exports = router;
