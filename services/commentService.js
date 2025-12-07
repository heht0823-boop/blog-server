// services/commentService.js
const { pool } = require("../config/db");
const { NotFoundError } = require("../middleware/errorHandler");

class CommentService {
  /**
   * 创建评论
   * @param {Object} commentData - 评论数据
   * @param {string} commentData.content - 评论内容
   * @param {number} commentData.articleId - 文章ID
   * @param {number} commentData.userId - 用户ID
   * @param {number} commentData.parentId - 父评论ID（可选）
   * @returns {Object} 评论对象
   */
  async createComment(commentData) {
    const { content, articleId, userId, parentId = 0 } = commentData;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 检查文章是否存在
      const [articleRows] = await connection.execute(
        "SELECT id FROM articles WHERE id = ?",
        [articleId]
      );

      if (articleRows.length === 0) {
        throw new NotFoundError("文章不存在");
      }

      // 如果有父评论，检查父评论是否存在
      if (parentId > 0) {
        const [parentRows] = await connection.execute(
          "SELECT id FROM comments WHERE id = ? AND article_id = ?",
          [parentId, articleId]
        );

        if (parentRows.length === 0) {
          throw new NotFoundError("父评论不存在");
        }
      }

      // 插入评论
      const [result] = await connection.execute(
        "INSERT INTO comments (content, article_id, user_id, parent_id) VALUES (?, ?, ?, ?)",
        [content, articleId, userId, parentId]
      );

      // 获取插入的评论
      const [commentRows] = await connection.execute(
        `SELECT c.*, u.username, u.nickname, u.avatar 
         FROM comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.id = ?`,
        [result.insertId]
      );

      await connection.commit();
      return commentRows[0];
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取文章的所有评论（分页）
   * @param {number} articleId - 文章ID
   * @param {number} page - 页码
   * @param {number} pageSize - 每页条数
   * @returns {Object} 包含评论列表和分页信息的对象
   */
  async getCommentsByArticleId(articleId, page = 1, pageSize = 10) {
    // 检查文章是否存在
    const [articleRows] = await pool.execute(
      "SELECT id FROM articles WHERE id = ?",
      [articleId]
    );

    if (articleRows.length === 0) {
      throw new NotFoundError("文章不存在");
    }

    // 确保参数为正整数类型
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    // 获取评论总数
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM comments WHERE article_id = ?",
      [articleId]
    );
    const total = countRows[0].total;

    // 如果没有评论，直接返回空列表
    if (total === 0) {
      return {
        list: [],
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: 0,
        },
      };
    }

    // 获取评论列表（使用字符串拼接方式避免参数绑定问题）
    const query = `SELECT c.*, u.username, u.nickname, u.avatar,
                        p.content as parent_content, pu.username as parent_username
                 FROM comments c
                 JOIN users u ON c.user_id = u.id
                 LEFT JOIN comments p ON c.parent_id = p.id
                 LEFT JOIN users pu ON p.user_id = pu.id
                 WHERE c.article_id = ?
                 ORDER BY c.create_time DESC
                 LIMIT ${size} OFFSET ${offset}`;

    const [commentRows] = await pool.execute(query, [articleId]);

    return {
      list: commentRows,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size),
      },
    };
  }

  /**
   * 回复评论
   * @param {number} commentId - 被回复的评论ID
   * @param {Object} replyData - 回复数据
   * @param {string} replyData.content - 回复内容
   * @param {number} replyData.articleId - 文章ID
   * @param {number} replyData.userId - 用户ID
   * @returns {Object} 回复对象
   */
  async replyToComment(commentId, replyData) {
    const { content, articleId, userId } = replyData;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 检查文章是否存在
      const [articleRows] = await connection.execute(
        "SELECT id FROM articles WHERE id = ?",
        [articleId]
      );

      if (articleRows.length === 0) {
        throw new NotFoundError("文章不存在");
      }

      // 检查被回复的评论是否存在且属于该文章
      const [commentRows] = await connection.execute(
        "SELECT id FROM comments WHERE id = ? AND article_id = ?",
        [commentId, articleId]
      );

      if (commentRows.length === 0) {
        throw new NotFoundError("被回复的评论不存在");
      }

      // 插入回复（作为子评论）
      const [result] = await connection.execute(
        "INSERT INTO comments (content, article_id, user_id, parent_id) VALUES (?, ?, ?, ?)",
        [content, articleId, userId, commentId]
      );

      // 获取插入的回复
      const [replyRows] = await connection.execute(
        `SELECT c.*, u.username, u.nickname, u.avatar 
         FROM comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.id = ?`,
        [result.insertId]
      );

      await connection.commit();
      return replyRows[0];
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除评论
   * @param {number} commentId - 评论ID
   * @param {number} userId - 用户ID
   * @param {number} userRole - 用户角色
   * @returns {boolean} 是否删除成功
   */
  async deleteComment(commentId, userId, userRole) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 检查评论是否存在
      const [commentRows] = await connection.execute(
        "SELECT id, user_id FROM comments WHERE id = ?",
        [commentId]
      );

      if (commentRows.length === 0) {
        throw new NotFoundError("评论不存在");
      }

      const comment = commentRows[0];

      // 检查权限（评论作者或管理员）
      if (comment.user_id !== userId && userRole < 1) {
        throw new Error("无权限删除此评论");
      }

      // 删除评论及其所有子评论
      await connection.execute(
        "DELETE FROM comments WHERE id = ? OR parent_id = ?",
        [commentId, commentId]
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID获取评论
   * @param {number} commentId - 评论ID
   * @returns {Object} 评论对象
   */
  async getCommentById(commentId) {
    const [rows] = await pool.execute(
      `SELECT c.*, u.username, u.nickname, u.avatar 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [commentId]
    );

    if (rows.length === 0) {
      throw new NotFoundError("评论不存在");
    }

    return rows[0];
  }
}

module.exports = new CommentService();
