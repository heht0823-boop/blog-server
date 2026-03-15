const pool = require("../config/db");

// 添加留言
exports.addMessage = async ({ content, nickname, avatar, user_id = null }) => {
  const [result] = await pool.query(
    "INSERT INTO messages (content, nickname, avatar, user_id) VALUES (?, ?, ?, ?)",
    [
      content,
      nickname || "访客",
      avatar || "https://picsum.photos/200/200",
      user_id,
    ],
  );
  return { id: result.insertId };
};

// 获取留言列表
exports.fetchMessages = async ({ page = 1, pageSize = 10, status = 1 }) => {
  const offset = (page - 1) * pageSize;
  const [list] = await pool.query(
    "SELECT * FROM messages WHERE status = ? ORDER BY create_time DESC LIMIT ?, ?",
    [status, offset, parseInt(pageSize)],
  );
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) as total FROM messages WHERE status = ?",
    [status],
  );
  return { total, page: parseInt(page), pageSize: parseInt(pageSize), list };
};

// 删除留言
exports.removeMessage = async (id) => {
  await pool.query("DELETE FROM messages WHERE id = ?", [id]);
};

// 添加对话（支持 role 参数）
exports.addChat = async ({ session_id, message, user_id, role = "user" }) => {
  const [result] = await pool.query(
    "INSERT INTO ai_chats (session_id, user_id, role, content) VALUES (?, ?, ?, ?)",
    [session_id, user_id, role, message],
  );
  return { id: result.insertId, session_id };
};

// 获取对话历史
exports.fetchChatHistory = async (session_id, user_id) => {
  const [rows] = await pool.query(
    "SELECT * FROM ai_chats WHERE session_id = ? AND user_id = ? ORDER BY create_time ASC",
    [session_id, user_id],
  );
  return rows;
};

// 清空对话历史
exports.deleteChatHistory = async (session_id, user_id) => {
  await pool.query(
    "DELETE FROM ai_chats WHERE session_id = ? AND user_id = ?",
    [session_id, user_id],
  );
};
