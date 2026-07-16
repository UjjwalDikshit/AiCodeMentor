/**
 * Validators barrel — import schemas from domain files.
 */
const authValidator = require('./auth.validator');

module.exports = {
  ...authValidator,
};
