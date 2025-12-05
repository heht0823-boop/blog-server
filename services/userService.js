const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

class UserService {
  // 注册：创建用户
  async createUser(userData) {
    const { username, password, nickname } = userData;
    // 密码加密（盐值10）
    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)",
      [username, hashedPwd, nickname || username]
    );
    return result.insertId; // 返回新用户ID
  }

  // 登录：验证账号密码
  async verifyUser(username, password) {
    const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (users.length === 0) return null; // 用户不存在

    const user = users[0];
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null; // 密码错误

    // 隐藏敏感字段
    delete user.password;
    return user;
  }

  // 获取用户信息（by ID）
  async getUserById(userId) {
    const [users] = await pool.query(
      "SELECT id, username, nickname, avatar, role FROM users WHERE id = ?",
      [userId]
    );
    return users[0] || null;
  }

  // 更新用户信息
  async updateUser(userId, updateData) {
    // 过滤允许更新的字段
    const allowedFields = ["nickname", "avatar"];
    const fields = [];
    const values = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    if (fields.length === 0) return 0; // 无更新内容

    values.push(userId);
    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows; // 受影响行数
  }
  // 新增：通过用户名查询用户（注册时校验重复）
  async getUserByUsername(username) {
    const [users] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    return users[0] || null;
  }

  // 新增：更新密码（需验证旧密码）
  async updatePassword(userId, oldPassword, newPassword) {
    // 验证旧密码
    const [users] = await pool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );
    if (users.length === 0) return false;

    const isMatch = await bcrypt.compare(oldPassword, users[0].password);
    if (!isMatch) return false;

    // 加密新密码并更新
    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(newPassword, salt);
    const [result] = await pool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPwd, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new UserService();
