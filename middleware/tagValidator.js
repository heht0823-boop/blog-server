// middleware/tagValidator.js
const { body, param, query } = require("express-validator");
const tagService = require("../services/tagService");

// ===== 标签 ID 参数验证 =====
const tagIdValidator = [
  param("id").isInt({ min: 1 }).withMessage("标签 ID 必须是正整数"),
];

// ===== 文章 ID 参数验证（用于获取文章标签）=====
const articleTagsValidator = [
  param("articleId")
    .exists()
    .withMessage("文章 ID 不能为空")
    .isInt({ min: 1 })
    .withMessage("文章 ID 必须是正整数")
    .toInt(),
];

// ===== 标签创建验证（支持批量）=====
const tagCreateValidator = (req, res, next) => {
  const data = req.body;

  // 如果是数组（批量创建）
  if (Array.isArray(data)) {
    for (const [index, tag] of data.entries()) {
      if (!tag.name || typeof tag.name !== "string" || tag.name.trim() === "") {
        return next(new Error(`第${index + 1}个标签名称不能为空`));
      }
      if (tag.name.trim().length > 20) {
        return next(new Error(`第${index + 1}个标签名称长度不能超过20位`));
      }
    }
  } else {
    // 单个创建
    if (
      !data.name ||
      typeof data.name !== "string" ||
      data.name.trim() === ""
    ) {
      return next(new Error("标签名称不能为空"));
    }
    if (data.name.trim().length > 20) {
      return next(new Error("标签名称长度不能超过20位"));
    }
  }

  next();
};

// ===== 标签更新验证 =====
const tagUpdateValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("标签名称长度 1-20 位")
    .custom(async (value, { req }) => {
      // 检查更新的标签名称是否与其他标签冲突
      if (value) {
        const existingTag = await tagService.getTagByName(value);
        if (existingTag && existingTag.id != req.params.id) {
          throw new Error("标签名称已存在");
        }
      }
      return true;
    }),
];

// ===== 标签查询验证 =====
const tagQueryValidator = [
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
  tagIdValidator,
  tagCreateValidator,
  tagUpdateValidator,
  tagQueryValidator,
  articleTagsValidator,
};
