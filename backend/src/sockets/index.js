/**
 * Socket.IO bootstrap — real-time chat/interview events land here later.
 */
const { Server } = require('socket.io');
const { env } = require('../config/env');
const logger = require('../utils/logger');
const registerChatHandlers = require('./chat.socket');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id });

    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized — call initSocket first');
  }
  return io;
}

module.exports = { initSocket, getIO };
