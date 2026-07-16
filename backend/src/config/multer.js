/**
 * Multer configuration — avatar uploads with MIME validation.
 */
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { env } = require('./env');

const avatarDir = path.resolve(process.cwd(), env.uploadDir, 'avatars');
fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});

function avatarFileFilter(_req, file, cb) {
  if (!env.avatar.allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
  return cb(null, true);
}

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: env.avatar.maxSizeMb * 1024 * 1024 },
  fileFilter: avatarFileFilter,
});

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

module.exports = { upload, uploadAvatar };
