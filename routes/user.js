const express = require("express");
const { handleUpload } = require("../utils/upload");
const router = express.Router();
const {
  UserController,
  registerValidator,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

// 公开接口
router.post("/register", registerValidator, UserController.register);
router.post("/login", UserController.login);

// 需登录接口（auth中间件验证Token）
router.get("/me", authMiddleware, UserController.getCurrentUser);
router.put("/me", authMiddleware, UserController.updateUser);
// 新增：密码更新（需登录）
router.put(
  "/me/password",
  authMiddleware,
  passwordUpdateValidator,
  UserController.updatePassword
);

// 新增：头像上传（需登录）
router.post(
  "/me/avatar",
  authMiddleware,
  handleUpload("avatar"), // 接收form-data中name为avatar的文件
  UserController.uploadAvatar
);

module.exports = router;
