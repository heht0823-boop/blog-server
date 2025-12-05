const userService = require("../services/userService");
const jwtUtil = require("../utils/jwt");
const {
  successResponse,
  errorResponse,
  asyncHandler,
} = require("../middleware/errorHandler");

class UserController {
  /**
   * 注册
   */
  register = asyncHandler(async (req, res, next) => {
    try {
      const { username, password, nickname } = req.body;

      // 创建用户
      const userId = await userService.createUser({
        username,
        password,
        nickname,
      });

      // 生成 Token
      const tokens = jwtUtil.generateTokenPair({
        id: userId,
        role: 0,
        username,
      });

      successResponse(
        res,
        {
          userId,
          ...tokens,
        },
        "注册成功",
        201
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 登录
   */
  login = asyncHandler(async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // 验证用户
      const user = await userService.verifyUser(username, password);

      if (!user) {
        return errorResponse(res, null, "用户名或密码错误", 401);
      }

      // 生成 Token
      const tokens = jwtUtil.generateTokenPair({
        id: user.id,
        role: user.role,
        username: user.username,
      });

      successResponse(
        res,
        {
          user: {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            role: user.role,
          },
          ...tokens,
        },
        "登录成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 刷新 Token
   */
  refreshAccessToken = asyncHandler(async (req, res, next) => {
    try {
      const tokens = jwtUtil.generateTokenPair({
        id: req.user.id,
        role: req.user.role,
        username: req.user.username,
      });

      successResponse(res, tokens, "Token 已刷新");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 登出
   */
  logout = asyncHandler(async (req, res, next) => {
    try {
      // 前端删除本地 Token 即可，后端无需处理
      successResponse(res, null, "登出成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取当前用户信息
   */
  getCurrentUser = asyncHandler(async (req, res, next) => {
    try {
      const user = await userService.getUserById(req.user.id);

      if (!user) {
        return errorResponse(res, null, "用户不存在", 404);
      }

      successResponse(
        res,
        {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          create_time: user.create_time,
          update_time: user.update_time,
        },
        "获取成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取用户详情（管理员功能）
   */
  getUserDetail = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;

      const user = await userService.getUserById(id);

      if (!user) {
        return errorResponse(res, null, "用户不存在", 404);
      }

      successResponse(
        res,
        {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          create_time: user.create_time,
          update_time: user.update_time,
        },
        "获取成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取用户资料（自己或管理员）
   */
  getUserProfile = asyncHandler(async (req, res, next) => {
    try {
      const { userId } = req.params;

      const user = await userService.getUserById(userId);

      if (!user) {
        return errorResponse(res, null, "用户不存在", 404);
      }

      successResponse(
        res,
        {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          create_time: user.create_time,
        },
        "获取成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 更新用户信息
   */
  updateUser = asyncHandler(async (req, res, next) => {
    try {
      const { nickname, avatar } = req.body;

      const updated = await userService.updateUser(req.user.id, {
        nickname,
        avatar,
      });

      if (updated === 0) {
        return errorResponse(res, null, "没有需要更新的字段", 400);
      }

      const user = await userService.getUserById(req.user.id);

      successResponse(
        res,
        {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          update_time: user.update_time,
        },
        "更新成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 更新用户密码
   */
  updatePassword = asyncHandler(async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;

      const updated = await userService.updatePassword(
        req.user.id,
        oldPassword,
        newPassword
      );

      if (!updated) {
        return errorResponse(res, null, "密码更新失败", 400);
      }

      successResponse(res, null, "密码更新成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取所有用户（管理员功能）
   */
  getAllUsers = asyncHandler(async (req, res, next) => {
    try {
      const { page = 1, pageSize = 10, role } = req.query;

      const result = await userService.getAllUsers(
        parseInt(page),
        parseInt(pageSize),
        role !== undefined ? parseInt(role) : undefined
      );

      successResponse(
        res,
        {
          total: result.total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          users: result.users.map((user) => ({
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            role: user.role,
            create_time: user.create_time,
          })),
        },
        "获取成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取用户统计信息（管理员功能）
   */
  getUserStats = asyncHandler(async (req, res, next) => {
    try {
      const stats = await userService.getUserStats();

      successResponse(res, stats, "获取成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 删除用户（管理员功能）
   */
  deleteUser = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;

      // 防止自己删除自己
      if (parseInt(id) === req.user.id) {
        return errorResponse(res, null, "不能删除自己", 400);
      }

      const deleted = await userService.deleteUser(id);

      if (!deleted) {
        return errorResponse(res, null, "用户不存在", 404);
      }

      successResponse(res, null, "删除成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 升级用户为管理员（管理员功能）
   */
  promoteToAdmin = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;

      // 防止升级自己
      if (parseInt(id) === req.user.id) {
        return errorResponse(res, null, "不能升级自己", 400);
      }

      const promoted = await userService.promoteToAdmin(id);

      if (!promoted) {
        return errorResponse(res, null, "用户不存在或已是管理员", 404);
      }

      successResponse(res, null, "升级成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 降级用户为普通用户（管理员功能）
   */
  demoteToUser = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;

      // 防止降级自己
      if (parseInt(id) === req.user.id) {
        return errorResponse(res, null, "不能降级自己", 400);
      }

      const demoted = await userService.demoteToUser(id);

      if (!demoted) {
        return errorResponse(res, null, "用户不存在或不是管理员", 404);
      }

      successResponse(res, null, "降级成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 上传头像（可选功能）
   */
  uploadAvatar = asyncHandler(async (req, res, next) => {
    try {
      if (!req.file) {
        return errorResponse(res, null, "未上传文件", 400);
      }

      const avatarUrl = `/uploads/${req.file.filename}`;

      const updated = await userService.updateUser(req.user.id, {
        avatar: avatarUrl,
      });

      if (updated === 0) {
        return errorResponse(res, null, "更新失败", 400);
      }

      successResponse(res, { avatar: avatarUrl }, "上传成功", 201);
    } catch (err) {
      next(err);
    }
  });
}

module.exports = new UserController();
