/**
 * Uniform API response helpers — every response includes success, message, data, meta.
 */
function success(res, { message = 'OK', data = {}, meta = {}, statusCode = 200 } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? {},
    meta: meta ?? {},
  });
}

function comingSoon(res, resource = 'Resource') {
  return res.status(200).json({
    success: true,
    message: 'Coming Soon',
    data: {},
    meta: { resource },
  });
}

function fail(res, { message = 'Request failed', statusCode = 400, errors = null, meta = {} } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    data: {},
    meta: meta ?? {},
    ...(errors ? { errors } : {}),
  });
}

module.exports = { success, comingSoon, fail };
