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
  getChatSessions,
  clearChatHistory,
} = require("../controllers/aboutController");

const router = express.Router();

// ===== 留言相关接口 =====
// 创建留言（必须登录）
router.post(
  "/message",
  strictAuthMiddleware,
  validate("createMessage"),
  createMessage,
);

// 获取留言列表（✅ 可选认证，所有人都可查看所有留言）
router.get(
  "/message",
  authMiddleware, // ✅ 改为可选认证
  validate("getMessages"),
  getMessages,
);

// 删除留言（必须登录，普通用户只删自己的，管理员可删所有）
router.delete(
  "/message/:id",
  strictAuthMiddleware,
  validate("deleteMessage"),
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
// ✅ 新增：获取 AI 会话列表（用于历史记录列表展示）
router.get(
  "/ai/chat/sessions",
  strictAuthMiddleware,
  validate("getChatSessions"),
  getChatSessions,
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
