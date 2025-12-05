const articleService = require("../services/articleService");
const {
  successResponse,
  errorResponse,
  asyncHandler,
} = require("../middleware/errorHandler");

class ArticleController {
  /**
   * 创建文章
   */
  createArticle = asyncHandler(async (req, res, next) => {
    try {
      const { title, content, cover, categoryId, status, tags } = req.body;
      const userId = req.user.id;

      const articleId = await articleService.createArticle({
        title,
        content,
        cover,
        categoryId,
        userId,
        status,
        tags
      });

      successResponse(
        res,
        { articleId },
        "文章创建成功",
        201
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取文章列表
   */
  getArticles = asyncHandler(async (req, res, next) => {
    try {
      const { page = 1, pageSize = 10, categoryId, tagId, status } = req.query;

      const result = await articleService.getArticles(
        parseInt(page),
        parseInt(pageSize),
        categoryId ? parseInt(categoryId) : null,
        tagId ? parseInt(tagId) : null,
        status !== undefined ? parseInt(status) : null
      );

      successResponse(
        res,
        {
          total: result.total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          articles: result.articles,
        },
        "获取成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取文章详情
   */
  getArticle = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const article = await articleService.getArticleById(id);

      if (!article) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      successResponse(res, article, "获取成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 更新文章
   */
  updateArticle = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, content, cover, categoryId, status, tags } = req.body;

      const updated = await articleService.updateArticle(id, {
        title,
        content,
        cover,
        categoryId,
        status,
        tags
      });

      if (!updated) {
        return errorResponse(res, null, "文章更新失败", 400);
      }

      successResponse(res, null, "文章更新成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 删除文章
   */
  deleteArticle = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;

      const deleted = await articleService.deleteArticle(id);

      if (!deleted) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      successResponse(res, null, "文章删除成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 置顶文章
   */
  toggleTopStatus = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isTop } = req.body;

      const updated = await articleService.toggleTopStatus(id, isTop);

      if (!updated) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      successResponse(res, null, isTop ? "文章已置顶" : "文章已取消置顶");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取文章统计信息
   */
  getArticleStats = asyncHandler(async (req, res, next) => {
    try {
      const stats = await articleService.getArticleStats();

      successResponse(res, stats, "获取成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 搜索文章
   */
  searchArticles = asyncHandler(async (req, res, next) => {
    try {
      const { keyword, page = 1, pageSize = 10 } = req.query;

      if (!keyword) {
        return errorResponse(res, null, "搜索关键词不能为空", 400);
      }

      const result = await articleService.searchArticles(
        keyword,
        parseInt(page),
        parseInt(pageSize)
      );

      successResponse(
        res,
        {
          total: result.total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          articles: result.articles,
          keyword
        },
        "搜索成功"
      );
    } catch (err) {
      next(err);
    }
  });
}

module.exports = new ArticleController();