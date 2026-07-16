/**
 * Chat namespace placeholders — emit Coming Soon until features ship.
 */
const logger = require('../utils/logger');

function registerChatHandlers(_io, socket) {
  socket.on('chat:join', (payload) => {
    logger.debug('chat:join placeholder', { socketId: socket.id, payload });
    socket.emit('chat:joined', {
      success: true,
      message: 'Coming Soon',
    });
  });

  socket.on('chat:message', (payload) => {
    logger.debug('chat:message placeholder', { socketId: socket.id, payload });
    socket.emit('chat:response', {
      success: true,
      message: 'Coming Soon',
    });
  });
}

module.exports = registerChatHandlers;
