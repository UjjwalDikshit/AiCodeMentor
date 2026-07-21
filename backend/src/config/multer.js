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

const chatDir = path.resolve(process.cwd(), env.uploadDir, 'chat');
fs.mkdirSync(chatDir, { recursive: true });

const CHAT_ALLOWED_EXT = new Set([
  '.pdf',
  '.txt',
  '.md',
  '.markdown',
  '.docx',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.c',
  '.cpp',
  '.cc',
  '.h',
  '.hpp',
  '.json',
  '.yml',
  '.yaml',
  '.css',
  '.html',
  '.sql',
]);

const CHAT_ALLOWED_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/json',
  'text/javascript',
  'application/javascript',
  'text/x-python',
  'text/html',
  'text/css',
  'application/octet-stream',
]);

const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});

function chatFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!CHAT_ALLOWED_EXT.has(ext)) {
    return cb(new Error('File type not allowed for chat attachments'));
  }
  if (file.mimetype && !CHAT_ALLOWED_MIME.has(file.mimetype) && !file.mimetype.startsWith('text/')) {
    return cb(new Error('MIME type not allowed for chat attachments'));
  }
  return cb(null, true);
}

const uploadChatAttachment = multer({
  storage: chatStorage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  fileFilter: chatFileFilter,
});

const resumeDir = path.resolve(process.cwd(), env.uploadDir, 'resume');
fs.mkdirSync(resumeDir, { recursive: true });

const RESUME_ALLOWED_EXT = new Set(['.pdf', '.docx', '.txt', '.md', '.markdown']);
const RESUME_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/octet-stream',
]);

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumeDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});

function resumeFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!RESUME_ALLOWED_EXT.has(ext)) {
    return cb(new Error('Only PDF, DOCX, TXT, and Markdown resumes are allowed'));
  }
  if (file.mimetype && !RESUME_ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('MIME type not allowed for resume uploads'));
  }
  return cb(null, true);
}

const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  fileFilter: resumeFileFilter,
});

module.exports = { upload, uploadAvatar, uploadChatAttachment, uploadResume };
