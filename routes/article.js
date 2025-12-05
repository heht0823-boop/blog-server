const express = require("express");
const router = express.Router();

const ArticleController = require("../controllers/articleController");
const {
  validate,
  userIdValidator,
  paginationValidator,
} = require("../middleware/validator");
const {
  authMiddleware,
} = require("../middleware/auth");
const {
  adminMiddleware,
} = require("../middleware/permission");

// ===== 公开接口 =====

// 获取文章列表
router.get(
  "/",
  validate(paginationValidator),
  ArticleController.getArticles
);

// 获取文章详情
router.get(
  "/:id",
  validate(userIdValidator),
  ArticleController.getArticle
);

// 搜索文章
router.get(
  "/search",
  validate(paginationValidator),
  ArticleController.searchArticles
);

// ===== 需要认证的接口 =====

// 创建文章
router.post(
  "/",
  authMiddleware,
  ArticleController.createArticle
);

// 更新文章
router.put(
  "/:id",
  authMiddleware,
  validate(userIdValidator),
  ArticleController.updateArticle
);

// 删除文章
router.delete(
  "/:id",
  authMiddleware,
  validate(userIdValidator),
  ArticleController.deleteArticle
);

// ===== 管理员接口 =====

// 获取文章统计（需要管理员权限）
router.get(
  "/stats/all",
  authMiddleware,
  adminMiddleware,
  ArticleController.getArticleStats
);

// 置顶文章（需要管理员权限）
router.put(
  "/:id/top",
  authMiddleware,
  adminMiddleware,
  validate(userIdValidator),
  ArticleController.toggleTopStatus
);

module.exports = router;