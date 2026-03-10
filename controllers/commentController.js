// controllers/commentController.js
const commentService = require("../services/commentService");
const { successResponse } = require("../middleware/errorHandler");
const { asyncHandler } = require("../middleware/errorHandler");

class CommentController {
  /**
   * 创建评论（根评论，parent_id=0）
   */
  createComment = asyncHandler(async (req, res) => {
    const { content, articleId, parentId } = req.body;
    const userId = req.user.id;

    if (!req.user || !userId) {
      return res.status(401).json({ error: "用户未认证" });
    }

    // 创建评论时强制 parentId=0（根评论）
    const commentData = {
      content,
      articleId,
      userId,
      parentId: 0,
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

    successResponse(res, result, "获取评论成功");
  });

  /**
   * 回复评论（子评论，parent_id>0，从路由参数获取）
   */
  replyToComment = asyncHandler(async (req, res) => {
    const { id } = req.params; // 从路由获取父评论 ID
    const { content, articleId } = req.body;
    const userId = req.user.id;

    if (!req.user || !userId) {
      return res.status(401).json({ error: "用户未认证" });
    }

    const replyData = {
      content,
      articleId,
      userId,
    };

    // 使用路由参数 id 作为父评论 ID
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
