const jwtUtil = require("../utils/jwt");
const { errorResponse } = require("./errorHandler");

/**
 * 认证中间件：验证 Token 并挂载用户信息
 * 支持从 Authorization 头或 Cookie 中获取 Token
 */
const authMiddleware = (req, res, next) => {
  try {
    // 1. 从请求头或 Cookie 获取 Token
    let token = extractToken(req);

    if (!token) {
      return errorResponse(res, null, "未提供 Token", 401, 401);
    }

    // 2. 验证 Token
    const decoded = jwtUtil.verifyAccessToken(token);

    // 3. 挂载用户信息到 req
    req.user = {
      id: decoded.id,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
      type: decoded.type,
    };

    // 4. 检查 Token 是否即将过期
    if (jwtUtil.isTokenExpiringSoon(token, 600)) {
      // 在响应头中提示前端需要刷新 Token
      res.setHeader("X-Token-Expiring-Soon", "true");
      res.setHeader(
        "X-Token-Remaining-Time",
        jwtUtil.getTokenRemainingTime(token)
      );
    }

    next();
  } catch (err) {
    // 区分不同的 Token 错误
    if (err.code === "TOKEN_EXPIRED") {
      return errorResponse(res, err, "Token 已过期", 401, 401);
    }
    if (err.code === "TOKEN_INVALID") {
      return errorResponse(res, err, "Token 无效", 401, 401);
    }
    if (err.message === "未提供 Token") {
      return errorResponse(res, err, "未提供 Token", 401, 401);
    }

    return errorResponse(res, err, "认证失败", 401, 401);
  }
};

/**
 * 可选认证中间件（Token 不存在时不报错）
 * 用于既可以匿名访问又可以登录后访问的接口
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        const decoded = jwtUtil.verifyAccessToken(token);
        req.user = {
          id: decoded.id,
          role: decoded.role,
          iat: decoded.iat,
          exp: decoded.exp,
        };
      } catch (err) {
        // Token 无效但继续处理（req.user 为 undefined）
        console.warn("可选 Token 验证失败：", err.message);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 刷新 Token 中间件
 * 用于需要刷新 Token 的接口
 */
const refreshTokenMiddleware = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, null, "未提供 refresh token", 400, 400);
    }

    // 验证刷新 Token
    const decoded = jwtUtil.verifyRefreshToken(refreshToken);

    // 挂载到 req
    req.refreshTokenData = decoded;

    next();
  } catch (err) {
    if (err.code === "TOKEN_EXPIRED") {
      return errorResponse(
        res,
        err,
        "Refresh token 已过期，请重新登录",
        401,
        401
      );
    }
    return errorResponse(res, err, "Refresh token 无效", 401, 401);
  }
};

/**
 * 从请求中提取 Token
 * 支持多种方式：Authorization 头、Cookie、查询参数
 * @private
 */
function extractToken(req) {
  // 1. 从 Authorization 头获取（推荐）
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      return parts[1];
    }
    throw new Error("Token 格式错误");
  }

  // 2. 从 Cookie 获取（备选）
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  // 3. 从查询参数获取（仅作备选，安全性较低）
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  refreshTokenMiddleware,
  extractToken,
};
