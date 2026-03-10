// services/commentService.js
const { pool } = require("../config/db");
const { NotFoundError } = require("../middleware/errorHandler");

class CommentService {
  /**
   * 创建评论（根评论，parent_id=0）
   */
  async createComment(commentData) {
    const { content, articleId, userId, parentId = 0 } = commentData;
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

      // 如果有父评论，检查父评论是否存在
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
      return commentRows[0] || null;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 回复评论（子评论，parent_id>0）
   */
  async replyToComment(parentCommentId, replyData) {
    const { content, articleId, userId } = replyData;

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
      return replyRows[0] || null;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取文章的所有评论（分页，树形结构）
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

    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    // 获取根评论总数（只统计 parent_id = 0 的评论）
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM comments WHERE article_id = ? AND parent_id = 0",
      [articleId],
    );
    const total = countRows[0]?.total || 0;

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

    if (!rootCommentRows || rootCommentRows.length === 0) {
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
    const rootIds = rootCommentRows
      .map((c) => Number(c?.id))
      .filter((id) => id > 0);

    // 如果没有根评论 ID，直接返回
    if (rootIds.length === 0) {
      const tree = this.buildCommentTreeWithOrphanHandle(rootCommentRows);
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

    // 递归获取所有子评论
    const allComments = await this.getAllChildComments(articleId, rootIds);
    const allCommentsWithRoot = [...rootCommentRows, ...allComments];
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
   */
  async getAllChildComments(articleId, parentIds) {
    if (!parentIds || !Array.isArray(parentIds) || parentIds.length === 0) {
      return [];
    }

    // 确保所有 ID 都是数字
    const validIds = parentIds.map((id) => Number(id)).filter((id) => id > 0);
    if (validIds.length === 0) {
      return [];
    }

    // 动态生成占位符
    const placeholders = validIds.map(() => "?").join(",");
    const sql = `
      SELECT c.*, u.username, u.nickname, u.avatar 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.article_id = ? AND c.parent_id IN (${placeholders}) 
      ORDER BY c.create_time ASC
    `;

    const params = [articleId, ...validIds];

    const [childRows] = await pool.execute(sql, params);

    if (!childRows || childRows.length === 0) {
      return [];
    }

    const childIds = childRows.map((c) => Number(c?.id));
    const grandChildRows = await this.getAllChildComments(articleId, childIds);

    return [...childRows, ...grandChildRows];
  }

  /**
   * 构建评论树结构（处理孤儿评论）
   */
  buildCommentTreeWithOrphanHandle(comments) {
    if (!comments || comments.length === 0) {
      return [];
    }

    const commentMap = {};
    comments.forEach((comment) => {
      if (comment && comment.id) {
        comment.children = [];
        commentMap[comment.id] = comment;
      }
    });

    const tree = [];
    const orphanComments = [];

    comments.forEach((comment) => {
      if (!comment || !comment.id) return;

      if (comment.parent_id === 0 || comment.parent_id === null) {
        tree.push(comment);
      } else {
        const parent = commentMap[comment.parent_id];
        if (parent) {
          parent.children.push(comment);
        } else {
          orphanComments.push(comment);
        }
      }
    });

    orphanComments.forEach((orphan) => {
      orphan.is_orphan = true;
      tree.push(orphan);
    });

    return tree;
  }

  /**
   * 构建评论树结构（原始方法）
   */
  buildCommentTree(comments) {
    if (!comments || comments.length === 0) {
      return [];
    }

    const commentMap = {};
    comments.forEach((comment) => {
      if (comment && comment.id) {
        comment.children = [];
        commentMap[comment.id] = comment;
      }
    });

    const tree = [];
    comments.forEach((comment) => {
      if (!comment || !comment.id) return;

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
        const placeholders = childIds.map(() => "?").join(",");
        await connection.execute(
          `DELETE FROM comments WHERE id = ? OR id IN (${placeholders})`,
          [commentId, ...childIds],
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
   */
  async getAllChildCommentIds(commentId) {
    const [childRows] = await pool.execute(
      "SELECT id FROM comments WHERE parent_id = ?",
      [commentId],
    );

    if (!childRows || childRows.length === 0) {
      return [];
    }

    const childIds = childRows.map((c) => Number(c?.id));
    let allChildIds = [...childIds];

    for (const childId of childIds) {
      const grandChildIds = await this.getAllChildCommentIds(childId);
      allChildIds = [...allChildIds, ...grandChildIds];
    }

    return allChildIds;
  }

  /**
   * 根据 ID 获取评论
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

    return rows[0] || null;
  }
}

module.exports = new CommentService();
