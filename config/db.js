const mysql = require("mysql2/promise");
// 修改 db.js 中的 dotenv 配置
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"), // 明确指定 .env 文件路径
});

// 创建数据库连接池（性能更优）
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: process.env.DB_CHARSET,
  connectionLimit: 10, // 最大连接数
  waitForConnections: true,
});

// 测试数据库连接
async function testDBConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ 数据库连接成功");
    connection.release();
  } catch (err) {
    console.error("❌ 数据库连接失败：", err.message);
    process.exit(1); // 连接失败则退出服务
  }
}
testDBConnection();

module.exports = { pool, testDBConnection };
