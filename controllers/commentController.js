// controllers/commentController.js
const commentService = require("../services/commentService");
const { successResponse } = require("../middleware/errorHandler");
const { asyncHandler } = require("../middleware/errorHandler");

class CommentController {
  /**
   * 创建评论
   */
  createComment = asyncHandler(async (req, res) => {
    const { content, articleId, parentId } = req.body;
    const userId = req.user.id;
    if (!req.user || !userId) {
      // 处理用户不存在的情况
      return res.status(401).json({ error: "用户未认证" });
    }

    const commentData = {
      content,
      articleId,
      userId,
      parentId,
    };

    const comment = await commentService.createComment(commentData);
    successResponse(res, comment, "评论创建成功", 201);
  });
  /**
   * 获取文章评论
   */
  getCommentsByArticleId = asyncHandler(async (req, res) => {
    const { articleId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;

    const result = await commentService.getCommentsByArticleId(
      articleId,
      parseInt(page),
      parseInt(pageSize),
    );

    // 只返回 tree 和 pagination，移除 list
    successResponse(res, result, "获取评论成功");
  });
  /**
   * 回复评论
   */
  replyToComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, articleId } = req.body;
    const userId = req.user.id;

    const replyData = {
      content,
      articleId,
      userId,
    };

    const reply = await commentService.replyToComment(id, replyData);
    successResponse(res, reply, "回复成功", 201);
  });

  /**
   * 删除评论
   */
  deleteComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    await commentService.deleteComment(id, userId, userRole);
    successResponse(res, null, "评论删除成功");
  });
}

module.exports = new CommentController();
