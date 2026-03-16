// middleware/aboutValidator.js
const { body, query, param } = require("express-validator");

exports.createMessage = [
  body("content").trim().notEmpty().withMessage("留言内容不能为空"),
  body("nickname")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("昵称长度不能超过 20 位"),
  body("avatar").optional().trim().isURL().withMessage("头像 URL 格式不正确"),
];

exports.getMessages = [
  query("page").optional().isInt({ min: 1 }).withMessage("页码必须是正整数"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("每页数量必须在 1-100 之间"),
];
// 新增：获取会话列表验证
exports.getChatSessions = [
  query("page").optional().isInt({ min: 1 }).withMessage("页码必须是正整数"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("每页数量必须在 1-50 之间"),
];
exports.deleteMessage = [
  param("id").isInt({ min: 1 }).withMessage("留言 ID 必须是正整数"),
];

exports.createChat = [
  body("session_id").trim().notEmpty().withMessage("会话 ID 不能为空"),
  body("message").trim().notEmpty().withMessage("消息内容不能为空"),
];

exports.getChatHistory = [
  query("session_id").trim().notEmpty().withMessage("会话 ID 不能为空"),
];

exports.clearChatHistory = [
  query("session_id").trim().notEmpty().withMessage("会话 ID 不能为空"),
];
