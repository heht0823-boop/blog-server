const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");

/**
 * 自定义请求日志中间件：
 * - 记录请求时间、方法、路径、状态码、响应时间
 * - 日志写入文件（按日期分割）
 */
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const requestTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const { method, originalUrl, ip } = req;

  // 响应结束后记录日志
  res.on("finish", () => {
    const responseTime = Date.now() - start;
    const { statusCode } = res;

    // 日志内容
    const logMsg = `[${requestTime}] ${method} ${originalUrl} - IP: ${ip} - Status: ${statusCode} - Time: ${responseTime}ms\n`;

    // 确保日志目录存在
    const logDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 按日期生成日志文件
    const logFileName = `app-${format(new Date(), "yyyy-MM-dd")}.log`;
    const logPath = path.join(logDir, logFileName);

    // 追加写入日志
    fs.appendFile(logPath, logMsg, (err) => {
      if (err) console.error("日志写入失败：", err);
    });
  });

  next();
};

module.exports = loggerMiddleware;
