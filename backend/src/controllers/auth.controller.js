/**
 * Auth HTTP adapters — delegate all logic to auth.service.
 */
const authService = require('../services/auth.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const { setRefreshCookie, clearRefreshCookie } = require('../utils/cookie');
const { env } = require('../config/env');

const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    setRefreshCookie(res, result.refreshToken);

    return success(res, {
      message: 'Registration successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
      statusCode: 201,
    });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    setRefreshCookie(res, result.refreshToken);

    return success(res, {
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  }),

  logout: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[env.cookie.refreshName];
    let userId = req.user?.id;

    if (!userId && refreshToken) {
      try {
        const { verifyRefreshToken } = require('../services/token.service');
        const decoded = verifyRefreshToken(refreshToken);
        userId = decoded.sub;
      } catch {
        // ignore invalid token on logout
      }
    }

    await authService.logout(userId);
    clearRefreshCookie(res);

    return success(res, { message: 'Logged out successfully' });
  }),

  refresh: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[env.cookie.refreshName];
    const result = await authService.refresh(refreshToken);
    setRefreshCookie(res, result.refreshToken);

    return success(res, {
      message: 'Token refreshed',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  }),
};

module.exports = authController;
