const express = require("express");
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

module.exports = router;
