const { errorResponse } = require("./errorHandler");

/**
 * 权限检查中间件工厂函数
 * @param {number} requiredRole - 所需角色等级（0-普通用户, 1-管理员）
 * @returns {Function} 中间件函数
 */
const permissionMiddleware = (requiredRole) => {
  return (req, res, next) => {
    // 必须先经过 authMiddleware
    if (!req.user) {
      return errorResponse(res, null, "未认证", 401, 401);
    }

    if (req.user.role < requiredRole) {
      return errorResponse(res, null, "权限不足", 403, 403);
    }

    next();
  };
};

/**
 * 资源所有者检查中间件
 * 检查用户是否是该资源的所有者
 * @param {string} resourceIdParam - 资源 ID 参数名（如 'id', 'userId'）
 * @param {Function} getResourceOwner - 获取资源所有者 ID 的函数
 */
const ownershipMiddleware = (resourceIdParam = "id", getResourceOwner) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "未认证", 401, 401);
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return errorResponse(res, null, "资源 ID 不存在", 400, 400);
      }

      // 获取资源所有者
      const ownerId = await getResourceOwner(resourceId);
      if (!ownerId) {
        return errorResponse(res, null, "资源不存在", 404, 404);
      }

      // 检查是否是所有者或管理员
      if (req.user.id !== ownerId && req.user.role < 1) {
        return errorResponse(res, null, "无权操作此资源", 403, 403);
      }

      // 挂载资源所有者信息
      req.resourceOwnerId = ownerId;

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  permissionMiddleware,
  ownershipMiddleware,
};
