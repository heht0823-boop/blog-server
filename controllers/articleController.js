const fs = require("fs");
const path = require("path");
const articleService = require("../services/articleService");
const { param } = require("express-validator");
const { upload, UPLOAD_DIR } = require("../utils/upload");
const SERVER_DOMAIN =
  process.env.SERVER_DOMAIN || "http://101.132.192.107:3000";
const {
  successResponse,
  errorResponse,
  asyncHandler,
} = require("../middleware/errorHandler");

class ArticleController {
  /**
   * 上传文章封面图片
   */
  uploadCover = asyncHandler(async (req, res, next) => {
    upload.single("cover")(req, res, async (err) => {
      if (err) {
        return errorResponse(res, err, err.message, 400);
      }

      if (!req.file) {
        return errorResponse(res, null, "请选择文件", 400);
      }

      const coverUrl = `${SERVER_DOMAIN}/uploads/${req.file.filename}`;

      successResponse(res, { cover: coverUrl }, "封面上传成功");
    });
  });

  /**
   * 删除已上传的封面图片
   */
  deleteCover = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { filename } = req.body;

      if (!filename) {
        return errorResponse(res, null, "文件名不能为空", 400);
      }

      const safeFilename = path.basename(filename);
      const filePath = path.join(UPLOAD_DIR, safeFilename);

      if (!fs.existsSync(filePath)) {
        return errorResponse(res, null, "文件不存在", 404);
      }

      fs.unlinkSync(filePath);

      successResponse(res, null, "封面图片删除成功");
    } catch (err) {
      if (err.code === "ENOENT") {
        return errorResponse(res, null, "文件不存在", 404);
      }
      next(err);
    }
  });

  /**
   * 创建文章
   */
  createArticle = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { title, content, cover, categoryId } = req.body;
      const userId = req.user.id;

      const articleId = await articleService.createArticle({
        title,
        content,
        cover,
        category_id: categoryId,
        user_id: userId,
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
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const { title, content, cover, categoryId, status, isTop } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === 1;

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
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 1;

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
   * 获取文章统计信息
   */
  getArticleStats = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

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
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const { tagIds } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === 1;

      await articleService.verifyArticleOwnership(
        id,
        userId,
        isAdmin ? "admin" : "user",
      );

      await articleService.clearArticleTags(id);

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
   * ✅ 获取文章的标签列表
   */
  getArticleTags = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const isAdmin = req.user && req.user.role === 1;
      const userRole = isAdmin ? "admin" : "user";

      // 验证文章是否存在
      const article = await articleService.getArticleById(id, userRole);
      if (!article) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      // 获取文章下的所有标签
      const tags = await articleService.getArticleTags(id);

      successResponse(
        res,
        {
          articleId: parseInt(id),
          tags,
          count: tags.length,
        },
        "获取文章标签成功",
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 清除文章标签
   */
  clearArticleTags = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 1;

      await articleService.verifyArticleOwnership(
        id,
        userId,
        isAdmin ? "admin" : "user",
      );

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

      const isAdmin = req.user && req.user.role === 1;
      const userRole = isAdmin ? "admin" : "user";

      const filters = {};
      if (categoryId) filters.category_id = parseInt(categoryId);
      if (tagId) filters.tag_id = parseInt(tagId);

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

      keyword = keyword.trim().replace(/^["']+|["']+$/g, "");

      if (keyword.length < 1 || keyword.length > 50) {
        return errorResponse(
          res,
          null,
          "搜索关键词长度应在 1-50 个字符之间",
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
   * 增加文章浏览数
   */
  incrementViews = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const updated = await articleService.incrementViews(id);

      if (!updated) {
        return errorResponse(res, null, "文章不存在", 404);
      }

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

  /**
   * 点赞文章
   */
  likeArticle = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const userId = req.user.id;

      await articleService.likeArticle(id, userId);
      successResponse(res, null, "点赞成功");
    } catch (err) {
      if (err.message === "已点赞过该文章") {
        return errorResponse(res, null, "已点赞过该文章", 400);
      }
      if (err.message === "文章不存在") {
        return errorResponse(res, null, "文章不存在", 404);
      }
      next(err);
    }
  });

  /**
   * 取消点赞
   */
  unlikeArticle = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const userId = req.user.id;

      const cancelled = await articleService.unlikeArticle(id, userId);

      if (!cancelled) {
        return errorResponse(res, null, "未找到点赞记录", 404);
      }

      successResponse(res, null, "取消点赞成功");
    } catch (err) {
      if (err.message === "文章不存在") {
        return errorResponse(res, null, "文章不存在", 404);
      }
      next(err);
    }
  });

  /**
   * 收藏文章
   */
  collectArticle = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const userId = req.user.id;

      await articleService.collectArticle(id, userId);
      successResponse(res, null, "收藏成功");
    } catch (err) {
      if (err.message === "已收藏过该文章") {
        return errorResponse(res, null, "已收藏过该文章", 400);
      }
      if (err.message === "文章不存在") {
        return errorResponse(res, null, "文章不存在", 404);
      }
      next(err);
    }
  });

  /**
   * 取消收藏
   */
  uncollectArticle = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { id } = req.params;
      const userId = req.user.id;

      const cancelled = await articleService.uncollectArticle(id, userId);

      if (!cancelled) {
        return errorResponse(res, null, "未找到收藏记录", 404);
      }

      successResponse(res, null, "取消收藏成功");
    } catch (err) {
      if (err.message === "文章不存在") {
        return errorResponse(res, null, "文章不存在", 404);
      }
      next(err);
    }
  });

  /**
   * 获取文章详情（增强版，包含点赞收藏状态）
   */
  getArticleDetail = asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const isAdmin = req.user && req.user.role === 1;
      const userRole = isAdmin ? "admin" : "user";
      const userId = req.user ? req.user.id : null;

      const article = await articleService.getArticleById(id, userRole);

      if (!article) {
        return errorResponse(res, null, "文章不存在", 404);
      }

      let likeStatus = { isLiked: false };
      let collectStatus = { isCollected: false };

      if (userId) {
        likeStatus = await articleService.checkUserLikeStatus(id, userId);
        collectStatus = await articleService.checkUserCollectStatus(id, userId);
      }

      successResponse(
        res,
        {
          ...article,
          isLiked: likeStatus.isLiked,
          isCollected: collectStatus.isCollected,
        },
        "获取成功",
      );
    } catch (err) {
      next(err);
    }
  });

  /**
   * 获取用户点赞的文章列表
   */
  getUserLikedArticles = asyncHandler(async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { page = 1, pageSize = 10 } = req.query;

      const currentUserId = req.user.id;

      if (req.user.role !== 1 && parseInt(userId) !== currentUserId) {
        return errorResponse(res, null, "权限不足", 403);
      }

      const result = await articleService.getUserLikedArticles(
        parseInt(userId),
        parseInt(page),
        parseInt(pageSize),
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
   * 获取用户收藏的文章列表
   */
  getUserCollectedArticles = asyncHandler(async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { page = 1, pageSize = 10 } = req.query;

      const currentUserId = req.user.id;

      if (req.user.role !== 1 && parseInt(userId) !== currentUserId) {
        return errorResponse(res, null, "权限不足", 403);
      }

      const result = await articleService.getUserCollectedArticles(
        parseInt(userId),
        parseInt(page),
        parseInt(pageSize),
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
   * 获取用户待审核文章
   */
  getPendingArticles = asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, null, "用户未认证", 401);
      }

      const { userId } = req.params;
      const { page = 1, pageSize = 10 } = req.query;

      if (parseInt(userId) !== req.user.id) {
        return errorResponse(res, null, "无权查看他人的待审核文章", 403);
      }

      const result = await articleService.getPendingArticles(
        parseInt(userId),
        parseInt(page),
        parseInt(pageSize),
      );

      successResponse(res, result, "获取待审核文章成功");
    } catch (err) {
      next(err);
    }
  });
}

module.exports = new ArticleController();
