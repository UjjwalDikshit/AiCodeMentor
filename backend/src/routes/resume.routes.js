const { Router } = require('express');
const resumeController = require('../controllers/resume.controller');
const { uploadResume } = require('../config/multer');
const { validate } = require('../middlewares/validate.middleware');
const { resumeLimiter } = require('../middlewares/rateLimit.middleware');
const v = require('../validators/resume.validator');
const { AppError } = require('../utils/AppError');

const router = Router();

router.use(resumeLimiter);

function handleMulter(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return next(new AppError(err.message || 'Upload failed', 400));
      return next();
    });
  };
}

router.get('/', validate(v.listSchema), resumeController.list);
router.post('/upload', handleMulter(uploadResume.single('file')), resumeController.upload);

router.get('/jd', resumeController.listJd);
router.post('/jd', validate(v.jdCreateSchema), resumeController.createJd);

router.get('/:id', validate(v.idParam), resumeController.get);
router.patch('/:id', validate(v.updateSchema), resumeController.update);
router.delete('/:id', validate(v.idParam), resumeController.remove);

router.post(
  '/:id/versions',
  validate(v.idParam),
  handleMulter(uploadResume.single('file')),
  resumeController.addVersion
);
router.post('/:id/reindex', validate(v.reindexSchema), resumeController.reindex);
router.post('/:id/search', validate(v.searchSchema), resumeController.search);
router.post('/:id/ats', validate(v.atsSchema), resumeController.ats);
router.post('/:id/bullets', validate(v.bulletsSchema), resumeController.bullets);
router.post('/:id/skills', validate(v.skillsSchema), resumeController.skills);
router.post('/:id/report', validate(v.reportSchema), resumeController.report);
router.post('/:id/compare', validate(v.compareSchema), resumeController.compare);
router.post('/:id/rollback', validate(v.rollbackSchema), resumeController.rollback);
router.post('/:id/jd/:jdId/match', validate(v.matchSchema), resumeController.matchJd);
router.post('/:id/chat', validate(v.chatSchema), resumeController.chat);
router.post('/:id/chat/session', validate(v.idParam), resumeController.ensureChat);
router.get('/:id/analytics', validate(v.idParam), resumeController.analytics);

module.exports = router;
