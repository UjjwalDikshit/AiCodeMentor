/**
 * Application bootstrap — HTTP server + Socket.IO attach point.
 * Business logic lives in services/; this file only wires infrastructure.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config(); // fallback: backend/.env

const http = require('http');
const app = require('./app');
const { connectDatabase } = require('./config/database');
const { env } = require('./config/env');
const logger = require('./utils/logger');
const { initSocket } = require('./sockets');

async function bootstrap() {
  try {
    await connectDatabase();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(env.port, env.host, () => {
      logger.info(`CodeMentor AI backend listening on ${env.host}:${env.port}`);
      logger.info(`API prefix: ${env.apiPrefix}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

bootstrap();
