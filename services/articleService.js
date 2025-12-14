const { pool } = require("../config/db");

class ArticleService {
  /**
   * 创建文章
   */
  async createArticle(articleData) {
    const { title, content, cover, category_id, user_id } = articleData;

    try {
      // 检查是否已存在相同标题的文章
      const [existingArticles] = await pool.query(
        "SELECT id FROM articles WHERE title = ?",
        [title]
      );

      if (existingArticles.length > 0) {
        throw new Error("已存在相同标题的文章");
      }

      // 如果提供了 category_id，则验证该分类是否存在
      if (category_id !== undefined && category_id !== null) {
        // 确保 category_id 是有效数字
        const categoryIdNum = parseInt(category_id, 10);
        if (isNaN(categoryIdNum)) {
          throw new Error("分类ID格式不正确");
        }

        const [categories] = await pool.query(
          "SELECT id FROM categories WHERE id = ?",
          [categoryIdNum]
        );

        if (categories.length === 0) {
          throw new Error("指定的分类不存在");
        }
      }

      // 处理 category_id，如果为 null 或 undefined 则设置为 null
      const categoryId =
        category_id !== undefined && category_id !== null
          ? parseInt(category_id, 10)
          : null;

      const [result] = await pool.query(
        `INSERT INTO articles (title, content, cover, category_id, status, user_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
        [title, content, cover, categoryId, 0, user_id]
      );

      return result.insertId;
    } catch (err) {
      throw err;
    }
  }
  /**
   * 获取文章列表（分页）
   */
  async getArticles(page = 1, pageSize = 10, filters = {}, userRole = "user") {
    try {
      const offset = (page - 1) * pageSize;
      let query = `
      SELECT DISTINCT a.*, u.username as author_name, c.name as category_name 
      FROM articles a 
      LEFT JOIN users u ON a.user_id = u.id 
      LEFT JOIN categories c ON a.category_id = c.id 
      WHERE 1=1`;
      const params = [];
      const countParams = [];

      // 应用过滤条件
      if (filters.category_id) {
        query += " AND a.category_id = ?";
        params.push(filters.category_id);
        countParams.push(filters.category_id);
      }

      if (filters.user_id) {
        query += " AND a.user_id = ?";
        params.push(filters.user_id);
        countParams.push(filters.user_id);
      }

      // 标签过滤
      if (filters.tag_id) {
        query +=
          " AND EXISTS (SELECT 1 FROM article_tags at WHERE at.article_id = a.id AND at.tag_id = ?)";
        params.push(filters.tag_id);
        countParams.push(filters.tag_id);
      }

      // 权限控制
      if (userRole !== "admin") {
        // 普通用户或未登录用户只能查看已发布文章
        query += " AND a.status = 1";
      } else if (filters.status !== undefined) {
        // 管理员可以指定status过滤
        query += " AND a.status = ?";
        params.push(filters.status);
        countParams.push(filters.status);
      }
      // 如果管理员没有指定status，则不添加状态过滤条件，返回所有状态的文章

      query += " ORDER BY a.create_time DESC LIMIT ? OFFSET ?";
      params.push(pageSize, offset);

      const [articles] = await pool.query(query, params);

      // 获取总数
      let countQuery = `
      SELECT COUNT(DISTINCT a.id) as total 
      FROM articles a 
      WHERE 1=1`;

      if (filters.category_id) {
        countQuery += " AND a.category_id = ?";
      }

      if (filters.user_id) {
        countQuery += " AND a.user_id = ?";
      }

      // 标签过滤
      if (filters.tag_id) {
        countQuery +=
          " AND EXISTS (SELECT 1 FROM article_tags at WHERE at.article_id = a.id AND at.tag_id = ?)";
      }

      // 权限控制
      if (userRole !== "admin") {
        // 普通用户或未登录用户只能查看已发布文章
        countQuery += " AND a.status = 1";
      } else if (filters.status !== undefined) {
        // 管理员可以指定status过滤
        countQuery += " AND a.status = ?";
      }
      // 如果管理员没有指定status，则不添加状态过滤条件，返回所有状态的文章

      const [countResult] = await pool.query(countQuery, countParams);
      const total = countResult[0].total;

      return { total, articles };
    } catch (err) {
      throw err;
    }
  }
  /**
   * 获取单篇文章详情（带权限控制）
   */
  async getArticleById(articleId, userRole = "user") {
    try {
      let query = "SELECT * FROM articles WHERE id = ?";
      const params = [articleId];

      // 非管理员只能查看已发布文章
      if (userRole !== "admin") {
        query += " AND status = 1";
      }

      const [articles] = await pool.query(query, params);

      return articles[0] || null;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 更新文章（仅管理员可修改status为1）
   */
  async updateArticle(articleId, updateData, userRole = "user") {
    const allowedFields = [
      "title",
      "content",
      "cover",
      "category_id",
      "status",
      "is_top",
    ];
    const fields = [];
    const values = [];

    // 如果提供了 category_id，则验证该分类是否存在
    if (
      updateData.category_id !== undefined &&
      updateData.category_id !== null
    ) {
      const categoryIdNum = parseInt(updateData.category_id, 10);
      if (isNaN(categoryIdNum)) {
        throw new Error("分类ID格式不正确");
      }

      const [categories] = await pool.query(
        "SELECT id FROM categories WHERE id = ?",
        [categoryIdNum]
      );

      if (categories.length === 0) {
        throw new Error("指定的分类不存在");
      }

      // 更新数据中的 category_id 为验证后的数字
      updateData.category_id = categoryIdNum;
    }

    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        // 权限控制：只有管理员可以将status设置为1
        if (key === "status" && value === 1 && userRole !== "admin") {
          return; // 普通用户无法修改status为1
        }
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
  async searchArticles(keyword, page = 1, pageSize = 10, userRole = "user") {
    try {
      const offset = (page - 1) * pageSize;
      // 去除关键词两端的引号和空格
      const cleanKeyword = keyword.replace(/^["']|["']$/g, "").trim();
      const searchTerm = `%${cleanKeyword}%`;

      let baseQuery = `SELECT * FROM articles 
                     WHERE (title LIKE ? OR content LIKE ?)`;
      let baseCountQuery = `SELECT COUNT(*) as total FROM articles 
                          WHERE (title LIKE ? OR content LIKE ?)`;

      const queryParams = [searchTerm, searchTerm];
      const countParams = [searchTerm, searchTerm];

      // 权限控制：非管理员只能搜索已发布文章
      if (userRole !== "admin") {
        baseQuery += " AND status = 1";
        baseCountQuery += " AND status = 1";
      }

      const [articles] = await pool.query(
        `${baseQuery} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [...queryParams, pageSize, offset]
      );

      const [countResult] = await pool.query(baseCountQuery, countParams);
      const total = countResult[0].total;

      return { total, articles };
    } catch (err) {
      throw err;
    }
  }
  /**
   * 获取文章统计（增强版）
   */
  async getArticleStats(userId = null) {
    try {
      const params = [];
      let whereClause = "";
      let whereClauseForTrend = ""; // 单独为趋势统计准备的where子句

      if (userId) {
        whereClause = "WHERE a.user_id = ?";
        whereClauseForTrend = "AND a.user_id = ?";
        params.push(userId);
      }

      // 获取总文章数
      const [totalResult] = await pool.query(
        `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
        params
      );
      const total = totalResult[0].total;

      // 获取分类统计
      const categoryParams = userId ? [userId] : [];
      const [categoryStats] = await pool.query(
        `SELECT c.id as category_id, c.name, COUNT(a.id) as count 
       FROM categories c 
       LEFT JOIN articles a ON c.id = a.category_id ${
         userId ? "AND a.user_id = ?" : ""
       }
       GROUP BY c.id, c.name 
       HAVING count > 0`,
        categoryParams
      );

      // 获取状态统计
      const [statusStats] = await pool.query(
        `SELECT a.status, 
              CASE WHEN a.status = 1 THEN '已发布' ELSE '草稿' END as name, 
              COUNT(*) as count 
       FROM articles a ${whereClause} 
       GROUP BY a.status`,
        params
      );

      // 获取时间趋势统计（近7天）
      const trendParams = userId ? [userId, userId] : [];
      const [trendStats] = await pool.query(
        `SELECT DATE(a.create_time) as date, COUNT(*) as count 
       FROM articles a 
       WHERE a.create_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
       ${userId ? "AND a.user_id = ?" : ""}
       GROUP BY DATE(a.create_time) 
       ORDER BY date`,
        trendParams
      );

      // 获取置顶统计
      const [topStatsResult] = await pool.query(
        `SELECT 
         SUM(CASE WHEN a.is_top = 1 THEN 1 ELSE 0 END) as top,
         SUM(CASE WHEN a.is_top = 0 OR a.is_top IS NULL THEN 1 ELSE 0 END) as not_top
       FROM articles a ${whereClause}`,
        params
      );
      const topStats = topStatsResult[0];

      return {
        total,
        category_stats: categoryStats,
        status_stats: statusStats,
        trend_stats: trendStats,
        top_stats: {
          top: parseInt(topStats.top) || 0,
          not_top: parseInt(topStats.not_top) || 0,
        },
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取热门文章
   */
  async getPopularArticles(limit = 10, userRole = "user") {
    try {
      let query = `SELECT * FROM articles WHERE 1=1`;
      const params = [];

      // 权限控制：非管理员只能获取已发布文章
      if (userRole !== "admin") {
        query += " AND status = 1";
      }

      query += " ORDER BY read_count DESC LIMIT ?";
      params.push(limit);

      const [articles] = await pool.query(query, params);

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
        "UPDATE articles SET read_count = read_count + 1 WHERE id = ?",
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
  async getArticlesByCategory(
    categoryId,
    page = 1,
    pageSize = 10,
    userRole = "user"
  ) {
    try {
      const offset = (page - 1) * pageSize;

      let query = `SELECT * FROM articles WHERE category_id = ?`;
      const params = [categoryId];

      // 权限控制：非管理员只能获取已发布文章
      if (userRole !== "admin") {
        query += " AND status = 1";
      }

      query += " ORDER BY create_time DESC LIMIT ? OFFSET ?";
      params.push(pageSize, offset);

      const [articles] = await pool.query(query, params);

      // 获取总数
      let countQuery =
        "SELECT COUNT(*) as total FROM articles WHERE category_id = ?";
      const countParams = [categoryId];

      if (userRole !== "admin") {
        countQuery += " AND status = 1";
      }

      const [countResult] = await pool.query(countQuery, countParams);
      const total = countResult[0].total;

      return { total, articles };
    } catch (err) {
      throw err;
    }
  }

  /**
   * 获取用户文章列表（带权限控制）
   */
  async getUserArticles(
    userId,
    page = 1,
    pageSize = 10,
    currentUserRole = "user",
    currentUserId = null
  ) {
    try {
      const offset = (page - 1) * pageSize;

      let query = `SELECT * FROM articles WHERE user_id = ?`;
      let countQuery =
        "SELECT COUNT(*) as total FROM articles WHERE user_id = ?";
      const params = [userId];
      const countParams = [userId];

      // 非管理员且不是查看自己的文章时，只显示已发布文章
      if (currentUserRole !== "admin" && currentUserId !== userId) {
        query += " AND status = 1";
        countQuery += " AND status = 1";
      }

      query += " ORDER BY create_time DESC LIMIT ? OFFSET ?";
      params.push(pageSize, offset);

      const [articles] = await pool.query(query, params);

      const [countResult] = await pool.query(countQuery, countParams);

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
   * 添加文章标签（避免重复关联）
   */
  async addArticleTag(articleId, tagId) {
    try {
      // 先检查是否已存在关联
      const [existing] = await pool.query(
        "SELECT 1 FROM article_tags WHERE article_id = ? AND tag_id = ?",
        [articleId, tagId]
      );

      // 如果已存在，则不重复插入
      if (existing.length > 0) {
        return null; // 或者抛出特定错误
      }

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

  /**
   * 验证文章所有权
   */
  async verifyArticleOwnership(articleId, userId, userRole) {
    try {
      const [articles] = await pool.query(
        "SELECT user_id FROM articles WHERE id = ?",
        [articleId]
      );

      if (articles.length === 0) {
        throw new Error("文章不存在");
      }

      // 统一使用字符串形式判断角色
      if (userRole !== "admin" && articles[0].user_id != userId) {
        throw new Error("无权操作此文章");
      }

      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 清除文章的所有标签关联
   */
  async clearArticleTags(articleId) {
    try {
      const [result] = await pool.query(
        "DELETE FROM article_tags WHERE article_id = ?",
        [articleId]
      );
      return result.affectedRows;
    } catch (err) {
      throw err;
    }
  }
}

module.exports = new ArticleService();
