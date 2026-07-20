const { Router } = require('express');
const goalController = require('../controllers/goal.controller');
const { validate } = require('../middlewares/validate.middleware');
const {
  createGoalSchema,
  updateGoalSchema,
  goalIdParamsSchema,
  listGoalsSchema,
} = require('../validators/dashboard.validator');

const router = Router();

router.post('/', validate(createGoalSchema), goalController.create);
router.get('/', validate(listGoalsSchema), goalController.list);
router.post('/:id/restore', validate(goalIdParamsSchema), goalController.restore);
router.patch('/:id', validate(updateGoalSchema), goalController.update);
router.delete('/:id', validate(goalIdParamsSchema), goalController.remove);

module.exports = router;
