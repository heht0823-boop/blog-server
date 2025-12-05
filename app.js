const express = require("express");
const cors = require("cors"); //解决跨域问题
const morgan = require("morgan"); // 日志中间件
const path = require("path");
require("dotenv").config();

// 导入配置
const { testDBConnection } = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");

// 导入路由
const userRouter = require("./routes/user");
const articleRouter = require("./routes/article");
const categoryRouter = require("./routes/category");
const tagRouter = require("./routes/tag");
const commentRouter = require("./routes/comment");

// 初始化服务
const app = express();

// 中间件
app.use(cors()); // 跨域
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析表单请求体
app.use(morgan("dev")); // 开发环境日志
app.use("/uploads", express.static(path.join(__dirname, "public/uploads"))); // 静态文件服务

// 注册路由
app.use("/api/user", userRouter);
app.use("/api/article", articleRouter);
app.use("/api/category", categoryRouter);
app.use("/api/tag", tagRouter);
app.use("/api/comment", commentRouter);

// 404处理
app.use((req, res) => {
  res.status(404).json({ code: 404, msg: "接口不存在", data: null });
});

// 全局错误处理
app.use(errorHandler);

// 启动服务
const startServer = async () => {
  await testDBConnection(); // 先测试数据库连接
  app.listen(process.env.PORT, () => {
    console.log(`🚀 服务已启动：http://localhost:${process.env.PORT}`);
  });
};

startServer();
