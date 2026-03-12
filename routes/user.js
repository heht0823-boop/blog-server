// routes/user.js
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
  userProfilePageValidator, // 新增导入
} = require("../middleware/userValidator");
const {
  authMiddleware,
  refreshTokenMiddleware,
} = require("../middleware/auth");
const { adminMiddleware } = require("../middleware/permission");

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
router.post(
  "/register",
  registerLimiter,
  validate(registerValidator),
  UserController.register,
);

router.post(
  "/login",
  loginLimiter,
  validate(loginValidator),
  UserController.login,
);

router.post(
  "/refresh-token",
  refreshTokenMiddleware,
  UserController.refreshAccessToken,
);

// ===== 需要认证的接口 =====
router.post("/logout", authMiddleware, UserController.logout);
router.get("/me", authMiddleware, UserController.getCurrentUser);
router.put(
  "/me",
  authMiddleware,
  validate(updateUserValidator),
  UserController.updateUser,
);
router.put(
  "/me/password",
  authMiddleware,
  validate(passwordUpdateValidator),
  UserController.updatePassword,
);
router.post("/me/avatar", authMiddleware, UserController.uploadAvatar);

// ===== 管理员接口 =====
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  validate([...paginationValidator, ...searchValidator]),
  UserController.getAllUsers,
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  UserController.deleteUser,
);

// ===== 用户主页接口（公开访问）=====
router.get(
  "/:userId/homepage",
  validate(userProfilePageValidator),
  UserController.getUserProfilePage,
);

module.exports = router;
