const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const UserController = require("../controllers/userController");
const { validate } = require("../middleware/validator");
const {
  registerValidator,
  loginValidator,
  passwordUpdateValidator,
  updateUserValidator,
  userIdValidator,
  paginationValidator,
  searchValidator,
  roleUpdateValidator,
} = require("../middleware/userValidator"); // 修改这里
const {
  authMiddleware,
  refreshTokenMiddleware,
} = require("../middleware/auth");
const {
  adminMiddleware,
  loggedInUserAccessMiddleware,
} = require("../middleware/permission");

// ===== 速率限制 =====

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "注册次数过多，请稍后再试",
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "登录尝试次数过多，请稍后再试",
  skipSuccessfulRequests: true,
});

// ===== 公开接口 =====

// 用户注册
router.post(
  "/register",
  registerLimiter,
  validate(registerValidator),
  UserController.register,
);

// 用户登录
router.post(
  "/login",
  loginLimiter,
  validate(loginValidator),
  UserController.login,
);

// 刷新 Token
router.post(
  "/refresh-token",
  refreshTokenMiddleware,
  UserController.refreshAccessToken,
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
  UserController.updateUser,
);

// 修改密码
router.put(
  "/me/password",
  authMiddleware,
  validate(passwordUpdateValidator),
  UserController.updatePassword,
);
// 获取用户资料（已登录用户可互访）
router.get(
  "/:userId/profile",
  authMiddleware,
  loggedInUserAccessMiddleware, // 替换原来的 selfOrAdminMiddleware
  UserController.getUserProfile,
);

// 上传头像
router.post("/me/avatar", authMiddleware, UserController.uploadAvatar);

// ===== 管理员接口 =====

// 获取所有用户
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  validate([...paginationValidator, ...searchValidator]), // 合并校验规则
  UserController.getAllUsers,
);

// 获取特定用户详情
router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  UserController.getUserDetail,
);

// 获取用户统计
router.get(
  "/stats/all",
  authMiddleware,
  adminMiddleware,
  UserController.getUserStats,
);
// 修改用户角色（支持升级/降级）
router.patch(
  "/:id/role",
  authMiddleware,
  adminMiddleware,
  validate(roleUpdateValidator),
  UserController.updateUserRole,
);

// 删除用户
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  UserController.deleteUser,
);
module.exports = router;
