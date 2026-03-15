const { pool } = require("../config/db");

// 添加留言（移除 status 字段）
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

// 获取留言列表（支持用户过滤）
exports.fetchMessages = async ({ page = 1, pageSize = 10, user_id = null }) => {
  const offset = (page - 1) * pageSize;

  let query = "SELECT * FROM messages WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as total FROM messages WHERE 1=1";
  const params = [];
  const countParams = [];

  // 如果传入 user_id，则只查询该用户的留言
  if (user_id) {
    query += " AND user_id = ?";
    countQuery += " AND user_id = ?";
    params.push(user_id);
    countParams.push(user_id);
  }

  query += " ORDER BY create_time DESC LIMIT ?, ?";
  params.push(offset, parseInt(pageSize));

  const [list] = await pool.query(query, params);
  const [[{ total }]] = await pool.query(countQuery, countParams);

  return { total, page: parseInt(page), pageSize: parseInt(pageSize), list };
};

// 删除留言
exports.removeMessage = async (id) => {
  await pool.query("DELETE FROM messages WHERE id = ?", [id]);
};

// 验证留言所有权
exports.verifyMessageOwnership = async (messageId, userId, userRole) => {
  const [messages] = await pool.query(
    "SELECT user_id FROM messages WHERE id = ?",
    [messageId],
  );

  if (messages.length === 0) {
    throw new Error("留言不存在");
  }

  // 管理员可以操作所有留言，普通用户只能操作自己的
  if (userRole !== "admin" && messages[0].user_id != userId) {
    throw new Error("无权操作此留言");
  }

  return true;
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
