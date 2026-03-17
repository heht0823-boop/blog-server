const jwtUtil = require("../utils/jwt");
const { AuthenticationError } = require("./errorHandler");

/**
 * 认证中间件（验证 accessToken）- 可选认证
 * token 无效/过期时 req.user = null，允许继续执行
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = null;
      return next();
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      req.user = null;
      return next();
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
    // token 过期/无效时，允许继续执行（可选认证）
    req.user = null;
    next();
  }
};

/**
 * 严格认证中间件 - 必须认证
 * token 无效/过期时抛出 401 错误
 */
const strictAuthMiddleware = (req, res, next) => {
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
    // ✅ 确保所有认证错误都返回 401
    if (!err.statusCode) {
      err.statusCode = 401;
    }
    if (!err.code) {
      err.code = "AUTHENTICATION_ERROR";
    }
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
    // ✅ 确保所有认证错误都返回 401
    if (!err.statusCode) {
      err.statusCode = 401;
    }
    if (!err.code) {
      err.code = "AUTHENTICATION_ERROR";
    }
    next(err);
  }
};

module.exports = {
  authMiddleware,
  strictAuthMiddleware,
  refreshTokenMiddleware,
};
