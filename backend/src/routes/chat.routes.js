const { Router } = require('express');
const chatController = require('../controllers/chat.controller');

const router = Router();

router.get('/', chatController.list);
router.post('/', chatController.send);

module.exports = router;
