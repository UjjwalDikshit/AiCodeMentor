/**
 * Request validation middleware factory (Zod).
 */
const { ZodError } = require('zod');

function formatZodErrors(error) {
  if (!(error instanceof ZodError)) {
    return [{ message: error.message }];
  }

  return error.errors.map((err) => ({
    field: err.path.join('.') || 'body',
    message: err.message,
  }));
}

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
      error.details = formatZodErrors(error);
      return next(error);
    }
  };
}

module.exports = { validate, formatZodErrors };
