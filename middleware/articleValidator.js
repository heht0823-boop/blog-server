// middleware/articleValidator.js
const { body, param, query } = require("express-validator");

// ===== 文章 ID 参数验证 =====
const articleIdValidator = [
  param("id")
    .exists()
    .withMessage("文章 ID 不能为空")
    .isInt({ min: 1 })
    .withMessage("文章 ID 必须是正整数")
    .toInt(), // 确保转换为整数
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

  body("cover").optional().trim().isURL().withMessage("封面 URL 格式不正确"),
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

  body("cover").optional().trim().isURL().withMessage("封面 URL 格式不正确"),

  body("isTop")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("置顶状态必须是 0 或 1"),
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

// ===== 文章标签验证 =====
const articleTagValidator = [
  body("tagIds")
    .exists()
    .withMessage("标签ID不能为空")
    .isArray({ min: 1 })
    .withMessage("标签ID必须是数组且至少包含一个元素")
    .custom((value) => {
      for (let i = 0; i < value.length; i++) {
        if (!Number.isInteger(value[i]) || value[i] <= 0) {
          throw new Error("每个标签ID必须是正整数");
        }
      }
      return true;
    }),
];

module.exports = {
  articleIdValidator,
  articleCreateValidator,
  articleUpdateValidator,
  articleQueryValidator,
  articleSearchValidator,
  articleTagValidator,
};
