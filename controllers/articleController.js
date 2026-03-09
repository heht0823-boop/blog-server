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
      // 添加用户认证检查
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { title, content, cover, categoryId } = req.body;
      const userId = req.user.id; // 从认证中间件获取用户ID

      const articleId = await articleService.createArticle({
        title,
        content,
        cover,
        category_id: categoryId, // 注意字段名映射
        user_id: userId, // 传递用户ID
      });

      successResponse(res, { articleId }, "文章创建成功，等待审核", 201);
    } catch (err) {
      if (err.message === "已存在相同标题的文章") {
        return errorResponse(res, null, "已存在相同标题的文章", 400);
      }
      next(err);
    }
  });

  /**
   * 更新文章
   */
  updateArticle = asyncHandler(async (req, res, next) => {
    try {
      // 添加用户认证检查
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const { title, content, cover, categoryId, status, isTop } = req.body;
      // 直接从 req.user 获取用户信息
      const userId = req.user.id;
      const isAdmin = req.user.role === 1;

      // 验证文章所有权
      await articleService.verifyArticleOwnership(
        id,
        userId,
        isAdmin ? "admin" : "user",
      );

      const updateData = {
        title,
        content,
        cover,
        category_id: categoryId,
        is_top: isTop,
      };

      // 只有管理员可以修改status字段
      if (status !== undefined) {
        updateData.status = status;
      }

      const updated = await articleService.updateArticle(
        id,
        updateData,
        isAdmin ? "admin" : "user",
      );

      if (!updated) {
        return errorResponse(res, null, "文章更新失败", 400);
      }

      // 提供更友好的提示信息
      let message = "文章更新成功";
      if (status === 1 && isAdmin) {
        message = "文章已审核通过";
      } else if (status === 0 && isAdmin) {
        message = "文章已设为待审核";
      }

      successResponse(res, null, message);
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
      // 添加用户认证检查
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      // 直接从 req.user 获取用户信息
      const userId = req.user.id;
      const isAdmin = req.user.role === 1;

      // 验证文章所有权
      await articleService.verifyArticleOwnership(
        id,
        userId,
        isAdmin ? "admin" : "user",
      );

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
   * 获取文章统计信息（增强版）
   */
  getArticleStats = asyncHandler(async (req, res, next) => {
    try {
      // 添加用户认证检查
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      // 只有管理员可以访问此接口
      const isAdmin = req.user.role === 1;
      if (!isAdmin) {
        return errorResponse(res, null, "权限不足，仅管理员可访问", 403);
      }

      const { userId } = req.query;
      const stats = await articleService.getArticleStats(
        userId ? parseInt(userId) : null,
      );
      successResponse(res, stats, "获取成功");
    } catch (err) {
      next(err);
    }
  });
  /**
   * 为文章设置标签
   */
  setArticleTags = asyncHandler(async (req, res, next) => {
    try {
      // 添加用户认证检查
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const { tagIds } = req.body;
      // 直接从 req.user 获取用户信息
      const userId = req.user.id;
      // 统一使用数字形式角色
      const isAdmin = req.user.role === 1;

      // 验证文章所有权
      await articleService.verifyArticleOwnership(
        id,
        userId,
        isAdmin ? "admin" : "user",
      );

      // 先清除原有的标签关联
      await articleService.clearArticleTags(id);

      // 添加新的标签关联
      let successCount = 0;
      const errors = [];

      for (const tagId of tagIds) {
        try {
          const result = await articleService.addArticleTag(id, tagId);
          if (result !== null) {
            successCount++;
          }
        } catch (err) {
          errors.push({ tagId, error: err.message });
        }
      }

      const response = { successCount };
      if (errors.length > 0) {
        response.errors = errors;
      }

      successResponse(res, response, "标签设置完成");
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
      // 添加用户认证检查
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params; // 从URL参数获取文章ID
      // 直接从 req.user 获取用户信息
      const userId = req.user.id;
      // 统一使用数字形式角色
      const isAdmin = req.user.role === 1;

      // 验证文章所有权
      await articleService.verifyArticleOwnership(
        id,
        userId,
        isAdmin ? "admin" : "user",
      );

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

  /**
   * 获取用户文章列表
   */
  getUserArticles = asyncHandler(async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { page = 1, pageSize = 10 } = req.query;

      const currentUserId = req.user ? req.user.id : null;
      const userRole = req.user && req.user.role === 1 ? "admin" : "user";

      const result = await articleService.getUserArticles(
        parseInt(userId),
        parseInt(page),
        parseInt(pageSize),
        userRole,
        currentUserId,
      );

      successResponse(
        res,
        {
          total: result.total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          articles: result.articles,
        },
        "获取成功",
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

      // 统一使用字符串形式判断角色
      const isAdmin = req.user && req.user.role === 1;
      const userRole = isAdmin ? "admin" : "user";

      // 处理过滤条件
      const filters = {};
      if (categoryId) filters.category_id = parseInt(categoryId);
      if (tagId) filters.tag_id = parseInt(tagId);

      // 管理员可以使用status参数进行过滤
      if (isAdmin && status !== undefined) {
        filters.status = parseInt(status);
      }

      const result = await articleService.getArticles(
        parseInt(page),
        parseInt(pageSize),
        filters,
        userRole,
      );

      successResponse(
        res,
        {
          total: result.total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          articles: result.articles,
        },
        "获取成功",
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
      const isAdmin = req.user && req.user.role === 1;
      const userRole = isAdmin ? "admin" : "user";

      const article = await articleService.getArticleById(id, userRole);

      if (!article) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      successResponse(res, article, "获取成功");
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
      const isAdmin = req.user && req.user.role === 1;
      const userRole = isAdmin ? "admin" : "user";

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
          400,
        );
      }

      const result = await articleService.searchArticles(
        keyword,
        parseInt(page),
        parseInt(pageSize),
        userRole,
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
        "搜索成功",
      );
    } catch (err) {
      next(err);
    }
  });
  /**
   * 获取置顶文章列表
   */
  getTopArticles = asyncHandler(async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      const isAdmin = req.user && req.user.role === 1;
      const userRole = isAdmin ? "admin" : "user";

      const topArticles = await articleService.getTopArticles(
        parseInt(limit),
        userRole,
      );

      successResponse(res, topArticles, "获取成功");
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取热门文章
   */
  getPopularArticles = asyncHandler(async (req, res, next) => {
    try {
      const isAdmin = req.user && req.user.role === 1;
      const userRole = isAdmin ? "admin" : "user";

      const popularArticles = await articleService.getPopularArticles(
        10,
        userRole,
      );
      successResponse(res, popularArticles, "获取成功");
    } catch (err) {
      next(err);
    }
  });
  /**
   * 增加文章浏览数（公开接口，前端访问时自动调用）
   */
  incrementViews = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const updated = await articleService.incrementViews(id);

      if (!updated) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      // 不返回敏感信息，只返回成功状态
      successResponse(res, null, "浏览数已更新");
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
}

module.exports = new ArticleController();
