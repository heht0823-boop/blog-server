const axios = require("axios");

exports.callDoubaoAI = async (messages) => {
  const apiKey = process.env.DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL;

  if (!apiKey || !model) {
    throw new Error("豆包 API 配置不完整");
  }

  const response = await axios.post(
    `https://ark.cn-beijing.volces.com/api/v3/chat/completions`,
    {
      model: model,
      messages: [
        {
          role: "system",
          content: "你是一个友好的 AI 助手，帮助用户解答问题。",
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2048,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
    },
  );

  return {
    content: response.data.choices[0].message.content,
    usage: response.data.usage,
  };
};
