/**
 * Audit logging service — fire-and-forget friendly.
 */
const AuditLog = require('../models/AuditLog.model');
const logger = require('../utils/logger');

async function writeAudit({ userId, action, details = {}, ip = null }) {
  try {
    await AuditLog.create({ userId, action, details, ip });
  } catch (error) {
    logger.error('Failed to write audit log', { error: error.message, action, userId });
  }
}

module.exports = { writeAudit };
