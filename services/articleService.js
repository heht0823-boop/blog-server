const { pool } = require("../config/db");

class ArticleService {
  /**
   * 创建文章
   */
  async createArticle(articleData) {
    const { title, content, cover, categoryId, userId, status, tags } =
      articleData;

    // 开始事务
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 插入文章
      const [articleResult] = await connection.query(
        "INSERT INTO articles (title, content, cover, category_id, user_id, status) VALUES (?, ?, ?, ?, ?, ?)",
        [
          title,
          content,
          cover || "https://picsum.photos/800/400",
          categoryId,
          userId,
          status || 1,
        ]
      );

      const articleId = articleResult.insertId;

      // 处理标签关联
      if (tags && Array.isArray(tags) && tags.length > 0) {
        // 插入标签关联
        const tagInsertPromises = tags.map((tagId) =>
          connection.query(
            "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
            [articleId, tagId]
          )
        );
        await Promise.all(tagInsertPromises);
      }

      await connection.commit();
      return articleId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
  /**
   * 获取文章列表（分页）
   */
  async getArticles(
    page = 1,
    pageSize = 10,
    categoryId = null,
    tagId = null,
    status = null,
    isAdmin = false
  ) {
    const offset = (page - 1) * pageSize;

    let baseQuery = `
    SELECT a.id, a.title, a.content, a.cover, a.read_count, a.is_top, a.status, 
           a.create_time, a.update_time, a.user_id, a.category_id,
           u.username as author_username, u.nickname as author_nickname, u.avatar as author_avatar,
           c.name as category_name
    FROM articles a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN categories c ON a.category_id = c.id
  `;

    let countQuery = `
    SELECT COUNT(*) as total
    FROM articles a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN categories c ON a.category_id = c.id
  `;

    const whereConditions = [];
    const params = [];

    // 添加筛选条件
    if (categoryId) {
      whereConditions.push("a.category_id = ?");
      params.push(categoryId);
    }

    if (tagId) {
      baseQuery += " LEFT JOIN article_tags at ON a.id = at.article_id";
      countQuery += " LEFT JOIN article_tags at ON a.id = at.article_id";
      whereConditions.push("at.tag_id = ?");
      params.push(tagId);
    }

    // 管理员可以查看所有状态的文章，普通用户只能查看已发布的文章
    if (status !== null) {
      whereConditions.push("a.status = ?");
      params.push(status);
    } else if (!isAdmin) {
      whereConditions.push("a.status = 1");
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const [countResult] = await pool.query(
      countQuery + " " + whereClause,
      params
    );
    const total = countResult[0].total;

    // 添加排序和分页
    baseQuery += ` ${whereClause} ORDER BY a.is_top DESC, a.create_time DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, pageSize, offset];
    const [articles] = await pool.query(baseQuery, queryParams);

    // 获取每篇文章的标签
    for (let article of articles) {
      const [tags] = await pool.query(
        `SELECT t.id, t.name 
       FROM tags t 
       INNER JOIN article_tags at ON t.id = at.tag_id 
       WHERE at.article_id = ?`,
        [article.id]
      );
      article.tags = tags;
    }

    return { total, articles };
  }

  /**
   * 获取文章详情
   */
  async getArticleById(articleId) {
    // 获取文章详情
    const [articles] = await pool.query(
      `
    SELECT a.id, a.title, a.content, a.cover, a.read_count, a.is_top, a.status, 
           a.create_time, a.update_time, a.user_id, a.category_id,
           u.username as author_username, u.nickname as author_nickname, u.avatar as author_avatar,
           c.name as category_name
    FROM articles a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.id = ?
  `,
      [articleId]
    );

    if (articles.length === 0) {
      return null;
    }

    const article = articles[0];

    // 获取文章标签
    article.tags = await this._getArticleTags(article.id);

    // 增加阅读量（异步执行，不影响返回结果）
    pool
      .query("UPDATE articles SET read_count = read_count + 1 WHERE id = ?", [
        articleId,
      ])
      .catch((err) => {
        console.error("增加阅读量失败:", err);
      });

    return article;
  }

  /**
   * 更新文章
   */
  async updateArticle(articleId, articleData) {
    const { title, content, cover, categoryId, status, tags } = articleData;

    // 开始事务
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 更新文章
      const fields = [];
      const values = [];

      if (title !== undefined) {
        fields.push("title = ?");
        values.push(title);
      }

      if (content !== undefined) {
        fields.push("content = ?");
        values.push(content);
      }

      if (cover !== undefined) {
        fields.push("cover = ?");
        values.push(cover);
      }

      if (categoryId !== undefined) {
        fields.push("category_id = ?");
        values.push(categoryId);
      }

      if (status !== undefined) {
        fields.push("status = ?");
        values.push(status);
      }

      if (fields.length > 0) {
        values.push(articleId);
        await connection.query(
          `UPDATE articles SET ${fields.join(
            ", "
          )}, update_time = NOW() WHERE id = ?`,
          values
        );
      }

      // 更新标签关联
      if (tags !== undefined) {
        // 删除原有标签关联
        await connection.query(
          "DELETE FROM article_tags WHERE article_id = ?",
          [articleId]
        );

        // 插入新标签关联
        if (Array.isArray(tags) && tags.length > 0) {
          const tagInsertPromises = tags.map((tagId) =>
            connection.query(
              "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
              [articleId, tagId]
            )
          );
          await Promise.all(tagInsertPromises);
        }
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
   * 删除文章
   */
  async deleteArticle(articleId) {
    const [result] = await pool.query("DELETE FROM articles WHERE id = ?", [
      articleId,
    ]);
    return result.affectedRows > 0;
  }

  /**
   * 置顶文章
   */
  async toggleTopStatus(articleId, isTop) {
    const [result] = await pool.query(
      "UPDATE articles SET is_top = ? WHERE id = ?",
      [isTop ? 1 : 0, articleId]
    );
    return result.affectedRows > 0;
  }

  /**
   * 获取文章统计信息
   */
  async getArticleStats() {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as totalArticles,
        COUNT(CASE WHEN status = 1 THEN 1 END) as publishedArticles,
        COUNT(CASE WHEN is_top = 1 THEN 1 END) as topArticles,
        SUM(read_count) as totalReadCount
      FROM articles
    `);

    return stats[0];
  }
  /**
   * 获取文章标签
   * @private
   */
  async _getArticleTags(articleId) {
    const [tags] = await pool.query(
      `SELECT t.id, t.name 
     FROM tags t 
     INNER JOIN article_tags at ON t.id = at.tag_id 
     WHERE at.article_id = ?`,
      [articleId]
    );
    return tags;
  }

  /**
   * 搜索文章
   */
  searchArticles = asyncHandler(async (req, res, next) => {
    try {
      const { keyword, page = 1, pageSize = 10 } = req.query;

      const result = await articleService.searchArticles(
        keyword,
        parseInt(page),
        parseInt(pageSize)
      );

      successResponse(
        res,
        {
          total: result.total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          articles: result.articles,
          keyword,
        },
        "搜索成功"
      );
    } catch (err) {
      next(err);
    }
  });
}

module.exports = new ArticleService();
