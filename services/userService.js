const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

class UserService {
  /**
   * 创建用户（注册）
   */
  async createUser(userData) {
    const { username, password, nickname } = userData;

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPwd = await bcrypt.hash(password, salt);

      const [result] = await pool.query(
        "INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)",
        [username, hashedPwd, nickname || username, 0],
      );

      return result.insertId;
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        throw new Error("用户名已存在");
      }
      throw err;
    }
  }

  /**
   * 验证用户（登录）
   */
  async verifyUser(username, password) {
    const [users] = await pool.query(
      "SELECT id, username, password, nickname, avatar, role, create_time FROM users WHERE username = ?",
      [username],
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return null;
    }

    delete user.password;
    return user;
  }

  /**
   * 通过用户名获取用户
   */
  async getUserByUsername(username) {
    const [users] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );
    return users[0] || null;
  }

  /**
   * 通过 ID 获取用户信息
   */
  async getUserById(userId) {
    const [users] = await pool.query(
      "SELECT id, username, nickname, avatar, role, create_time, update_time FROM users WHERE id = ?",
      [userId],
    );
    return users[0] || null;
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, updateData) {
    const allowedFields = ["nickname", "avatar"];
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

    values.push(userId);

    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(", ")}, update_time = NOW() WHERE id = ?`,
      values,
    );

    return result.affectedRows;
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId, oldPassword, newPassword) {
    const [users] = await pool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) {
      throw new Error("用户不存在");
    }

    const isMatch = await bcrypt.compare(oldPassword, users[0].password);
    if (!isMatch) {
      throw new Error("旧密码错误");
    }

    const isSamePassword = await bcrypt.compare(newPassword, users[0].password);
    if (isSamePassword) {
      throw new Error("新密码不能与旧密码相同");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(newPassword, salt);

    const [result] = await pool.query(
      "UPDATE users SET password = ?, update_time = NOW() WHERE id = ?",
      [hashedPwd, userId],
    );

    return result.affectedRows > 0;
  }

  /**
   * 获取所有用户（分页 + 筛选）
   */
  async getAllUsers(
    page = 1,
    pageSize = 10,
    role = undefined,
    search = undefined,
  ) {
    const offset = (page - 1) * pageSize;

    let countQuery = "SELECT COUNT(*) as total FROM users";
    let dataQuery =
      "SELECT id, username, nickname, avatar, role, create_time FROM users";
    const countParams = [];
    const dataParams = [];

    // 构建筛选条件
    const conditions = [];
    if (role !== undefined && role !== null) {
      conditions.push("role = ?");
      countParams.push(role);
      dataParams.push(role);
    }
    if (search) {
      conditions.push("(username LIKE ? OR nickname LIKE ?)");
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
      dataParams.push(searchTerm, searchTerm);
    }

    // 如果有条件则拼接 WHERE 子句
    if (conditions.length > 0) {
      const whereClause = conditions.join(" AND ");
      countQuery += ` WHERE ${whereClause}`;
      dataQuery += ` WHERE ${whereClause}`;
    }

    // 执行总数查询
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    // 执行分页数据查询
    dataQuery += " ORDER BY id DESC LIMIT ? OFFSET ?";
    dataParams.push(pageSize, offset);

    const [users] = await pool.query(dataQuery, dataParams);

    return { total, users };
  }
  /**
   * 删除用户
   */
  async deleteUser(userId) {
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [
      userId,
    ]);

    return result.affectedRows > 0;
  }
  /**
   * 获取用户主页信息
   */
  async getUserProfilePage(
    userId,
    currentUserId = null,
    page = 1,
    pageSize = 10,
  ) {
    const offset = (page - 1) * pageSize;

    // 1. 获取用户基础信息
    const [users] = await pool.query(
      "SELECT id, username, nickname, avatar, role, create_time FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // 2. 获取用户统计数据
    const stats = await this.getUserStatsByUserId(userId);

    // 3. 获取用户发布的文章（分页）
    const publishedArticles = await this.getPublishedArticles(
      userId,
      page,
      pageSize,
    );

    // 4. 获取用户收藏的文章（分页）
    const collectedArticles = await this.getCollectedArticles(
      userId,
      page,
      pageSize,
    );

    // 5. 获取用户点赞的文章（分页）
    const likedArticles = await this.getLikedArticles(userId, page, pageSize);

    // 6. 获取用户发布的评论（分页）
    const publishedComments = await this.getUserComments(
      userId,
      page,
      pageSize,
    );

    return {
      userInfo: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
        createTime: this.formatDateTime(user.create_time),
        ...stats,
      },
      publishedArticles,
      collectedArticles,
      likedArticles,
      publishedComments,
    };
  }

  /**
   * 获取用户统计数据
   */
  async getUserStatsByUserId(userId) {
    const [stats] = await pool.query(
      `
    SELECT 
      COUNT(DISTINCT a.id) as articleTotal,
      COUNT(DISTINCT c.id) as commentTotal,
      COALESCE(SUM(a.like_count), 0) as likeTotal,
      COALESCE(SUM(a.collect_count), 0) as collectTotal
    FROM users u
    LEFT JOIN articles a ON u.id = a.user_id AND a.status = 1
    LEFT JOIN comments c ON u.id = c.user_id
    WHERE u.id = ?
  `,
      [userId],
    );

    return {
      articleTotal: stats[0].articleTotal || 0,
      commentTotal: stats[0].commentTotal || 0,
      likeTotal: stats[0].likeTotal || 0,
      collectTotal: stats[0].collectTotal || 0,
    };
  }

  /**
   * 获取用户发布的文章（分页）
   */
  async getPublishedArticles(userId, page, pageSize) {
    const offset = (page - 1) * pageSize;

    // 获取总数
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM articles WHERE user_id = ? AND status = 1",
      [userId],
    );

    // 获取文章列表
    const [articles] = await pool.query(
      `
    SELECT 
      a.id as articleId,
      a.title,
      a.cover,
      a.read_count as readCount,
      a.like_count as likeCount,
      a.collect_count as collectCount,
      a.create_time as createTime,
      c.name as categoryName
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.user_id = ? AND a.status = 1
    ORDER BY a.create_time DESC
    LIMIT ? OFFSET ?
  `,
      [userId, pageSize, offset],
    );

    return {
      total: countResult[0].total,
      list: articles.map((article) => ({
        ...article,
        createTime: this.formatDateTime(article.createTime),
      })),
    };
  }

  /**
   * 获取用户收藏的文章（分页）
   */
  async getCollectedArticles(userId, page, pageSize) {
    const offset = (page - 1) * pageSize;

    // 获取总数
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM article_collections WHERE user_id = ?",
      [userId],
    );

    // 获取收藏文章列表
    const [articles] = await pool.query(
      `
    SELECT 
      a.id as articleId,
      a.title,
      a.cover,
      u.nickname as authorNickname,
      a.create_time as createTime,
      ac.create_time as collectTime
    FROM article_collections ac
    INNER JOIN articles a ON ac.article_id = a.id
    INNER JOIN users u ON a.user_id = u.id
    WHERE ac.user_id = ? AND a.status = 1
    ORDER BY ac.create_time DESC
    LIMIT ? OFFSET ?
  `,
      [userId, pageSize, offset],
    );

    return {
      total: countResult[0].total,
      list: articles.map((article) => ({
        ...article,
        createTime: this.formatDateTime(article.createTime),
        collectTime: this.formatDateTime(article.collectTime),
      })),
    };
  }

  /**
   * 获取用户点赞的文章（分页）
   */
  async getLikedArticles(userId, page, pageSize) {
    const offset = (page - 1) * pageSize;

    // 获取总数
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM article_likes WHERE user_id = ?",
      [userId],
    );

    // 获取点赞文章列表
    const [articles] = await pool.query(
      `
    SELECT 
      a.id as articleId,
      a.title,
      a.cover,
      u.nickname as authorNickname,
      al.create_time as likeTime
    FROM article_likes al
    INNER JOIN articles a ON al.article_id = a.id
    INNER JOIN users u ON a.user_id = u.id
    WHERE al.user_id = ? AND a.status = 1
    ORDER BY al.create_time DESC
    LIMIT ? OFFSET ?
  `,
      [userId, pageSize, offset],
    );

    return {
      total: countResult[0].total,
      list: articles.map((article) => ({
        ...article,
        likeTime: this.formatDateTime(article.likeTime),
      })),
    };
  }

  /**
   * 获取用户发布的评论（分页）
   */
  async getUserComments(userId, page, pageSize) {
    const offset = (page - 1) * pageSize;

    // 获取总数
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM comments WHERE user_id = ?",
      [userId],
    );

    // 获取评论列表
    const [comments] = await pool.query(
      `
    SELECT 
      c.id as commentId,
      c.content,
      c.create_time as createTime,
      a.id as articleId,
      a.title as articleTitle
    FROM comments c
    INNER JOIN articles a ON c.article_id = a.id
    WHERE c.user_id = ?
    ORDER BY c.create_time DESC
    LIMIT ? OFFSET ?
  `,
      [userId, pageSize, offset],
    );

    return {
      total: countResult[0].total,
      list: comments.map((comment) => ({
        ...comment,
        createTime: this.formatDateTime(comment.createTime),
      })),
    };
  }

  /**
   * 格式化日期时间
   */
  formatDateTime(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

module.exports = new UserService();
