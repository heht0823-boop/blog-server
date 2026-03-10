// controllers/commentController.js
const commentService = require("../services/commentService");
const { successResponse } = require("../middleware/errorHandler");
const { asyncHandler } = require("../middleware/errorHandler");

class CommentController {
  /**
   * 创建评论（根评论，parent_id=0）
   */
  createComment = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: "用户未认证",
        message: "请先登录",
      });
    }

    const { content, articleId } = req.body;
    const userId = req.user.id;

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return res.status(400).json({
        error: "参数错误",
        message: "评论内容不能为空",
      });
    }

    if (
      !articleId ||
      !Number.isInteger(Number(articleId)) ||
      Number(articleId) <= 0
    ) {
      return res.status(400).json({
        error: "参数错误",
        message: "文章 ID 无效",
      });
    }

    const commentData = {
      content: content.trim(),
      articleId: Number(articleId),
      userId: Number(userId),
      parentId: 0,
    };

    const comment = await commentService.createComment(commentData);
    successResponse(res, comment, "评论创建成功", 201);
  });

  /**
   * 获取文章评论（无需认证）
   */
  getCommentsByArticleId = asyncHandler(async (req, res) => {
    const { articleId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;

    if (
      !articleId ||
      !Number.isInteger(Number(articleId)) ||
      Number(articleId) <= 0
    ) {
      return res.status(400).json({
        error: "参数错误",
        message: "文章 ID 无效",
      });
    }

    const result = await commentService.getCommentsByArticleId(
      Number(articleId),
      Number(page),
      Number(pageSize),
    );

    successResponse(res, result, "获取评论成功");
  });

  /**
   * 回复评论（子评论，parent_id>0，从路由参数获取）
   */
  replyToComment = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: "用户未认证",
        message: "请先登录",
      });
    }

    const { id } = req.params;
    const { content, articleId } = req.body;
    const userId = req.user.id;

    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        error: "参数错误",
        message: "评论 ID 无效",
      });
    }

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return res.status(400).json({
        error: "参数错误",
        message: "回复内容不能为空",
      });
    }

    if (
      !articleId ||
      !Number.isInteger(Number(articleId)) ||
      Number(articleId) <= 0
    ) {
      return res.status(400).json({
        error: "参数错误",
        message: "文章 ID 无效",
      });
    }

    const replyData = {
      content: content.trim(),
      articleId: Number(articleId),
      userId: Number(userId),
    };

    const reply = await commentService.replyToComment(Number(id), replyData);
    successResponse(res, reply, "回复成功", 201);
  });

  /**
   * 删除评论
   */
  deleteComment = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: "用户未认证",
        message: "请先登录",
      });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role || 0;

    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        error: "参数错误",
        message: "评论 ID 无效",
      });
    }

    await commentService.deleteComment(
      Number(id),
      Number(userId),
      Number(userRole),
    );
    successResponse(res, null, "评论删除成功");
  });
}

module.exports = new CommentController();
