const cors = require("cors");

/**
 * 精细化跨域配置：
 * - 生产环境：明确指定前端域名
 * - 开发环境：允许本地开发服务器
 * - 支持 Credentials（携带 Cookie/Token）
 */
const corsMiddleware = cors({
  origin: (origin, callback) => {
    // 开发环境允许多个源，生产环境只允许指定源
    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? [process.env.CLIENT_ORIGIN]
        : ["http://localhost:5173", "http://localhost:3000"];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("跨域请求被拒绝"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: process.env.NODE_ENV === "production" ? 86400 : 3600,
  optionsSuccessStatus: 200,
});

module.exports = corsMiddleware;
