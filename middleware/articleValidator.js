// middleware/articleValidator.js
const { body, param, query } = require("express-validator");

// ===== 文章 ID 参数验证 =====
const articleIdValidator = [
  param("id").isInt({ min: 1 }).withMessage("文章 ID 必须是正整数"),
];

// ===== 文章创建验证 =====
const articleCreateValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("文章标题不能为空")
    .isLength({ min: 1, max: 100 })
    .withMessage("文章标题长度 1-100 位"),

  body("content").trim().notEmpty().withMessage("文章内容不能为空"),

  body("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("分类 ID 必须是正整数"),

  body("status")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("状态值必须是 0 或 1"),

  body("tags").optional().isArray().withMessage("标签必须是数组格式"),
];

// ===== 文章更新验证 =====
const articleUpdateValidator = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("文章标题长度 1-100 位"),

  body("content").optional().trim(),

  body("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("分类 ID 必须是正整数"),

  body("status")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("状态值必须是 0 或 1"),

  body("tags").optional().isArray().withMessage("标签必须是数组格式"),
];

// ===== 文章查询验证 =====
const articleQueryValidator = [
  query("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("分类 ID 必须是正整数")
    .toInt(),

  query("tagId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("标签 ID 必须是正整数")
    .toInt(),

  query("status")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("状态值必须是 0 或 1")
    .toInt(),
];

// ===== 文章搜索验证 =====
const articleSearchValidator = [
  query("keyword")
    .trim()
    .notEmpty()
    .withMessage("搜索关键词不能为空")
    .isLength({ min: 1, max: 50 })
    .withMessage("搜索关键词长度应在1-50个字符之间"),
];

module.exports = {
  articleIdValidator,
  articleCreateValidator,
  articleUpdateValidator,
  articleQueryValidator,
  articleSearchValidator,
};
