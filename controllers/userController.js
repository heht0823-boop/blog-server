const userService = require("../services/userService");
const { generateToken } = require("../utils/jwt");
const {
  successResponse,
  errorResponse,
} = require("../middleware/errorHandler");
const { body, validationResult } = require("express-validator");

// 参数校验规则
const registerValidator = [
  body("username")
    .notEmpty()
    .withMessage("用户名不能为空")
    .isLength({ min: 2, max: 20 })
    .withMessage("用户名长度2-20位"),
  body("password").isLength({ min: 6 }).withMessage("密码至少6位"),
];

// 补充参数校验规则
const passwordUpdateValidator = [
  body("oldPassword").notEmpty().withMessage("旧密码不能为空"),
  body("newPassword").isLength({ min: 6 }).withMessage("新密码至少6位"),
];

class UserController {
  // 注册
  async register(req, res, next) {
    try {
      // 校验参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) return next(errors);

      const { username, password, nickname } = req.body;
      // 检查用户名是否已存在
      const existingUser = await userService.getUserByUsername(username);
      if (existingUser) return errorResponse(res, null, "用户名已存在", 400);

      // 创建用户
      const userId = await userService.createUser({
        username,
        password,
        nickname,
      });
      const user = await userService.getUserById(userId);
      successResponse(res, user, "注册成功");
    } catch (err) {
      next(err);
    }
  }

  // 登录
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const user = await userService.verifyUser(username, password);
      if (!user) return errorResponse(res, null, "账号或密码错误", 400);

      // 生成Token
      const token = generateToken({ id: user.id, role: user.role });
      successResponse(res, { user, token }, "登录成功");
    } catch (err) {
      next(err);
    }
  }

  // 获取当前用户信息
  async getCurrentUser(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id); // req.user由auth中间件挂载
      if (!user) return errorResponse(res, null, "用户不存在", 404);
      successResponse(res, user, "获取用户信息成功");
    } catch (err) {
      next(err);
    }
  }

  // 更新用户信息
  async updateUser(req, res, next) {
    try {
      const { nickname, avatar } = req.body;
      const affectedRows = await userService.updateUser(req.user.id, {
        nickname,
        avatar,
      });
      if (affectedRows === 0)
        return errorResponse(res, null, "无更新内容", 400);

      const updatedUser = await userService.getUserById(req.user.id);
      successResponse(res, updatedUser, "更新用户信息成功");
    } catch (err) {
      next(err);
    }
  }
  // 新增：密码更新接口
  async updatePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const success = await userService.updatePassword(
        req.user.id,
        oldPassword,
        newPassword
      );
      if (!success) return errorResponse(res, null, "旧密码错误", 400);
      successResponse(res, null, "密码更新成功");
    } catch (err) {
      next(err);
    }
  }

  // 新增：头像上传接口
  async uploadAvatar(req, res, next) {
    try {
      // 调用文件上传中间件后，req.uploadFile已存在
      const { url } = req.uploadFile;
      // 更新用户头像
      await userService.updateUser(req.user.id, { avatar: url });
      successResponse(res, { avatar: url }, "头像上传成功");
    } catch (err) {
      next(err);
    }
  }
}
module.exports = {
  UserController: new UserController(),
  registerValidator,
  passwordUpdateValidator,
};
