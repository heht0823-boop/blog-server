const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

class UserService {
  /**
   * 创建用户（注册）
   */
  async createUser(userData) {
    const { username, password, nickname } = userData;

    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)",
      [username, hashedPwd, nickname || username, 0]
    );

    return result.insertId;
  }

  /**
   * 验证用户（登录）
   */
  async verifyUser(username, password) {
    const [users] = await pool.query(
      "SELECT id, username, password, nickname, avatar, role FROM users WHERE username = ?",
      [username]
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
      [username]
    );
    return users[0] || null;
  }

  /**
   * 通过 ID 获取用户信息
   */
  async getUserById(userId) {
    const [users] = await pool.query(
      "SELECT id, username, nickname, avatar, role, create_time, update_time FROM users WHERE id = ?",
      [userId]
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
      `UPDATE users SET ${fields.join(
        ", "
      )}, update_time = NOW() WHERE id = ?`,
      values
    );

    return result.affectedRows;
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId, oldPassword, newPassword) {
    const [users] = await pool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      throw new Error("用户不存在");
    }

    const isMatch = await bcrypt.compare(oldPassword, users[0].password);
    if (!isMatch) {
      throw new Error("旧密码错误");
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      users[0].password
    );
    if (isSamePassword) {
      throw new Error("新密码不能与旧密码相同");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(newPassword, salt);

    const [result] = await pool.query(
      "UPDATE users SET password = ?, update_time = NOW() WHERE id = ?",
      [hashedPwd, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 获取所有用户（分页）
   */
  async getAllUsers(page = 1, pageSize = 10, role = undefined) {
    const offset = (page - 1) * pageSize;

    let countQuery = "SELECT COUNT(*) as total FROM users";
    let dataQuery =
      "SELECT id, username, nickname, avatar, role, create_time FROM users";
    const countParams = [];
    const dataParams = [];

    if (role !== undefined) {
      countQuery += " WHERE role = ?";
      dataQuery += " WHERE role = ?";
      countParams.push(role);
      dataParams.push(role);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

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
   * 获取用户统计信息
   */
  async getUserStats() {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN role = 1 THEN 1 END) as adminCount
      FROM users
    `);

    return stats[0];
  }

  /**
   * 升级用户为管理员
   */
  async promoteToAdmin(userId) {
    const [result] = await pool.query(
      "UPDATE users SET role = 1 WHERE id = ? AND role = 0",
      [userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 降级用户为普通用户
   */
  async demoteToUser(userId) {
    const [result] = await pool.query(
      "UPDATE users SET role = 0 WHERE id = ? AND role = 1",
      [userId]
    );

    return result.affectedRows > 0;
  }
}

module.exports = new UserService();