const { pool } = require("../config/db");

class ArticleService {
  /**
   * 创建文章
   */
  async createArticle(articleData) {
    const { title, content, description, category_id, tags, status, user_id } =
      articleData;

    try {
      const [result] = await pool.query(
        `INSERT INTO articles (title, content, description, category_id, status, user_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, content, description, category_id, status || 1, user_id]
      );

      return result.insertId;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取文章列表（分页）
   */
  async getArticles(page = 1, pageSize = 10, filters = {}) {
    try {
      const offset = (page - 1) * pageSize;
      let query = "SELECT * FROM articles WHERE 1=1";
      const params = [];

      // 应用过滤条件
      if (filters.category_id) {
        query += " AND category_id = ?";
        params.push(filters.category_id);
      }

      if (filters.status) {
        query += " AND status = ?";
        params.push(filters.status);
      }

      if (filters.user_id) {
        query += " AND user_id = ?";
        params.push(filters.user_id);
      }

      query += " ORDER BY create_time DESC LIMIT ? OFFSET ?";
      params.push(pageSize, offset);

      const [articles] = await pool.query(query, params);

      // 获取总数
      let countQuery = "SELECT COUNT(*) as total FROM articles WHERE 1=1";
      const countParams = [];

      if (filters.category_id) {
        countQuery += " AND category_id = ?";
        countParams.push(filters.category_id);
      }

      if (filters.status) {
        countQuery += " AND status = ?";
        countParams.push(filters.status);
      }

      if (filters.user_id) {
        countQuery += " AND user_id = ?";
        countParams.push(filters.user_id);
      }

      const [countResult] = await pool.query(countQuery, countParams);
      const total = countResult[0].total;

      return { total, articles };
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取单篇文章详情
   */
  async getArticleById(articleId) {
    try {
      const [articles] = await pool.query(
        "SELECT * FROM articles WHERE id = ?",
        [articleId]
      );

      return articles[0] || null;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 更新文章
   */
  async updateArticle(articleId, updateData) {
    try {
      const allowedFields = [
        "title",
        "content",
        "description",
        "category_id",
        "status",
      ];
      const fields = [];
      const values = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        return 0;
      }

      values.push(articleId);

      const [result] = await pool.query(
        `UPDATE articles SET ${fields.join(
          ", "
        )}, update_time = NOW() WHERE id = ?`,
        values
      );

      return result.affectedRows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 删除文章
   */
  async deleteArticle(articleId) {
    try {
      const [result] = await pool.query("DELETE FROM articles WHERE id = ?", [
        articleId,
      ]);

      return result.affectedRows > 0;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 搜索文章
   */
  async searchArticles(keyword, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const searchTerm = `%${keyword}%`;

      const [articles] = await pool.query(
        `SELECT * FROM articles 
         WHERE title LIKE ? OR content LIKE ? OR description LIKE ?
         ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [searchTerm, searchTerm, searchTerm, pageSize, offset]
      );

      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM articles 
         WHERE title LIKE ? OR content LIKE ? OR description LIKE ?`,
        [searchTerm, searchTerm, searchTerm]
      );

      const total = countResult[0].total;

      return { total, articles };
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取文章统计
   */
  async getArticleStats(userId = null) {
    try {
      let query = "SELECT COUNT(*) as total FROM articles WHERE 1=1";
      const params = [];

      if (userId) {
        query += " AND user_id = ?";
        params.push(userId);
      }

      const [result] = await pool.query(query, params);

      return result[0];
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取热门文章
   */
  async getPopularArticles(limit = 10) {
    try {
      const [articles] = await pool.query(
        `SELECT * FROM articles 
         WHERE status = 1
         ORDER BY views DESC LIMIT ?`,
        [limit]
      );

      return articles;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 增加文章浏览数
   */
  async incrementViews(articleId) {
    try {
      const [result] = await pool.query(
        "UPDATE articles SET views = views + 1 WHERE id = ?",
        [articleId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取分类下的文章
   */
  async getArticlesByCategory(categoryId, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;

      const [articles] = await pool.query(
        `SELECT * FROM articles 
         WHERE category_id = ? AND status = 1
         ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [categoryId, pageSize, offset]
      );

      const [countResult] = await pool.query(
        "SELECT COUNT(*) as total FROM articles WHERE category_id = ? AND status = 1",
        [categoryId]
      );

      const total = countResult[0].total;

      return { total, articles };
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取用户文章列表
   */
  async getUserArticles(userId, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;

      const [articles] = await pool.query(
        `SELECT * FROM articles 
         WHERE user_id = ?
         ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [userId, pageSize, offset]
      );

      const [countResult] = await pool.query(
        "SELECT COUNT(*) as total FROM articles WHERE user_id = ?",
        [userId]
      );

      const total = countResult[0].total;

      return { total, articles };
    } catch (err) {
      throw err;
    }
  }

  /**
   * 批量删除文章
   */
  async deleteArticles(articleIds) {
    try {
      const placeholders = articleIds.map(() => "?").join(",");
      const [result] = await pool.query(
        `DELETE FROM articles WHERE id IN (${placeholders})`,
        articleIds
      );

      return result.affectedRows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取文章的标签
   */
  async getArticleTags(articleId) {
    try {
      const [tags] = await pool.query(
        `SELECT t.* FROM tags t
         INNER JOIN article_tags at ON t.id = at.tag_id
         WHERE at.article_id = ?`,
        [articleId]
      );

      return tags;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 添加文章标签
   */
  async addArticleTag(articleId, tagId) {
    try {
      const [result] = await pool.query(
        "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
        [articleId, tagId]
      );

      return result.insertId;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 移除文章标签
   */
  async removeArticleTag(articleId, tagId) {
    try {
      const [result] = await pool.query(
        "DELETE FROM article_tags WHERE article_id = ? AND tag_id = ?",
        [articleId, tagId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      throw err;
    }
  }
}

module.exports = new ArticleService();
