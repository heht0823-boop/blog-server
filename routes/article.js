// routes/article.js
const express = require("express");
const router = express.Router();
const { param } = require("express-validator");

const ArticleController = require("../controllers/articleController");
const { validate } = require("../middleware/validator");
const {
  articleQueryValidator,
  articleIdValidator,
  articleCreateValidator,
  articleUpdateValidator,
  articleSearchValidator,
  articleTagValidator,
} = require("../middleware/articleValidator");
const { paginationValidator } = require("../middleware/userValidator");
const { authMiddleware, strictAuthMiddleware } = require("../middleware/auth");
const { adminMiddleware } = require("../middleware/permission");

// ===== 公开接口 =====

// 获取文章列表
router.get(
  "/",
  authMiddleware,
  validate([...paginationValidator, ...articleQueryValidator]),
  ArticleController.getArticles,
);

// 搜索文章
router.get(
  "/search",
  authMiddleware,
  validate([...paginationValidator, ...articleSearchValidator]),
  ArticleController.searchArticles,
);
// 获取置顶文章列表（用于轮播图）
router.get(
  "/top",
  authMiddleware,
  validate([
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("数量限制必须在 1-50 之间")
      .toInt(),
  ]),
  ArticleController.getTopArticles,
);

// 获取热门文章
router.get("/popular", authMiddleware, ArticleController.getPopularArticles);
// 获取用户文章列表
router.get(
  "/user/:userId",
  authMiddleware,
  validate([
    param("userId").isInt({ min: 1 }).withMessage("用户 ID 必须是正整数"),
    ...paginationValidator,
  ]),
  ArticleController.getUserArticles,
);

// ===== 需要认证的接口 =====

// 创建文章
router.post(
  "/",
  strictAuthMiddleware, // 使用严格认证
  validate(articleCreateValidator),
  ArticleController.createArticle,
);

// ===== 管理员接口 =====
// 获取文章统计
router.get(
  "/stats/all",
  strictAuthMiddleware, // 使用严格认证
  adminMiddleware, // 确保只有管理员可以访问
  ArticleController.getArticleStats,
);

// 具体操作路由（必须放在通用:id路由之前）
// 增加文章浏览数
router.put(
  "/:id/views",
  validate(articleIdValidator),
  ArticleController.incrementViews,
);

// 为文章设置标签
router.put(
  "/:id/tags",
  strictAuthMiddleware, // 使用严格认证
  validate([...articleIdValidator, ...articleTagValidator]),
  ArticleController.setArticleTags,
);

// 完全清除文章标签
router.delete(
  "/:id/tags",
  strictAuthMiddleware, // 使用严格认证
  validate(articleIdValidator),
  ArticleController.clearArticleTags,
);

// 置顶/取消置顶文章
router.put(
  "/:id/top",
  strictAuthMiddleware, // 使用严格认证
  adminMiddleware,
  validate(articleIdValidator),
  ArticleController.toggleTopStatus,
);

// 通用:id路由（放在最后）
// 获取文章详情
router.get("/:id", validate(articleIdValidator), ArticleController.getArticle);

// 更新文章
router.put(
  "/:id",
  strictAuthMiddleware, // 使用严格认证
  validate([...articleIdValidator, ...articleUpdateValidator]),
  ArticleController.updateArticle,
);

// 删除文章
router.delete(
  "/:id",
  strictAuthMiddleware, // 使用严格认证
  validate(articleIdValidator),
  ArticleController.deleteArticle,
);

module.exports = router;
