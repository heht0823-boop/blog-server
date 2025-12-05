const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

class UserService {
  /**
   * 创建用户（注册）
   * @param {Object} userData - 用户数据 { username, password, nickname }
   * @returns {number} 新用户 ID
   */
  async createUser(userData) {
    const { username, password, nickname } = userData;

    try {
      // 密码加密（盐值10：平衡安全和性能）
      const salt = await bcrypt.genSalt(10);
      const hashedPwd = await bcrypt.hash(password, salt);

      const [result] = await pool.query(
        "INSERT INTO users (username, password, nickname, role, createdAt) VALUES (?, ?, ?, ?, NOW())",
        [username, hashedPwd, nickname || username, 0] // 0: 普通用户
      );

      return result.insertId; // 返回新用户 ID
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        throw new Error("用户名已存在");
      }
      throw err;
    }
  }

  /**
   * 验证用户（登录）
   * @param {string} username - 用户名
   * @param {string} password - 明文密码
   * @returns {Object|null} 用户信息（不包含密码）或 null
   */
  async verifyUser(username, password) {
    try {
      // 1. 查询用户
      const [users] = await pool.query(
        "SELECT id, username, password, nickname, avatar, role, createdAt FROM users WHERE username = ?",
        [username]
      );

      if (users.length === 0) {
        return null; // 用户不存在
      }

      const user = users[0];

      // 2. 验证密码（bcrypt.compare 不解密，只对比）
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return null; // 密码错误
      }

      // 3. 删除敏感字段
      delete user.password;

      return user;
    } catch (err) {
      console.error("验证用户失败：", err);
      throw err;
    }
  }

  /**
   * 通过用户名获取用户（仅检查是否存在）
   * @param {string} username - 用户名
   * @returns {Object|null} 用户 ID 或 null
   */
  async getUserByUsername(username) {
    try {
      const [users] = await pool.query(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );
      return users[0] || null;
    } catch (err) {
      console.error("查询用户名失败：", err);
      throw err;
    }
  }

  /**
   * 通过 ID 获取用户信息（完整）
   * @param {number} userId - 用户 ID
   * @returns {Object|null} 用户信息或 null
   */
  async getUserById(userId) {
    try {
      const [users] = await pool.query(
        "SELECT id, username, nickname, avatar, role, createdAt, updatedAt FROM users WHERE id = ?",
        [userId]
      );
      return users[0] || null;
    } catch (err) {
      console.error("获取用户信息失败：", err);
      throw err;
    }
  }

  /**
   * 更新用户信息
   * @param {number} userId - 用户 ID
   * @param {Object} updateData - 更新数据 { nickname, avatar }
   * @returns {number} 受影响行数
   */
  async updateUser(userId, updateData) {
    try {
      // 1. 字段白名单（防止权限提升）
      const allowedFields = ["nickname", "avatar"];
      const fields = [];
      const values = [];

      // 2. 构造 UPDATE 语句
      Object.entries(updateData).forEach(([key, value]) => {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      // 3. 如果没有需要更新的字段，直接返回
      if (fields.length === 0) {
        return 0;
      }

      // 4. 添加 userId 到参数列表
      values.push(userId);

      // 5. 执行更新
      const [result] = await pool.query(
        `UPDATE users SET ${fields.join(", ")}, updatedAt = NOW() WHERE id = ?`,
        values
      );

      return result.affectedRows; // 返回受影响行数
    } catch (err) {
      console.error("更新用户信息失败：", err);
      throw err;
    }
  }

  /**
   * 更新用户密码（需验证旧密码）
   * @param {number} userId - 用户 ID
   * @param {string} oldPassword - 旧密码（明文）
   * @param {string} newPassword - 新密码（明文）
   * @returns {boolean} 是否更新成功
   */
  async updatePassword(userId, oldPassword, newPassword) {
    try {
      // 1. 获取用户当前密码哈希
      const [users] = await pool.query(
        "SELECT password FROM users WHERE id = ?",
        [userId]
      );

      if (users.length === 0) {
        throw new Error("用户不存在");
      }

      // 2. 验证旧密码
      const isMatch = await bcrypt.compare(oldPassword, users[0].password);
      if (!isMatch) {
        throw new Error("旧密码错误");
      }

      // 3. 检查新密码是否与旧密码相同
      const isSamePassword = await bcrypt.compare(
        newPassword,
        users[0].password
      );
      if (isSamePassword) {
        throw new Error("新密码不能与旧密码相同");
      }

      // 4. 加密新密码
      const salt = await bcrypt.genSalt(10);
      const hashedPwd = await bcrypt.hash(newPassword, salt);

      // 5. 更新数据库
      const [result] = await pool.query(
        "UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?",
        [hashedPwd, userId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("更新密码失败：", err);
      throw err;
    }
  }

  /**
   * 获取所有用户（管理员功能）
   * @param {number} page - 页码（从 1 开始）
   * @param {number} pageSize - 每页条数
   * @returns {Object} { total, users }
   */
  async getAllUsers(page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;

      // 1. 获取总数
      const [countResult] = await pool.query(
        "SELECT COUNT(*) as total FROM users"
      );
      const total = countResult[0].total;

      // 2. 获取分页数据
      const [users] = await pool.query(
        "SELECT id, username, nickname, avatar, role, createdAt FROM users LIMIT ? OFFSET ?",
        [pageSize, offset]
      );

      return { total, users };
    } catch (err) {
      console.error("获取用户列表失败：", err);
      throw err;
    }
  }

  /**
   * 删除用户（软删除）
   * @param {number} userId - 用户 ID
   * @returns {boolean} 是否删除成功
   */
  async deleteUser(userId) {
    try {
      // 使用软删除：标记删除而不真的删除数据
      const [result] = await pool.query(
        "UPDATE users SET deletedAt = NOW() WHERE id = ? AND deletedAt IS NULL",
        [userId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("删除用户失败：", err);
      throw err;
    }
  }

  /**
   * 检查用户是否存在
   * @param {number} userId - 用户 ID
   * @returns {boolean} 用户是否存在
   */
  async userExists(userId) {
    try {
      const [users] = await pool.query(
        "SELECT id FROM users WHERE id = ? AND deletedAt IS NULL",
        [userId]
      );
      return users.length > 0;
    } catch (err) {
      console.error("检查用户存在失败：", err);
      throw err;
    }
  }

  /**
   * 获取用户统计信息（管理员功能）
   * @returns {Object} 统计信息
   */
  async getUserStats() {
    try {
      const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as totalUsers,
          COUNT(CASE WHEN role = 1 THEN 1 END) as adminCount,
          COUNT(CASE WHEN DATE(createdAt) = CURDATE() THEN 1 END) as todayNewUsers,
          COUNT(CASE WHEN deletedAt IS NOT NULL THEN 1 END) as deletedUsers
        FROM users
      `);

      return stats[0];
    } catch (err) {
      console.error("获取用户统计失败：", err);
      throw err;
    }
  }

  /**
   * 升级用户为管理员
   * @param {number} userId - 用户 ID
   * @returns {boolean} 是否升级成功
   */
  async promoteToAdmin(userId) {
    try {
      const [result] = await pool.query(
        "UPDATE users SET role = 1 WHERE id = ? AND role = 0",
        [userId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("升级管理员失败：", err);
      throw err;
    }
  }

  /**
   * 降级用户为普通用户
   * @param {number} userId - 用户 ID
   * @returns {boolean} 是否降级成功
   */
  async demoteToUser(userId) {
    try {
      const [result] = await pool.query(
        "UPDATE users SET role = 0 WHERE id = ? AND role = 1",
        [userId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("降级用户失败：", err);
      throw err;
    }
  }

  /**
   * 记录用户登录日志
   * @param {number} userId - 用户 ID
   * @param {boolean} success - 是否登录成功
   * @param {string} ip - 客户端 IP
   */
  async logLoginAttempt(userId, success, ip) {
    try {
      await pool.query(
        "INSERT INTO login_logs (userId, success, ip, createdAt) VALUES (?, ?, ?, NOW())",
        [userId, success ? 1 : 0, ip]
      );
    } catch (err) {
      console.error("记录登录日志失败：", err);
      // 不抛出异常，因为这不是关键操作
    }
  }
}

module.exports = new UserService();
