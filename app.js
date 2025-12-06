const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
require("dotenv").config();

const { errorHandler, addTraceId } = require("./middleware/errorHandler");
const { testDBConnection } = require("./config/db");

const userRouter = require("./routes/user");
const articleRouter = require("./routes/article");
const categoryRouter = require("./routes/category");
const tagRouter = require("./routes/tag");

const app = express();

// ===== 安全中间件 =====
app.use(helmet());

// ===== 追踪 ID =====
app.use(addTraceId);

// ===== CORS 中间件 =====
const corsOptions = {
  origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ===== 全局速率限制 =====
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "请求过于频繁，请稍后再试",
  skip: (req) => req.path === "/health" || req.path.startsWith("/uploads"),
});
app.use(globalRateLimiter);

// ===== 请求体解析 =====
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== 静态文件 =====
const uploadDir = process.env.UPLOAD_DIR || "./public/uploads";
app.use("/uploads", express.static(uploadDir));

// ===== 健康检查 =====
app.get("/health", (req, res) => {
  res.json({
    code: 200,
    msg: "服务运行正常",
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    },
  });
});

// ===== 根路径 =====
app.get("/", (req, res) => {
  res.json({
    code: 200,
    msg: "Blog Server API",
    version: "1.0.0",
  });
});

// ===== API 路由 =====
app.use("/api/user", userRouter);
app.use("/api/article", articleRouter);
app.use("/api/category", categoryRouter);
app.use("/api/tag", tagRouter);

// ===== 404 处理 =====
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    msg: `接口 ${req.method} ${req.originalUrl} 不存在`,
    data: null,
    traceId: req.traceId,
  });
});

// ===== 全局错误处理 =====
app.use(errorHandler);

// ===== 启动服务 =====
const startServer = async () => {
  try {
    await testDBConnection();

    const server = app.listen(process.env.PORT || 3000, () => {
      const port = process.env.PORT || 3000;
      console.log("=".repeat(50));
      console.log("🚀 Blog Server 已启动");
      console.log("=".repeat(50));
      console.log(`📍 服务地址: http://localhost:${port}`);
      console.log(
        `🔐 CORS 来源: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`
      );
      console.log(`📁 上传目录: ${uploadDir}`);
      console.log(`🔧 环境: ${process.env.NODE_ENV || "development"}`);
      console.log("=".repeat(50) + "\n");
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ 端口 ${process.env.PORT} 已被占用`);
      } else {
        console.error("❌ 服务器错误:", err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("❌ 服务启动失败:", err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;