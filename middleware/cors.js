const cors = require("cors");

/**
 * 精细化跨域配置：
 * - 允许指定前端域名
 * - 支持Credentials（携带Cookie）
 * - 允许自定义请求头
 */
const corsMiddleware = cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", // 前端项目地址
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // 允许携带Cookie
  maxAge: 86400, // 预检请求缓存时间（24小时）
});

module.exports = corsMiddleware;
