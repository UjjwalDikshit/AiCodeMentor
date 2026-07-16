/**
 * Centralized environment configuration (12-factor).
 * Controllers/services depend on this module — never read process.env ad hoc.
 */
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.BACKEND_HOST || '0.0.0.0',
  port: Number(process.env.BACKEND_PORT) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/codementor_ai',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_only_change_me_access_secret_32c',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_only_change_me_refresh_secret_32c',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 10,
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiServiceTimeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS) || 60000,
  cookie: {
    refreshName: process.env.REFRESH_COOKIE_NAME || 'cm_refresh_token',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'strict',
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  avatar: {
    maxSizeMb: Number(process.env.AVATAR_MAX_SIZE_MB) || 5,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
};

module.exports = { env };
