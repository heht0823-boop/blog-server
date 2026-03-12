// routes/article.js
const express = require("express");
const router = express.Router();
const { param, query } = require("express-validator");

const ArticleController = require("../controllers/articleController");
const { validate } = require("../middleware/validator");
const {
  articleQueryValidator,
  articleIdValidator,
  articleCreateValidator,
  articleUpdateValidator,
  articleSearchValidator,
  articleTagValidator,
  deleteCoverValidator,
  pendingArticlesValidator,
} = require("../middleware/articleValidator");
const { paginationValidator } = require("../middleware/userValidator");
const { authMiddleware, strictAuthMiddleware } = require("../middleware/auth");
const { adminMiddleware } = require("../middleware/permission");

// ===== 公开接口 =====

// 增加文章浏览数（前端访问文章时自动调用）
router.put(
  "/:id/views",
  validate(articleIdValidator),
  ArticleController.incrementViews,
);

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
// 上传文章封面图片
router.post(
  "/upload/cover",
  strictAuthMiddleware,
  ArticleController.uploadCover,
);
// 删除已上传的封面图片
router.delete(
  "/upload/cover",
  strictAuthMiddleware,
  validate(deleteCoverValidator),
  ArticleController.deleteCover,
);

// 创建文章
router.post(
  "/",
  strictAuthMiddleware,
  validate(articleCreateValidator),
  ArticleController.createArticle,
);
// 获取用户待审核文章
router.get(
  "/:userId/pending-articles",
  authMiddleware,
  validate(pendingArticlesValidator),
  ArticleController.getPendingArticles,
);

// ===== 管理员接口 =====
// 获取文章统计
router.get(
  "/stats/all",
  strictAuthMiddleware,
  adminMiddleware,
  ArticleController.getArticleStats,
);

// 为文章设置标签
router.put(
  "/:id/tags",
  strictAuthMiddleware,
  validate([...articleIdValidator, ...articleTagValidator]),
  ArticleController.setArticleTags,
);

// 完全清除文章标签
router.delete(
  "/:id/tags",
  strictAuthMiddleware,
  validate(articleIdValidator),
  ArticleController.clearArticleTags,
);

// 置顶/取消置顶文章
router.put(
  "/:id/top",
  strictAuthMiddleware,
  adminMiddleware,
  validate(articleIdValidator),
  ArticleController.toggleTopStatus,
);

// 通用:id 路由（放在最后）
// 获取文章详情
router.get(
  "/:id",
  authMiddleware, // ✅ 改为可选认证，游客也可访问
  validate(articleIdValidator),
  ArticleController.getArticleDetail,
);

// 更新文章
router.put(
  "/:id",
  strictAuthMiddleware,
  validate([...articleIdValidator, ...articleUpdateValidator]),
  ArticleController.updateArticle,
);

// 删除文章
router.delete(
  "/:id",
  strictAuthMiddleware,
  validate(articleIdValidator),
  ArticleController.deleteArticle,
);
// ===== 点赞相关接口 =====

// 点赞文章
router.post(
  "/:id/like",
  strictAuthMiddleware,
  validate(articleIdValidator),
  ArticleController.likeArticle,
);

// 取消点赞
router.delete(
  "/:id/like",
  strictAuthMiddleware,
  validate(articleIdValidator),
  ArticleController.unlikeArticle,
);

// ===== 收藏相关接口 =====

// 收藏文章
router.post(
  "/:id/collect",
  strictAuthMiddleware,
  validate(articleIdValidator),
  ArticleController.collectArticle,
);

// 取消收藏
router.delete(
  "/:id/collect",
  strictAuthMiddleware,
  validate(articleIdValidator),
  ArticleController.uncollectArticle,
);

// ===== 用户点赞/收藏列表 =====

// 获取用户点赞的文章
router.get(
  "/user/:userId/likes",
  strictAuthMiddleware, // ✅ 改为严格认证
  validate([
    param("userId").isInt({ min: 1 }).withMessage("用户 ID 必须是正整数"),
    ...paginationValidator,
  ]),
  ArticleController.getUserLikedArticles,
);

// 获取用户收藏的文章
router.get(
  "/user/:userId/collections",
  strictAuthMiddleware, // ✅ 改为严格认证
  validate([
    param("userId").isInt({ min: 1 }).withMessage("用户 ID 必须是正整数"),
    ...paginationValidator,
  ]),
  ArticleController.getUserCollectedArticles,
);

module.exports = router;
