const express = require("express");
const { validate } = require("../middleware/validator");
const { authMiddleware, strictAuthMiddleware } = require("../middleware/auth");
const { adminMiddleware } = require("../middleware/permission");
const {
  createMessage,
  getMessages,
  deleteMessage,
  createChat,
  getChatHistory,
  clearChatHistory,
} = require("../controllers/aboutController");

const router = express.Router();

// ===== 留言相关接口 =====
// 创建留言（可选认证，游客可留言）
router.post(
  "/message",
  authMiddleware,
  validate("createMessage"),
  createMessage,
);
// 获取留言列表（公开）
router.get("/message", validate("getMessages"), getMessages);
// 删除留言（需要管理员权限）
router.delete(
  "/message/:id",
  strictAuthMiddleware,
  adminMiddleware,
  deleteMessage,
);

// ===== AI 对话相关接口 =====
// AI 对话（必须登录）
router.post(
  "/ai/chat",
  strictAuthMiddleware,
  validate("createChat"),
  createChat,
);
// 获取对话历史（必须登录，只能查看自己的）
router.get(
  "/ai/chat/history",
  strictAuthMiddleware,
  validate("getChatHistory"),
  getChatHistory,
);
// 清空对话历史（必须登录，只能清空自己的）
router.delete(
  "/ai/chat/history",
  strictAuthMiddleware,
  validate("clearChatHistory"),
  clearChatHistory,
);

module.exports = router;
