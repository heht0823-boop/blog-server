const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const UserController = require("../controllers/userController");
const {
  validate,
  registerValidator,
  loginValidator,
  passwordUpdateValidator,
  updateUserValidator,
  userIdValidator,
  paginationValidator,
} = require("../middleware/validator");
const {
  authMiddleware,
  refreshTokenMiddleware,
} = require("../middleware/auth");
const {
  adminMiddleware,
  selfOrAdminMiddleware,
} = require("../middleware/permission");

// ===== 速率限制 =====

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10, // 最多 10 次
  message: "注册次数过多，请稍后再试",
  standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` 标头中
  legacyHeaders: false, // 禁用 `X-RateLimit-*` 标头
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5, // 最多 5 次失败登录
  message: "登录尝试次数过多，请稍后再试",
  skipSuccessfulRequests: true, // 成功请求不计数
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

// 更新当前用户信息
router.put(
  "/me",
  authMiddleware,
  validate(updateUserValidator),
  UserController.updateUser
);

// 修改密码
router.put(
  "/me/password",
  authMiddleware,
  validate(passwordUpdateValidator),
  UserController.updatePassword
);

// 获取用户资料（自己或管理员）
router.get(
  "/:userId/profile",
  authMiddleware,
  selfOrAdminMiddleware("userId"),
  UserController.getUserProfile
);

// ===== 管理员接口 =====

// 获取所有用户（需要管理员权限）
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  validate(paginationValidator),
  UserController.getAllUsers
);

// 获取特定用户详情（需要管理员权限）
router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  UserController.getUserDetail
);

// 获取用户统计（需要管理员权限）
router.get(
  "/stats/all",
  authMiddleware,
  adminMiddleware,
  UserController.getUserStats
);

// 删除用户（需要管理员权限）
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  UserController.deleteUser
);

// 升级用户为管理员（需要管理员权限）
router.post(
  "/:id/promote",
  authMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  UserController.promoteToAdmin
);

// 降级用户为普通用户（需要管理员权限）
router.post(
  "/:id/demote",
  authMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  UserController.demoteToUser
);

module.exports = router;
