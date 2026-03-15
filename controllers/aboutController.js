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
} = require("../services/about");
const { callDoubaoAI } = require("../services/doubao");

// 创建留言
exports.createMessage = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const data = await addMessage({ ...req.body, user_id: userId });
    successResponse(res, data, "留言创建成功");
  } catch (err) {
    errorResponse(res, err, "留言创建失败");
  }
};

// 获取留言列表
exports.getMessages = async (req, res) => {
  try {
    const data = await fetchMessages(req.query);
    successResponse(res, data, "留言列表获取成功");
  } catch (err) {
    errorResponse(res, err, "留言列表获取失败");
  }
};

// 删除留言
exports.deleteMessage = async (req, res) => {
  try {
    await removeMessage(req.params.id);
    successResponse(res, null, "留言删除成功");
  } catch (err) {
    errorResponse(res, err, "留言删除失败");
  }
};

// AI 对话（合并修复版）
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

// 获取对话历史
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

// 清空对话历史
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
