/**
 * Mongoose models barrel.
 * Schemas live here; repositories/services own all DB access — never controllers.
 */
const User = require('./User.model');

module.exports = {
  User,
};
