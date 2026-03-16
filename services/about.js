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

// ✅ 新增：获取用户所有会话列表（用于历史记录列表展示）
exports.fetchChatSessions = async ({ page = 1, pageSize = 20, user_id }) => {
  const offset = (page - 1) * pageSize;

  // 获取每个会话的最后一条消息和时间
  const query = `
    SELECT 
      session_id,
      MAX(create_time) as last_message_time,
      (SELECT content FROM ai_chats c2 
       WHERE c2.session_id = c1.session_id AND c2.user_id = c1.user_id 
       ORDER BY create_time DESC LIMIT 1) as last_message,
      (SELECT role FROM ai_chats c3 
       WHERE c3.session_id = c1.session_id AND c3.user_id = c1.user_id 
       ORDER BY create_time DESC LIMIT 1) as last_role,
      MIN(create_time) as create_time,
      COUNT(*) as message_count
    FROM ai_chats c1
    WHERE user_id = ?
    GROUP BY session_id
    ORDER BY last_message_time DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT session_id) as total 
    FROM ai_chats 
    WHERE user_id = ?
  `;

  const [sessions] = await pool.query(query, [user_id, pageSize, offset]);
  const [[{ total }]] = await pool.query(countQuery, [user_id]);

  return {
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    sessions: sessions.map((s) => ({
      session_id: s.session_id,
      last_message: s.last_message,
      last_role: s.last_role,
      last_message_time: s.last_message_time,
      create_time: s.create_time,
      message_count: s.message_count,
    })),
  };
};

// 清空对话历史
exports.deleteChatHistory = async (session_id, user_id) => {
  await pool.query(
    "DELETE FROM ai_chats WHERE session_id = ? AND user_id = ?",
    [session_id, user_id],
  );
};
