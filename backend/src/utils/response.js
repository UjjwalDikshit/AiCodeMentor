/**
 * Uniform API response helpers — keep controllers thin and consistent.
 */
function success(res, { message = 'OK', data = null, statusCode = 200 } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null ? { data } : {}),
  });
}

function comingSoon(res, resource = 'Resource') {
  return res.status(200).json({
    success: true,
    message: 'Coming Soon',
    meta: { resource },
  });
}

function fail(res, { message = 'Request failed', statusCode = 400, errors = null } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}

module.exports = { success, comingSoon, fail };
