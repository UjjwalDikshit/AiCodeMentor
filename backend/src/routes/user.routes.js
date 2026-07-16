const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { validate } = require('../middlewares/validate.middleware');
const { updateProfileSchema, updatePasswordSchema } = require('../validators/user.validator');
const { uploadAvatar } = require('../config/multer');

const router = Router();

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.patch('/password', validate(updatePasswordSchema), userController.updatePassword);
router.post('/avatar', uploadAvatar.single('avatar'), userController.uploadAvatar);

module.exports = router;
