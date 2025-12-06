const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 引入路由
const userRoutes = require("./routes/user");
const articleRoutes = require("./routes/article");
// const categoryRoutes = require("./routes/category");
// const tagRoutes = require("./routes/tag");
// const commentRoutes = require("./routes/comment");

// 引入中间件
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// 路由
app.use("/api/user", userRoutes);
app.use("/api/article", articleRoutes);
// app.use("/api/category", categoryRoutes);
// app.use("/api/tag", tagRoutes);
// app.use("/api/comment", commentRoutes);

// 错误处理中间件
app.use(errorHandler); // 全局错误处理

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
