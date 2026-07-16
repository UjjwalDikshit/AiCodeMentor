/**
 * Domain services barrel — business logic lives here (not in controllers).
 * Controllers call services; services call repositories / AI client / models.
 */
const placeholderService = require('./placeholder.service');
const aiClient = require('./aiClient.service');

module.exports = {
  placeholderService,
  aiClient,
};
