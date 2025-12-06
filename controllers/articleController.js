const articleService = require("../services/articleService");
const { param } = require("express-validator");
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
      const { title, content, cover, categoryId, status } = req.body;
      const userId = req.user.id; // 从认证中间件获取用户ID

      const articleId = await articleService.createArticle({
        title,
        content,
        cover,
        category_id: categoryId, // 注意字段名映射
        status,
        user_id: userId, // 传递用户ID
      });

      successResponse(res, { articleId }, "文章创建成功", 201);
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
      // 判断是否为管理员
      const isAdmin = req.user && req.user.role === 1;

      // 处理过滤条件
      const filters = {};
      if (categoryId) filters.category_id = parseInt(categoryId);
      if (tagId) filters.tag_id = parseInt(tagId);
      if (status !== undefined) filters.status = parseInt(status);

      // 如果不是管理员，只显示已发布的文章
      if (!isAdmin) {
        filters.status = 1;
      }

      const result = await articleService.getArticles(
        parseInt(page),
        parseInt(pageSize),
        filters
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
      const { title, content, cover, categoryId, status, isTop } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // 验证文章所有权
      await articleService.verifyArticleOwnership(id, userId, userRole);

      const updated = await articleService.updateArticle(id, {
        title,
        content,
        cover,
        category_id: categoryId,
        status,
        is_top: isTop,
      });

      if (!updated) {
        return errorResponse(res, null, "文章更新失败", 400);
      }

      successResponse(res, null, "文章更新成功");
    } catch (err) {
      if (err.message === "无权操作此文章") {
        return errorResponse(res, null, "权限不足", 403);
      }
      if (err.message === "文章不存在") {
        return errorResponse(res, null, "文章不存在", 404);
      }
      next(err);
    }
  });

  /**
   * 删除文章
   */
  deleteArticle = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // 验证文章所有权
      await articleService.verifyArticleOwnership(id, userId, userRole);

      const deleted = await articleService.deleteArticle(id);

      if (!deleted) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      successResponse(res, null, "文章删除成功");
    } catch (err) {
      if (err.message === "无权操作此文章") {
        return errorResponse(res, null, "权限不足", 403);
      }
      if (err.message === "文章不存在") {
        return errorResponse(res, null, "文章不存在", 404);
      }
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

      const updated = await articleService.updateArticle(id, {
        is_top: isTop,
      });

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
      let { keyword, page = 1, pageSize = 10 } = req.query;

      if (!keyword) {
        return errorResponse(res, null, "搜索关键词不能为空", 400);
      }

      // 清理关键词，去除首尾引号和多余空格
      keyword = keyword.trim().replace(/^["']+|["']+$/g, "");

      // 添加关键词长度验证
      if (keyword.length < 1 || keyword.length > 50) {
        return errorResponse(
          res,
          null,
          "搜索关键词长度应在1-50个字符之间",
          400
        );
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
          keyword,
        },
        "搜索成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取热门文章
   */
  getPopularArticles = asyncHandler(async (req, res, next) => {
    try {
      const popularArticles = await articleService.getPopularArticles(10);
      successResponse(res, popularArticles, "获取成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 增加文章浏览数
   */
  incrementViews = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const updated = await articleService.incrementViews(id);

      if (!updated) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      successResponse(res, null, "浏览数增加成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取分类下文章
   */
  getArticlesByCategory = asyncHandler(async (req, res, next) => {
    try {
      const { categoryId } = req.params;
      const { page = 1, pageSize = 10 } = req.query;

      const result = await articleService.getArticlesByCategory(
        categoryId,
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
        },
        "获取成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取用户文章列表
   */
  getUserArticles = asyncHandler(async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { page = 1, pageSize = 10 } = req.query;

      const result = await articleService.getUserArticles(
        userId,
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
        },
        "获取成功"
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 为文章设置标签
   */
  setArticleTags = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { tagIds } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // 验证文章所有权
      await articleService.verifyArticleOwnership(id, userId, userRole);

      // 先清除原有的标签关联
      await articleService.clearArticleTags(id);

      // 添加新的标签关联
      for (const tagId of tagIds) {
        try {
          await articleService.addArticleTag(id, tagId);
        } catch (err) {
          // 忽略重复关联的错误
          if (!err.message.includes("Duplicate entry")) {
            throw err;
          }
        }
      }

      successResponse(res, null, "标签设置成功");
    } catch (err) {
      if (err.message === "无权操作此文章") {
        return errorResponse(res, null, "权限不足", 403);
      }
      if (err.message === "文章不存在") {
        return errorResponse(res, null, "文章不存在", 404);
      }
      next(err);
    }
  });

  /**
   * 清除文章标签
   */
  clearArticleTags = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params; // 从URL参数获取文章ID
      const userId = req.user.id;
      const userRole = req.user.role;

      // 验证文章所有权
      await articleService.verifyArticleOwnership(id, userId, userRole);

      // 清除标签关联
      await articleService.clearArticleTags(id);

      successResponse(res, null, "标签清除成功");
    } catch (err) {
      if (err.message === "无权操作此文章") {
        return errorResponse(res, null, "权限不足", 403);
      }
      if (err.message === "文章不存在") {
        return errorResponse(res, null, "文章不存在", 404);
      }
      next(err);
    }
  });
}

module.exports = new ArticleController();
