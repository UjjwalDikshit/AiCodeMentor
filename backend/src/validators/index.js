/**
 * Validators barrel.
 */
const authValidator = require('./auth.validator');
const userValidator = require('./user.validator');

module.exports = {
  ...authValidator,
  ...userValidator,
};
