// 自定义错误类
class AppError extends Error {
  constructor(msg, code = 500, statusCode = 500) {
    super(msg);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// 统一响应格式：成功/失败
const successResponse = (res, data = null, msg = "操作成功", code = 200) => {
  res.status(code).json({ code, msg, data });
};

const errorResponse = (
  res,
  err = null,
  msg = "操作失败",
  code = 500,
  statusCode = 500
) => {
  // 开发环境返回错误详情，生产环境隐藏
  const errorMsg = process.env.NODE_ENV === "development" ? err?.message : msg;
  res.status(statusCode).json({ code, msg: errorMsg, data: null });
};

// 全局错误捕获中间件
const errorHandler = (err, req, res, next) => {
  // 验证错误（express-validator）
  if (err.array) {
    return errorResponse(res, err, err.array()[0].msg, 400, 400);
  }

  // Token 错误（jsonwebtoken）
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, err, "Token 无效", 401, 401);
  }
  if (err.name === "TokenExpiredError") {
    return errorResponse(res, err, "Token 已过期", 401, 401);
  }

  // 自定义应用错误
  if (err instanceof AppError) {
    return errorResponse(res, err, err.message, err.code, err.statusCode);
  }

  // 其他错误 - 记录日志
  console.error("服务错误：", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  errorResponse(res, err, "服务器内部错误", 500, 500);
};

module.exports = { successResponse, errorResponse, errorHandler, AppError };
