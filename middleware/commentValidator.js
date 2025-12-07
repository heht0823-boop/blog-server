// middleware/commentValidator.js
const { body, param, query } = require("express-validator");

// ===== 评论 ID 参数验证 =====
const commentIdValidator = [
  param("id")
    .exists()
    .withMessage("评论 ID 不能为空")
    .isInt({ min: 1 })
    .withMessage("评论 ID 必须是正整数")
    .toInt(),
];

// ===== 评论创建验证 =====
const commentCreateValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("评论内容不能为空")
    .isLength({ min: 1, max: 500 })
    .withMessage("评论内容长度 1-500 位"),

  body("articleId")
    .exists()
    .withMessage("文章 ID 不能为空")
    .isInt({ min: 1 })
    .withMessage("文章 ID 必须是正整数")
    .toInt(),

  body("parentId")
    .optional()
    .isInt({ min: 0 })
    .withMessage("父评论 ID 必须是非负整数")
    .toInt(),
];

// ===== 回复评论验证 =====
const commentReplyValidator = [
  param("id")
    .exists()
    .withMessage("评论 ID 不能为空")
    .isInt({ min: 1 })
    .withMessage("评论 ID 必须是正整数")
    .toInt(),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("回复内容不能为空")
    .isLength({ min: 1, max: 500 })
    .withMessage("回复内容长度 1-500 位"),

  body("articleId")
    .exists()
    .withMessage("文章 ID 不能为空")
    .isInt({ min: 1 })
    .withMessage("文章 ID 必须是正整数")
    .toInt(),
];

// ===== 获取文章评论验证 =====
const articleCommentQueryValidator = [
  param("articleId")
    .exists()
    .withMessage("文章 ID 不能为空")
    .isInt({ min: 1 })
    .withMessage("文章 ID 必须是正整数")
    .toInt(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("页码必须是正整数")
    .toInt(),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("每页条数必须在 1-100 之间")
    .toInt(),
];

module.exports = {
  commentIdValidator,
  commentCreateValidator,
  commentReplyValidator,
  articleCommentQueryValidator,
};