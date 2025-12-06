const express = require("express");
const router = express.Router();
const { param } = require("express-validator"); // 添加这行引入

const ArticleController = require("../controllers/articleController");
const { validate } = require("../middleware/validator");
const {
  articleQueryValidator,
  articleIdValidator,
  articleCreateValidator,
  articleUpdateValidator,
  articleSearchValidator,
} = require("../middleware/articleValidator");
// 从 userValidator.js 导入 paginationValidator
const { paginationValidator } = require("../middleware/userValidator");
const { authMiddleware } = require("../middleware/auth");
const { adminMiddleware } = require("../middleware/permission");

// ===== 公开接口 =====

// 获取文章列表
router.get(
  "/",
  validate([...paginationValidator, ...articleQueryValidator]),
  ArticleController.getArticles
);

// 获取文章详情
router.get("/:id", validate(articleIdValidator), ArticleController.getArticle);

// 搜索文章
router.get(
  "/search",
  validate([...paginationValidator, ...articleSearchValidator]),
  ArticleController.searchArticles
);

// 获取热门文章
router.get("/popular", ArticleController.getPopularArticles);

// 增加文章浏览数
router.put(
  "/:id/views",
  validate(articleIdValidator),
  ArticleController.incrementViews
);

// 获取分类下文章
router.get(
  "/category/:categoryId",
  validate([
    param("categoryId").isInt({ min: 1 }).withMessage("分类 ID 必须是正整数"),
    ...paginationValidator,
  ]),
  ArticleController.getArticlesByCategory
);

// 获取用户文章列表
router.get(
  "/user/:userId",
  validate([
    param("userId").isInt({ min: 1 }).withMessage("用户 ID 必须是正整数"),
    ...paginationValidator,
  ]),
  ArticleController.getUserArticles
);

// ===== 需要认证的接口 =====

// 创建文章
router.post(
  "/",
  authMiddleware,
  validate(articleCreateValidator),
  ArticleController.createArticle
);

// 更新文章
router.put(
  "/:id",
  authMiddleware,
  validate([...articleIdValidator, ...articleUpdateValidator]),
  ArticleController.updateArticle
);

// 删除文章
router.delete(
  "/:id",
  authMiddleware,
  validate(articleIdValidator),
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
  validate(articleIdValidator),
  ArticleController.toggleTopStatus
);

module.exports = router;
