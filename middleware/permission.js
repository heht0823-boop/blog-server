const { errorResponse } = require("./errorHandler");

/**
 * 管理员权限中间件
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, null, "未认证", 401, 401);
  }

  if (req.user.role < 1) {
    return errorResponse(res, null, "权限不足", 403, 403);
  }

  next();
};

/**
 * 超级管理员权限中间件
 */
const superAdminMiddleware = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, null, "未认证", 401, 401);
  }

  if (req.user.role < 2) {
    return errorResponse(res, null, "需要超级管理员权限", 403, 403);
  }

  next();
};

module.exports = {
  adminMiddleware,
  superAdminMiddleware,
};
