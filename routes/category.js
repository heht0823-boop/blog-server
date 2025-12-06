const express = require("express");
const router = express.Router();

const CategoryController = require("../controllers/categoryController");
const { validate } = require("../middleware/validator");
const {
  categoryIdValidator,
  categoryCreateValidator,
  categoryUpdateValidator,
  categoryQueryValidator,
} = require("../middleware/categoryValidator");
const { authMiddleware } = require("../middleware/auth");
const { adminMiddleware } = require("../middleware/permission");

// ===== 公开接口 =====

// 获取分类列表
router.get(
  "/",
  validate(categoryQueryValidator),
  CategoryController.getCategories
);

// 获取所有分类
router.get("/all", CategoryController.getAllCategories);

// 获取单个分类
router.get("/:id", validate(categoryIdValidator), CategoryController.getCategory);

// ===== 需要认证的接口 =====

// 创建分类（需要管理员权限）
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  validate(categoryCreateValidator),
  CategoryController.createCategory
);

// 更新分类（需要管理员权限）
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate([...categoryIdValidator, ...categoryUpdateValidator]),
  CategoryController.updateCategory
);

// 删除分类（需要管理员权限）
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(categoryIdValidator),
  CategoryController.deleteCategory
);

module.exports = router;