const { Router } = require('express');
const userController = require('../controllers/user.controller');

const router = Router();

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.get('/:id', userController.getById);

module.exports = router;
