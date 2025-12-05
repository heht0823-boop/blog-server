const { errorResponse } = require("./errorHandler");

/**
 * 管理员权限验证：
 * - 依赖authMiddleware，需在其之后使用
 * - 验证用户角色是否为管理员（role=1）
 */
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 1) {
    return errorResponse(res, null, "无管理员权限", 403);
  }
  next();
};

module.exports = adminMiddleware;
