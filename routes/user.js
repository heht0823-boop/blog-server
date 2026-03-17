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
  userProfilePageValidator,
} = require("../middleware/userValidator");
const {
  authMiddleware,
  refreshTokenMiddleware,
  strictAuthMiddleware,
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
// ✅ 改为 strictAuthMiddleware，token 过期返回 401 而非 500
router.post("/logout", strictAuthMiddleware, UserController.logout);
router.get("/me", strictAuthMiddleware, UserController.getCurrentUser);
router.put(
  "/me",
  strictAuthMiddleware,
  validate(updateUserValidator),
  UserController.updateUser,
);
router.put(
  "/me/password",
  strictAuthMiddleware,
  validate(passwordUpdateValidator),
  UserController.updatePassword,
);
router.post("/me/avatar", strictAuthMiddleware, UserController.uploadAvatar);

// ===== 管理员接口 =====
router.get(
  "/",
  strictAuthMiddleware,
  adminMiddleware,
  validate([...paginationValidator, ...searchValidator]),
  UserController.getAllUsers,
);

router.delete(
  "/:id",
  strictAuthMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  UserController.deleteUser,
);

// ===== 用户主页接口（公开访问，可选认证）=====
router.get(
  "/:userId/homepage",
  authMiddleware,
  validate(userProfilePageValidator),
  UserController.getUserProfilePage,
);

module.exports = router;
