/**
 * Strip HTML / trim user-controlled strings.
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/[<>]/g, '')
    .replace(/\0/g, '');
}

function sanitizeObject(obj, keys) {
  const result = { ...obj };
  keys.forEach((key) => {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key]);
    }
  });
  return result;
}

module.exports = { sanitizeString, sanitizeObject };
