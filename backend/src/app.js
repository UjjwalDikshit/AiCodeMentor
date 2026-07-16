/**
 * Express application factory.
 * Middleware order: security → parsing → logging → routes → errors.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'CodeMentor AI backend is healthy',
    service: 'backend',
  });
});

app.use(env.apiPrefix, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
