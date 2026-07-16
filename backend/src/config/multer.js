/**
 * Multer / upload configuration placeholder.
 * Controllers must not configure storage inline — inject via this module.
 */
const path = require('path');
const multer = require('multer');
const { env } = require('./env');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), env.uploadDir));
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
});

module.exports = { upload };
