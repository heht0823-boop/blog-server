const { AuthenticationError, AuthorizationError } = require("./errorHandler");

const ROLE_LEVELS = {
  USER: 0,
  ADMIN: 1,
};

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError("未认证");
    }

    if (req.user.role < requiredRole) {
      const roleNames = { 0: "普通用户", 1: "管理员" };
      const error = new AuthorizationError(
        `权限不足，需要 ${roleNames[requiredRole]} 权限`
      );
      throw error;
    }

    next();
  };
};

const adminMiddleware = requireRole(ROLE_LEVELS.ADMIN);

const selfOrAdminMiddleware = (userIdParam = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError("未认证");
    }

    const targetUserId = parseInt(req.params[userIdParam]);

    if (isNaN(targetUserId) || targetUserId <= 0) {
      const error = new Error("无效的用户 ID");
      error.statusCode = 400;
      throw error;
    }

    if (req.user.id !== targetUserId && req.user.role < ROLE_LEVELS.ADMIN) {
      throw new AuthorizationError("无权访问他人的数据");
    }

    next();
  };
};

module.exports = {
  ROLE_LEVELS,
  requireRole,
  adminMiddleware,
  selfOrAdminMiddleware,
};
