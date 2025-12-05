const jwt = require("jsonwebtoken");
// 修改 jwt.js 中的 dotenv 配置
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"), // 明确指定 .env 文件路径
}); // 生成Token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// 验证Token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
