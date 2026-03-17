const express = require("express");
const router = express.Router();

const TagController = require("../controllers/tagController");
const { validate } = require("../middleware/validator");
const {
  tagIdValidator,
  tagCreateValidator,
  tagUpdateValidator,
  tagQueryValidator,
} = require("../middleware/tagValidator");
const { authMiddleware } = require("../middleware/auth");
const { adminMiddleware } = require("../middleware/permission");

// ===== 公开接口 =====

// 获取标签列表
router.get("/", validate(tagQueryValidator), TagController.getTags);

// ✅ 删除了 /article/:articleId 路由，已移到 article 路由

// ===== 需要认证的接口 =====

// 创建标签（需要管理员权限）
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  tagCreateValidator,
  TagController.createTag,
);

// 更新标签（需要管理员权限）
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate([...tagIdValidator, ...tagUpdateValidator]),
  TagController.updateTag,
);

// 删除标签（需要管理员权限）
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(tagIdValidator),
  TagController.deleteTag,
);

module.exports = router;
