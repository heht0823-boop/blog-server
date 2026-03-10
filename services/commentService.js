// services/commentService.js
const { pool } = require("../config/db");
const { NotFoundError } = require("../middleware/errorHandler");

class CommentService {
  /**
   * 创建评论（根评论，parent_id=0）
   * @param {Object} commentData - 评论数据
   * @param {string} commentData.content - 评论内容
   * @param {number} commentData.articleId - 文章 ID
   * @param {number} commentData.userId - 用户 ID
   * @param {number} commentData.parentId - 父评论 ID（默认 0）
   * @returns {Object} 评论对象
   */
  async createComment(commentData) {
    const { content, articleId, userId, parentId = 0 } = commentData;

    // 确保 parentId 为 0（创建根评论）
    const finalParentId = parentId || 0;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 检查文章是否存在
      const [articleRows] = await connection.execute(
        "SELECT id FROM articles WHERE id = ?",
        [articleId],
      );

      if (articleRows.length === 0) {
        throw new NotFoundError("文章不存在");
      }

      // 如果有父评论，检查父评论是否存在且属于该文章
      if (finalParentId > 0) {
        const [parentRows] = await connection.execute(
          "SELECT id FROM comments WHERE id = ? AND article_id = ?",
          [finalParentId, articleId],
        );

        if (parentRows.length === 0) {
          throw new NotFoundError("父评论不存在或不属于该文章");
        }
      }

      // 插入评论
      const [result] = await connection.execute(
        "INSERT INTO comments (content, article_id, user_id, parent_id) VALUES (?, ?, ?, ?)",
        [content, articleId, userId, finalParentId],
      );

      // 获取插入的评论
      const [commentRows] = await connection.execute(
        `SELECT c.*, u.username, u.nickname, u.avatar 
         FROM comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.id = ?`,
        [result.insertId],
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
   * 回复评论（子评论，parent_id>0）
   * @param {number} parentCommentId - 父评论 ID（从路由获取）
   * @param {Object} replyData - 回复数据
   * @param {string} replyData.content - 回复内容
   * @param {number} replyData.articleId - 文章 ID
   * @param {number} replyData.userId - 用户 ID
   * @returns {Object} 回复对象
   */
  async replyToComment(parentCommentId, replyData) {
    const { content, articleId, userId } = replyData;

    // 确保 parentCommentId > 0
    if (!parentCommentId || parentCommentId <= 0) {
      throw new Error("父评论 ID 必须大于 0");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 检查文章是否存在
      const [articleRows] = await connection.execute(
        "SELECT id FROM articles WHERE id = ?",
        [articleId],
      );

      if (articleRows.length === 0) {
        throw new NotFoundError("文章不存在");
      }

      // 检查被回复的评论是否存在且属于该文章
      const [commentRows] = await connection.execute(
        "SELECT id FROM comments WHERE id = ? AND article_id = ?",
        [parentCommentId, articleId],
      );

      if (commentRows.length === 0) {
        throw new NotFoundError("被回复的评论不存在或不属于该文章");
      }

      // 插入回复（作为子评论）
      const [result] = await connection.execute(
        "INSERT INTO comments (content, article_id, user_id, parent_id) VALUES (?, ?, ?, ?)",
        [content, articleId, userId, parentCommentId],
      );

      // 获取插入的回复
      const [replyRows] = await connection.execute(
        `SELECT c.*, u.username, u.nickname, u.avatar 
         FROM comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.id = ?`,
        [result.insertId],
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
   * 获取文章的所有评论（分页，树形结构）
   * @param {number} articleId - 文章 ID
   * @param {number} page - 页码
   * @param {number} pageSize - 每页条数
   * @returns {Object} 包含评论树和分页信息的对象
   */
  async getCommentsByArticleId(articleId, page = 1, pageSize = 10) {
    // 检查文章是否存在
    const [articleRows] = await pool.execute(
      "SELECT id FROM articles WHERE id = ?",
      [articleId],
    );

    if (articleRows.length === 0) {
      throw new NotFoundError("文章不存在");
    }

    // 确保参数为正整数类型
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    // 获取根评论总数（只统计 parent_id = 0 的评论）
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM comments WHERE article_id = ? AND parent_id = 0",
      [articleId],
    );
    const total = countRows[0].total;

    // 如果没有评论，直接返回空树
    if (total === 0) {
      return {
        tree: [],
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: 0,
        },
      };
    }

    // 获取分页后的根评论
    const [rootCommentRows] = await pool.execute(
      `SELECT c.*, u.username, u.nickname, u.avatar 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.article_id = ? AND c.parent_id = 0 
       ORDER BY c.create_time ASC 
       LIMIT ? OFFSET ?`,
      [articleId, size, offset],
    );

    if (rootCommentRows.length === 0) {
      return {
        tree: [],
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      };
    }

    // 获取根评论 ID 列表
    const rootIds = rootCommentRows.map((c) => c.id);

    // 递归获取所有子评论（处理多级评论）
    const allComments = await this.getAllChildComments(articleId, rootIds);

    // 合并根评论和子评论
    const allCommentsWithRoot = [...rootCommentRows, ...allComments];

    // 构建树结构（处理父评论被删除的孤儿评论）
    const tree = this.buildCommentTreeWithOrphanHandle(allCommentsWithRoot);

    return {
      tree,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size),
      },
    };
  }

  /**
   * 递归获取所有子评论
   * @param {number} articleId - 文章 ID
   * @param {Array} parentIds - 父评论 ID 列表
   * @returns {Array} 所有子评论
   */
  async getAllChildComments(articleId, parentIds) {
    if (!parentIds || parentIds.length === 0) {
      return [];
    }

    // 获取直接子评论
    const [childRows] = await pool.execute(
      `SELECT c.*, u.username, u.nickname, u.avatar 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.article_id = ? AND c.parent_id IN (?) 
       ORDER BY c.create_time ASC`,
      [articleId, parentIds],
    );

    if (childRows.length === 0) {
      return [];
    }

    // 递归获取下一级子评论
    const childIds = childRows.map((c) => c.id);
    const grandChildRows = await this.getAllChildComments(articleId, childIds);

    return [...childRows, ...grandChildRows];
  }

  /**
   * 构建评论树结构（处理孤儿评论）
   * @param {Array} comments - 平面评论数组
   * @returns {Array} 树形结构的评论数组
   */
  buildCommentTreeWithOrphanHandle(comments) {
    // 为每个评论添加 children 属性
    const commentMap = {};
    comments.forEach((comment) => {
      comment.children = [];
      commentMap[comment.id] = comment;
    });

    // 构建树结构
    const tree = [];
    const orphanComments = [];

    comments.forEach((comment) => {
      if (comment.parent_id === 0) {
        // 根评论
        tree.push(comment);
      } else {
        const parent = commentMap[comment.parent_id];
        if (parent) {
          // 父评论存在，添加到父评论的 children
          parent.children.push(comment);
        } else {
          // 父评论不存在（被删除），标记为孤儿评论
          orphanComments.push(comment);
        }
      }
    });

    // 处理孤儿评论：将它们提升到根级别或附加到最近的可用祖先
    // 这里选择将孤儿评论附加到根级别，并标记为孤儿
    orphanComments.forEach((orphan) => {
      orphan.is_orphan = true;
      tree.push(orphan);
    });

    return tree;
  }

  /**
   * 构建评论树结构（原始方法，保留兼容）
   * @param {Array} comments - 平面评论数组
   * @returns {Array} 树形结构的评论数组
   */
  buildCommentTree(comments) {
    const commentMap = {};
    comments.forEach((comment) => {
      comment.children = [];
      commentMap[comment.id] = comment;
    });

    const tree = [];
    comments.forEach((comment) => {
      if (comment.parent_id === 0) {
        tree.push(comment);
      } else {
        const parent = commentMap[comment.parent_id];
        if (parent) {
          parent.children.push(comment);
        }
      }
    });

    return tree;
  }

  /**
   * 删除评论（递归删除所有子评论）
   * @param {number} commentId - 评论 ID
   * @param {number} userId - 用户 ID
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
        [commentId],
      );

      if (commentRows.length === 0) {
        throw new NotFoundError("评论不存在");
      }

      const comment = commentRows[0];

      // 检查权限（评论作者或管理员）
      if (comment.user_id !== userId && userRole < 1) {
        throw new Error("无权限删除此评论");
      }

      // 递归获取所有子评论 ID
      const childIds = await this.getAllChildCommentIds(commentId);

      // 删除评论及其所有子评论
      if (childIds.length > 0) {
        await connection.execute(
          "DELETE FROM comments WHERE id = ? OR id IN (?)",
          [commentId, childIds],
        );
      } else {
        await connection.execute("DELETE FROM comments WHERE id = ?", [
          commentId,
        ]);
      }

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
   * 递归获取所有子评论 ID
   * @param {number} commentId - 评论 ID
   * @returns {Array} 所有子评论 ID 列表
   */
  async getAllChildCommentIds(commentId) {
    const [childRows] = await pool.execute(
      "SELECT id FROM comments WHERE parent_id = ?",
      [commentId],
    );

    if (childRows.length === 0) {
      return [];
    }

    const childIds = childRows.map((c) => c.id);
    let allChildIds = [...childIds];

    // 递归获取下一级子评论
    for (const childId of childIds) {
      const grandChildIds = await this.getAllChildCommentIds(childId);
      allChildIds = [...allChildIds, ...grandChildIds];
    }

    return allChildIds;
  }

  /**
   * 根据 ID 获取评论
   * @param {number} commentId - 评论 ID
   * @returns {Object} 评论对象
   */
  async getCommentById(commentId) {
    const [rows] = await pool.execute(
      `SELECT c.*, u.username, u.nickname, u.avatar 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [commentId],
    );

    if (rows.length === 0) {
      throw new NotFoundError("评论不存在");
    }

    return rows[0];
  }
}

module.exports = new CommentService();
