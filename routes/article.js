const express = require("express");
const router = express.Router();

const ArticleController = require("../controllers/articleController");
const { validate } = require("../middleware/validator");
const {
  paginationValidator,
  articleQueryValidator,
  articleIdValidator,
  articleCreateValidator,
  articleUpdateValidator,
  articleSearchValidator,
} = require("../middleware/articleValidator"); // 修改这里
const { authMiddleware } = require("../middleware/auth");
const { adminMiddleware } = require("../middleware/permission");

// ... 其他代码保持不变
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

// ===== 需要认证的接口 =====

// 创建文章
router.post(
  "/",
  authMiddleware,
  validate(articleCreateValidator), // 添加验证器
  ArticleController.createArticle
);

// 更新文章
router.put(
  "/:id",
  authMiddleware,
  validate([...articleIdValidator, ...articleUpdateValidator]), // 更新验证器
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
