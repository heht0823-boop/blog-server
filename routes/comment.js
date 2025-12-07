// routes/comment.js
const express = require("express");
const commentController = require("../controllers/commentController");
const { authMiddleware } = require("../middleware/auth");
const { validate } = require("../middleware/validator");
const {
  commentIdValidator,
  commentCreateValidator,
  commentReplyValidator,
  articleCommentQueryValidator,
} = require("../middleware/commentValidator");

const router = express.Router();

// 创建评论 (需要认证)
router.post(
  "/",
  authMiddleware,
  validate(commentCreateValidator),
  commentController.createComment
);

// 获取文章评论
router.get(
  "/article/:articleId",
  validate(articleCommentQueryValidator),
  commentController.getCommentsByArticleId
);

// 回复评论 (需要认证)
router.post(
  "/:id/reply",
  authMiddleware,
  validate(commentReplyValidator),
  commentController.replyToComment
);

// 删除评论 (需要认证)
router.delete(
  "/:id",
  authMiddleware,
  validate(commentIdValidator),
  commentController.deleteComment
);

module.exports = router;