const { verifyToken } = require("../utils/jwt");
const { errorResponse } = require("./errorHandler");

/**
 * Token验证中间件：
 * - 从请求头Authorization获取Token
 * - 验证通过后挂载用户信息到req.user
 * - 用于需要登录权限的接口
 */
const authMiddleware = (req, res, next) => {
  try {
    // 从请求头获取Token（格式：Bearer <token>）
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, null, "请先登录", 401);
    }

    const token = authHeader.split(" ")[1];
    // 验证Token并解析用户信息
    const decoded = verifyToken(token);
    // 挂载用户信息到req（后续控制器可通过req.user获取）
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (err) {
    next(err); // 抛给统一错误处理中间件
  }
};

module.exports = authMiddleware;
