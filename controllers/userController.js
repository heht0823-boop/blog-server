const userService = require("../services/userService");
const jwtUtil = require("../utils/jwt");
const { upload } = require("../utils/upload");
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
    const { username, password, nickname } = req.body;

    const userId = await userService.createUser({
      username,
      password,
      nickname,
    });

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
  });

  /**
   * 登录
   */
  login = asyncHandler(async (req, res, next) => {
    const { username, password } = req.body;

    const user = await userService.verifyUser(username, password);

    if (!user) {
      return errorResponse(res, null, "用户名或密码错误", 401);
    }

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
  });

  /**
   * 刷新 Token
   */
  refreshAccessToken = asyncHandler(async (req, res, next) => {
    const tokens = jwtUtil.generateTokenPair({
      id: req.user.id,
      role: req.user.role,
      username: req.user.username,
    });

    successResponse(res, tokens, "Token 已刷新");
  });

  /**
   * 登出
   */
  logout = asyncHandler(async (req, res, next) => {
    successResponse(res, null, "登出成功");
  });

  /**
   * 获取当前用户信息
   */
  getCurrentUser = asyncHandler(async (req, res, next) => {
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
  });

  /**
   * 获取用户详情（管理员功能）
   */
  getUserDetail = asyncHandler(async (req, res, next) => {
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
  });

  /**
   * 获取用户资料（自己或管理员）
   */
  getUserProfile = asyncHandler(async (req, res, next) => {
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
  });

  /**
   * 更新用户信息
   */
  updateUser = asyncHandler(async (req, res, next) => {
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
  });

  /**
   * 更新用户密码
   */
  updatePassword = asyncHandler(async (req, res, next) => {
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
  });

  /**
   * 获取所有用户（管理员功能）
   */
  getAllUsers = asyncHandler(async (req, res, next) => {
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
  });

  /**
   * 获取用户统计信息（管理员功能）
   */
  getUserStats = asyncHandler(async (req, res, next) => {
    const stats = await userService.getUserStats();

    successResponse(res, stats, "获取成功");
  });

  /**
   * 删除用户（管理员功能）
   */
  deleteUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return errorResponse(res, null, "不能删除自己", 400);
    }

    const deleted = await userService.deleteUser(id);

    if (!deleted) {
      return errorResponse(res, null, "用户不存在", 404);
    }

    successResponse(res, null, "删除成功");
  });
  /**
   * 管理员重置用户密码
   */
  resetUserPassword = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      // 检查目标用户是否存在
      const user = await userService.getUserById(id);
      if (!user) {
        return errorResponse(res, null, "用户不存在", 404);
      }

      // 管理员不能重置自己的密码（避免意外操作）
      if (parseInt(id) === req.user.id) {
        return errorResponse(
          res,
          null,
          "不能重置自己的密码，请使用修改密码接口",
          400
        );
      }

      // 重置密码
      await userService.resetPasswordByAdmin(id, newPassword);

      successResponse(res, null, "密码重置成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 升级用户为管理员（管理员功能）
   */
  promoteToAdmin = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return errorResponse(res, null, "不能升级自己", 400);
    }

    const promoted = await userService.promoteToAdmin(id);

    if (!promoted) {
      return errorResponse(res, null, "用户不存在或已是管理员", 404);
    }

    successResponse(res, null, "升级成功");
  });

  /**
   * 降级用户为普通用户（管理员功能）
   */
  demoteToUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return errorResponse(res, null, "不能降级自己", 400);
    }

    const demoted = await userService.demoteToUser(id);

    if (!demoted) {
      return errorResponse(res, null, "用户不存在或不是管理员", 404);
    }

    successResponse(res, null, "降级成功");
  });

  /**
   * 上传头像
   */
  uploadAvatar = asyncHandler(async (req, res, next) => {
    // 使用 multer 处理文件上传
    upload.single("avatar")(req, res, async (err) => {
      if (err) {
        return errorResponse(res, err, err.message, 400);
      }

      if (!req.file) {
        return errorResponse(res, null, "请选择文件", 400);
      }

      // 构建文件访问URL
      const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;

      // 更新用户头像
      const updated = await userService.updateUser(req.user.id, {
        avatar: avatarUrl,
      });

      if (updated === 0) {
        return errorResponse(res, null, "头像更新失败", 400);
      }

      successResponse(res, { avatar: avatarUrl }, "头像上传成功");
    });
  });
}

module.exports = new UserController();
