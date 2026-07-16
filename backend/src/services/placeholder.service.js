/**
 * Generic placeholder domain service.
 * Replace per-feature services (authService, chatService, ...) as you implement.
 */
async function getComingSoon(resource) {
  return {
    success: true,
    message: 'Coming Soon',
    resource,
  };
}

module.exports = {
  getComingSoon,
};
