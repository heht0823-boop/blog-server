const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const UserController = require("../controllers/userController");
const { handleUpload } = require("../utils/upload");
const { validate } = require("../middleware/validator");
const {
  authMiddleware,
  optionalAuthMiddleware,
  refreshTokenMiddleware,
} = require("../middleware/auth");
const {
  adminMiddleware,
  superAdminMiddleware,
} = require("../middleware/permission");
// 使用 middleware/validator.js 中的验证器
const {
  registerValidator,
  loginValidator,
  passwordUpdateValidator,
} = require("../middleware/validator");

// ===== 速率限制 =====

// 注册速率限制
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10,
  message: "注册次数过多，请稍后再试",
  standardHeaders: true,
  legacyHeaders: false,
});

// 登录速率限制（防止暴力破解）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5,
  message: "登录尝试次数过多，请稍后再试",
  skipSuccessfulRequests: true, // 成功的登录不计入限制
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== 公开接口 =====

// 用户注册
router.post(
  "/register",
  registerLimiter,
  validate(registerValidator),
  UserController.register
);

// 用户登录
router.post(
  "/login",
  loginLimiter,
  validate(loginValidator),
  UserController.login
);

// 刷新 Token
router.post(
  "/refresh-token",
  refreshTokenMiddleware,
  UserController.refreshAccessToken
);

// ===== 需要认证的接口 =====

// 登出
router.post("/logout", authMiddleware, UserController.logout);

// 获取当前用户信息
router.get("/me", authMiddleware, UserController.getCurrentUser);

// 更新用户信息
router.put("/me", authMiddleware, UserController.updateUser);

// 修改密码
router.put(
  "/me/password",
  authMiddleware,
  validate(passwordUpdateValidator),
  UserController.updatePassword
);

// 上传头像
router.post(
  "/me/avatar",
  authMiddleware,
  handleUpload("avatar"),
  UserController.uploadAvatar
);

// ===== 管理员接口 =====

// 获取所有用户
router.get("/", authMiddleware, adminMiddleware, UserController.getAllUsers);

// 获取用户详情
router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  UserController.getUserDetail
);

// 删除用户
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  UserController.deleteUser
);

// 获取用户统计信息
router.get(
  "/stats/all",
  authMiddleware,
  adminMiddleware,
  UserController.getUserStats
);

// ===== 超级管理员接口 =====

// 升级用户为管理员
router.post(
  "/:id/promote",
  authMiddleware,
  superAdminMiddleware,
  UserController.promoteToAdmin
);

// 降级用户为普通用户
router.post(
  "/:id/demote",
  authMiddleware,
  superAdminMiddleware,
  UserController.demoteToUser
);

module.exports = router;
