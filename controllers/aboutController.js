const {
  successResponse,
  errorResponse,
} = require("../middleware/errorHandler");
const {
  addMessage,
  fetchMessages,
  removeMessage,
  addChat,
  fetchChatHistory,
  deleteChatHistory,
  verifyMessageOwnership,
} = require("../services/about");
const { callDoubaoAI } = require("../services/doubao");

// 创建留言（必须登录）
exports.createMessage = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ 必须登录，直接获取
    const data = await addMessage({ ...req.body, user_id: userId });
    successResponse(res, data, "留言创建成功");
  } catch (err) {
    errorResponse(res, err, "留言创建失败");
  }
};

// 获取留言列表（所有人可查看所有留言）
exports.getMessages = async (req, res) => {
  try {
    const { page, pageSize } = req.query;

    // ✅ 支持未登录用户
    const userId = req.user?.id || null;
    const isAdmin = req.user?.role === 1;

    // ✅ 所有人都查看所有留言（不再根据用户 ID 过滤）
    const filterUserId = null;

    const data = await fetchMessages({
      page,
      pageSize,
      user_id: filterUserId,
    });
    successResponse(res, data, "留言列表获取成功");
  } catch (err) {
    errorResponse(res, err, "留言列表获取失败");
  }
};

// 删除留言（只有留言所有者或管理员可删除）
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 1;
    const { id } = req.params;

    // 验证留言所有权
    await verifyMessageOwnership(id, userId, isAdmin ? "admin" : "user");

    await removeMessage(id);
    successResponse(res, null, "留言删除成功");
  } catch (err) {
    if (err.message === "无权操作此留言") {
      return errorResponse(res, null, "权限不足", 403);
    }
    if (err.message === "留言不存在") {
      return errorResponse(res, null, "留言不存在", 404);
    }
    errorResponse(res, err, "留言删除失败");
  }
};

// AI 对话（必须登录）
exports.createChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { session_id, message } = req.body;

    // 1. 保存用户消息
    await addChat({ session_id, message, user_id: userId });

    // 2. 获取历史对话上下文（最近 10 条）
    const history = await fetchChatHistory(session_id, userId);
    const contextMessages = history
      .slice(-10)
      .map((h) => ({ role: h.role, content: h.content }));

    // 3. 调用豆包 AI
    const aiResponse = await callDoubaoAI(contextMessages);

    // 4. 保存 AI 回复
    await addChat({
      session_id,
      message: aiResponse.content,
      user_id: userId,
      role: "assistant",
    });

    successResponse(
      res,
      {
        content: aiResponse.content,
        session_id,
      },
      "对话创建成功",
    );
  } catch (err) {
    errorResponse(res, err, "对话创建失败");
  }
};

// 获取对话历史（必须登录，只能查看自己的）
exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const session_id = req.query.session_id;
    const data = await fetchChatHistory(session_id, userId);
    successResponse(res, data, "对话历史获取成功");
  } catch (err) {
    errorResponse(res, err, "对话历史获取失败");
  }
};

// 清空对话历史（必须登录，只能清空自己的）
exports.clearChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const session_id = req.query.session_id;
    await deleteChatHistory(session_id, userId);
    successResponse(res, null, "对话历史清空成功");
  } catch (err) {
    errorResponse(res, err, "对话历史清空失败");
  }
};
