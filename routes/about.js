const express = require("express");
const { validate } = require("../middleware/validator");
const { strictAuthMiddleware } = require("../middleware/auth");
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

// ===== 留言相关接口（全部需要登录）=====
// 创建留言（必须登录）
router.post(
  "/message",
  strictAuthMiddleware,
  validate("createMessage"),
  createMessage,
);

// 获取留言列表（必须登录，普通用户获取自己的，管理员获取全部）
router.get(
  "/message",
  strictAuthMiddleware,
  validate("getMessages"),
  getMessages,
);

// 删除留言（必须登录，只有留言所有者或管理员可删除）
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
