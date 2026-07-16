/**
 * Hash refresh tokens before persisting — never store raw tokens in DB.
 */
const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { hashToken };
