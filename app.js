const express = require("express");
require("dotenv").config();

// 导入自定义中间件
const corsMiddleware = require("./middleware/cors");
const loggerMiddleware = require("./middleware/logger");
const { errorHandler } = require("./middleware/errorHandler");

// 导入配置
const { testDBConnection } = require("./config/db");

// 导入路由
const userRouter = require("./routes/user");
// const articleRouter = require("./routes/article");
// const categoryRouter = require("./routes/category");
// const tagRouter = require("./routes/tag");
// const commentRouter = require("./routes/comment");

// 初始化服务
const app = express();
// 中间件链（顺序重要）
app.use(loggerMiddleware); // 日志中间件（最前）
app.use(corsMiddleware); // 跨域中间件
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析表单请求体

// 静态文件服务（上传文件访问）
app.use(
  "/uploads",
  express.static(process.env.UPLOAD_DIR || "./public/uploads")
);

// 注册路由（接口前缀统一为/api）
app.use("/api/user", userRouter);
// app.use("/api/article", articleRouter);
// app.use("/api/category", categoryRouter);
// app.use("/api/tag", tagRouter);
// app.use("/api/comment", commentRouter);

// 404处理
app.use((req, res) => {
  res
    .status(404)
    .json({ code: 404, msg: `接口${req.originalUrl}不存在`, data: null });
});

// 全局错误处理（最后）
app.use(errorHandler);

// 启动服务
const startServer = async () => {
  await testDBConnection(); // 先测试数据库连接
  app.listen(process.env.PORT, () => {
    console.log(`🚀 服务已启动：http://localhost:${process.env.PORT}`);
    console.log(
      `🌐 允许跨域域名：${process.env.CLIENT_ORIGIN || "http://localhost:5173"}`
    );
    console.log(
      `📁 上传文件目录：${process.env.UPLOAD_DIR || "./public/uploads"}`
    );
  });
};

startServer();
