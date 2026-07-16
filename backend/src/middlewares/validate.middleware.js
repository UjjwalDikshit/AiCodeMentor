/**
 * Request validation middleware factory (Zod-ready).
 * Pass a schema with optional body/query/params when implementing features.
 */
function validate(schema) {
  return (req, _res, next) => {
    if (!schema) return next();

    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) req.query = schema.query.parse(req.query);
      if (schema.params) req.params = schema.params.parse(req.params);
      return next();
    } catch (error) {
      error.statusCode = 422;
      error.isOperational = true;
      error.message = 'Validation failed';
      error.details = error.errors || error.message;
      return next(error);
    }
  };
}

module.exports = { validate };
