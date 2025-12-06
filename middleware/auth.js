const jwtUtil = require("../utils/jwt");
const { AuthenticationError } = require("./errorHandler");

/**
 * 认证中间件（验证 accessToken）
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError("缺少授权令牌");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new AuthenticationError("授权令牌格式错误");
    }

    const token = parts[1];
    const decoded = jwtUtil.verifyAccessToken(token);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: decoded.username,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 刷新 Token 中间件（验证 refreshToken）
 */
const refreshTokenMiddleware = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError("缺少刷新令牌");
    }

    const decoded = jwtUtil.verifyRefreshToken(refreshToken);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: decoded.username,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  authMiddleware,
  refreshTokenMiddleware,
};
