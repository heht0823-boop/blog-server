const userService = require("../services/userService");
const jwtUtil = require("../utils/jwt");
const {
  successResponse,
  errorResponse,
} = require("../middleware/errorHandler");

class UserController {
  /**
   * 用户注册
   */
  async register(req, res, next) {
    try {
      const { username, password, nickname } = req.body;

      // 创建用户
      const userId = await userService.createUser({
        username,
        password,
        nickname,
      });

      // 获取新用户信息
      const user = await userService.getUserById(userId);

      successResponse(res, user, "注册成功", 200);
    } catch (err) {
      // 处理特定的验证错误
      if (err.message === "用户名已存在") {
        return errorResponse(res, err, err.message, 409, 409);
      }
      next(err);
    }
  }

  /**
   * 用户登录
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // 验证用户（检查用户名和密码）
      const user = await userService.verifyUser(username, password);
      if (!user) {
        // 记录失败日志
        await userService.logLoginAttempt(null, false, req.ip);
        return errorResponse(res, null, "用户名或密码错误", 401, 401);
      }

      // 检查账户是否被锁定
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        return errorResponse(res, null, "账户已被锁定，请稍后再试", 429, 429);
      }

      // 记录成功登录
      await userService.logLoginAttempt(user.id, true, req.ip);

      // 生成 Token 对
      const { accessToken, refreshToken } = jwtUtil.generateTokenPair({
        id: user.id,
        role: user.role,
      });

      // 可选：将 refreshToken 存储在 HttpOnly Cookie 中
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      });

      // 返回用户信息和 Token
      successResponse(
        res,
        {
          user,
          accessToken,
          refreshToken, // 也在 body 中返回（可选）
          expiresIn: 3600, // 1小时（秒）
        },
        "登录成功",
        200
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * 刷新 Token
   */
  async refreshAccessToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return errorResponse(res, null, "未提供 refresh token", 400, 400);
      }

      // 刷新 Token 对
      const { accessToken, refreshToken: newRefreshToken } =
        jwtUtil.refreshTokenPair(refreshToken);

      // 更新 Cookie
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      successResponse(
        res,
        {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 3600,
        },
        "Token 刷新成功",
        200
      );
    } catch (err) {
      if (err.message.includes("过期") || err.message.includes("无效")) {
        return errorResponse(res, err, "请重新登录", 401, 401);
      }
      next(err);
    }
  }

  /**
   * 登出
   */
  async logout(req, res, next) {
    try {
      // 清除 Cookie
      res.clearCookie("refreshToken");

      // 可选：将当前 Token 加入黑名单
      // const token = req.headers.authorization?.split(" ")[1];
      // if (token) {
      //   await tokenBlacklistService.add(token);
      // }

      successResponse(res, null, "登出成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      if (!user) {
        return errorResponse(res, null, "用户不存在", 404, 404);
      }

      successResponse(res, user, "获取用户信息成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(req, res, next) {
    try {
      const { nickname, avatar } = req.body;

      await userService.updateUser(req.user.id, { nickname, avatar });

      const user = await userService.getUserById(req.user.id);
      successResponse(res, user, "用户信息更新成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 修改密码
   */
  async updatePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;

      await userService.updatePassword(req.user.id, oldPassword, newPassword);

      // 修改密码后应该重新登录
      res.clearCookie("refreshToken");

      successResponse(res, null, "密码修改成功，请重新登录", 200);
    } catch (err) {
      if (err.message.includes("旧密码错误")) {
        return errorResponse(res, err, err.message, 400, 400);
      }
      if (err.message.includes("相同")) {
        return errorResponse(res, err, err.message, 400, 400);
      }
      next(err);
    }
  }

  /**
   * 上传头像
   */
  async uploadAvatar(req, res, next) {
    try {
      if (!req.uploadFile) {
        return errorResponse(res, null, "文件上传失败", 400, 400);
      }

      await userService.updateUser(req.user.id, {
        avatar: req.uploadFile.url,
      });

      const user = await userService.getUserById(req.user.id);
      successResponse(res, user, "头像上传成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取所有用户（管理员）
   */
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, pageSize = 10, role } = req.query;

      const result = await userService.getAllUsers(
        parseInt(page),
        parseInt(pageSize),
        role ? parseInt(role) : undefined
      );

      successResponse(res, result, "获取用户列表成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取用户详情（管理员）
   */
  async getUserDetail(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      if (!user) {
        return errorResponse(res, null, "用户不存在", 404, 404);
      }

      successResponse(res, user, "获取用户详情成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 删除用户（管理员）
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      // 防止删除自己
      if (parseInt(id) === req.user.id) {
        return errorResponse(res, null, "不能删除自己", 400, 400);
      }

      const success = await userService.deleteUser(id);
      if (!success) {
        return errorResponse(res, null, "用户不存在或已删除", 404, 404);
      }

      successResponse(res, null, "用户删除成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 获取用户统计信息（管理员）
   */
  async getUserStats(req, res, next) {
    try {
      const stats = await userService.getUserStats();
      successResponse(res, stats, "获取统计信息成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 升级用户为管理员（超级管理员）
   */
  async promoteToAdmin(req, res, next) {
    try {
      const { id } = req.params;

      const success = await userService.promoteToAdmin(id);
      if (!success) {
        return errorResponse(res, null, "升级失败", 400, 400);
      }

      const user = await userService.getUserById(id);
      successResponse(res, user, "升级为管理员成功", 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * 降级用户为普通用户（超级管理员）
   */
  async demoteToUser(req, res, next) {
    try {
      const { id } = req.params;

      const success = await userService.demoteToUser(id);
      if (!success) {
        return errorResponse(res, null, "降级失败", 400, 400);
      }

      const user = await userService.getUserById(id);
      successResponse(res, user, "降级为普通用户成功", 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
