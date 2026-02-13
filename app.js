const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path"); // 新增：引入path模块处理路径
require("dotenv").config();

const { errorHandler, addTraceId } = require("./middleware/errorHandler");
const { testDBConnection } = require("./config/db");

const userRouter = require("./routes/user");
const articleRouter = require("./routes/article");
const categoryRouter = require("./routes/category");
const tagRouter = require("./routes/tag");
const commentRouter = require("./routes/comment");

const app = express();

// ===== 1. 安全中间件（全局严格配置）=====
app.use(helmet());

// ===== 2. 追踪 ID =====
app.use(addTraceId);

// ===== 3. CORS 中间件（全局）=====
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")
      : "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ===== 4. 全局速率限制 =====
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "请求过于频繁，请稍后再试",
  skip: (req) => req.path === "/health" || req.path.startsWith("/uploads"),
});
app.use(globalRateLimiter);

// ===== 5. 请求体解析 =====
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== 6. 静态资源配置（关键修复）=====
const uploadDir = process.env.UPLOAD_DIR || "./public/uploads";
const absoluteUploadDir = path.resolve(__dirname, uploadDir); // 先定义变量

// 步骤1：为/uploads路径覆盖Cross-Origin-Resource-Policy头
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// 步骤2：为/uploads路径加强CORS（仅GET）
app.use(
  "/uploads",
  cors({
    origin: "*",
    methods: ["GET"],
    optionsSuccessStatus: 200,
  }),
);

// 步骤3：配置静态资源（只配一次）
app.use("/uploads", express.static(absoluteUploadDir));

// ===== 7. 健康检查 =====
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

// ===== 8. 根路径 =====
app.get("/", (req, res) => {
  res.json({
    code: 200,
    msg: "Blog Server API",
    version: "1.0.0",
  });
});

// ===== 9. API 路由 =====
app.use("/api/user", userRouter);
app.use("/api/article", articleRouter);
app.use("/api/category", categoryRouter);
app.use("/api/tag", tagRouter);
app.use("/api/comment", commentRouter);

// ===== 10. 404 处理 =====
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    msg: `接口 ${req.method} ${req.originalUrl} 不存在`,
    data: null,
    traceId: req.traceId,
  });
});

// ===== 11. 全局错误处理 =====
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
        `🔐 CORS 来源: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`,
      );
      console.log(`📁 上传目录: ${absoluteUploadDir}`); // 打印绝对路径
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
