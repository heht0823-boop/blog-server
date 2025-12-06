// middleware/categoryValidator.js
const { body, param, query } = require("express-validator");
const categoryService = require("../services/category");

// ===== 分类 ID 参数验证 =====
const categoryIdValidator = [
  param("id").isInt({ min: 1 }).withMessage("分类 ID 必须是正整数"),
];

// ===== 分类创建验证 =====
const categoryCreateValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("分类名称不能为空")
    .isLength({ min: 1, max: 20 })
    .withMessage("分类名称长度 1-20 位")
    .custom(async (value) => {
      // 检查分类名称是否已存在
      const existingCategory = await categoryService.getCategoryByName(value);
      if (existingCategory) {
        throw new Error("分类名称已存在");
      }
      return true;
    }),
  
  body("sort")
    .optional()
    .isInt({ min: 0 })
    .withMessage("排序值必须是非负整数"),
];

// ===== 分类更新验证 =====
const categoryUpdateValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("分类名称长度 1-20 位")
    .custom(async (value, { req }) => {
      // 检查更新的分类名称是否与其他分类冲突
      if (value) {
        const existingCategory = await categoryService.getCategoryByName(value);
        if (existingCategory && existingCategory.id != req.params.id) {
          throw new Error("分类名称已存在");
        }
      }
      return true;
    }),

  body("sort")
    .optional()
    .isInt({ min: 0 })
    .withMessage("排序值必须是非负整数"),
];

// ===== 分类查询验证 =====
const categoryQueryValidator = [
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
  categoryIdValidator,
  categoryCreateValidator,
  categoryUpdateValidator,
  categoryQueryValidator,
};