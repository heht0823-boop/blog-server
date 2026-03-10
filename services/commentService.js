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

      const [articleRows] = await connection.execute(
        "SELECT id FROM articles WHERE id = ?",
        [Number(articleId)],
      );

      if (articleRows.length === 0) {
        throw new NotFoundError("文章不存在");
      }

      if (finalParentId > 0) {
        const [parentRows] = await connection.execute(
          "SELECT id FROM comments WHERE id = ? AND article_id = ?",
          [Number(finalParentId), Number(articleId)],
        );

        if (parentRows.length === 0) {
          throw new NotFoundError("父评论不存在或不属于该文章");
        }
      }

      const [result] = await connection.execute(
        "INSERT INTO comments (content, article_id, user_id, parent_id) VALUES (?, ?, ?, ?)",
        [content, Number(articleId), Number(userId), Number(finalParentId)],
      );

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
    const { content, userId } = replyData;

    if (!parentCommentId || parentCommentId <= 0) {
      throw new Error("父评论 ID 必须大于 0");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 先查找父评论（不强制校验 articleId，防止前端传错）
      const [commentRows] = await connection.execute(
        "SELECT id, article_id FROM comments WHERE id = ?",
        [Number(parentCommentId)],
      );

      if (commentRows.length === 0) {
        throw new NotFoundError("被回复的评论不存在");
      }

      const parentComment = commentRows[0];
      const articleId = parentComment.article_id; // 使用父评论的文章ID，确保一致性

      // 2. 检查文章是否存在
      const [articleRows] = await connection.execute(
        "SELECT id FROM articles WHERE id = ?",
        [Number(articleId)],
      );

      if (articleRows.length === 0) {
        throw new NotFoundError("文章不存在");
      }

      // 3. 插入回复
      const [result] = await connection.execute(
        "INSERT INTO comments (content, article_id, user_id, parent_id) VALUES (?, ?, ?, ?)",
        [content, Number(articleId), Number(userId), Number(parentCommentId)],
      );

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
    const [articleRows] = await pool.execute(
      "SELECT id FROM articles WHERE id = ?",
      [Number(articleId)],
    );

    if (articleRows.length === 0) {
      throw new NotFoundError("文章不存在");
    }

    // ✅ 确保分页参数是纯数字
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const offset = (pageNum - 1) * size;

    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM comments WHERE article_id = ? AND parent_id = 0",
      [Number(articleId)],
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

    // ✅ 获取分页后的根评论
    // 使用 query 而不是 execute，以避免在某些 mysql2 版本中 prepared statements 不支持 LIMIT ? OFFSET ? 的问题
    const [rootCommentRows] = await pool.query(
      `SELECT c.*, u.username, u.nickname, u.avatar 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.article_id = ? AND c.parent_id = 0 
       ORDER BY c.create_time ASC 
       LIMIT ? OFFSET ?`,
      [Number(articleId), Number(size), Number(offset)],
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

    // ✅ 获取根评论 ID 列表
    const rootIds = rootCommentRows
      .map((c) => Number(c?.id))
      .filter((id) => id > 0);

    // ✅ 如果没有根评论 ID，直接返回
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

    // ✅ 递归获取所有子评论
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

    // ✅ 确保所有 ID 都是有效数字
    const validIds = parentIds
      .map((id) => Number(id))
      .filter((id) => id > 0 && Number.isInteger(id));

    if (validIds.length === 0) {
      return [];
    }

    // ✅ 动态生成占位符
    const placeholders = validIds.map(() => "?").join(",");
    const sql = `
      SELECT c.*, u.username, u.nickname, u.avatar 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.article_id = ? AND c.parent_id IN (${placeholders}) 
      ORDER BY c.create_time ASC
    `;

    // ✅ 参数数组：第一个是 articleId，后面是每个 parent ID
    const params = [Number(articleId), ...validIds];

    const [childRows] = await pool.execute(sql, params);

    if (!childRows || childRows.length === 0) {
      return [];
    }

    const childIds = childRows.map((c) => Number(c?.id)).filter((id) => id > 0);
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

      const [commentRows] = await connection.execute(
        "SELECT id, user_id FROM comments WHERE id = ?",
        [Number(commentId)],
      );

      if (commentRows.length === 0) {
        throw new NotFoundError("评论不存在");
      }

      const comment = commentRows[0];

      if (comment.user_id !== userId && userRole < 1) {
        throw new Error("无权限删除此评论");
      }

      const childIds = await this.getAllChildCommentIds(commentId);

      if (childIds.length > 0) {
        const placeholders = childIds.map(() => "?").join(",");
        await connection.execute(
          `DELETE FROM comments WHERE id = ? OR id IN (${placeholders})`,
          [Number(commentId), ...childIds],
        );
      } else {
        await connection.execute("DELETE FROM comments WHERE id = ?", [
          Number(commentId),
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
      [Number(commentId)],
    );

    if (!childRows || childRows.length === 0) {
      return [];
    }

    const childIds = childRows.map((c) => Number(c?.id)).filter((id) => id > 0);
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
      [Number(commentId)],
    );

    if (rows.length === 0) {
      throw new NotFoundError("评论不存在");
    }

    return rows[0] || null;
  }
}

module.exports = new CommentService();
