const { v4: uuidv4 } = require("uuid");

// ===== 自定义错误类 =====

class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = "未认证") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

class AuthorizationError extends AppError {
  constructor(message = "权限不足") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

class NotFoundError extends AppError {
  constructor(message = "资源不存在") {
    super(message, 404, "NOT_FOUND");
  }
}

// ===== 响应格式化函数 =====

/**
 * 成功响应格式
 */
const successResponse = (
  res,
  data = null,
  msg = "请求成功",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    code: statusCode,
    msg,
    data,
    timestamp: new Date().toISOString(),
    traceId: res.req?.traceId,
  });
};

/**
 * 错误响应格式
 */
const errorResponse = (
  res,
  error = null,
  msg = "请求失败",
  statusCode = 500
) => {
  return res.status(statusCode).json({
    code: statusCode,
    msg,
    data: null,
    timestamp: new Date().toISOString(),
    traceId: res.req?.traceId,
    ...(process.env.NODE_ENV === "development" && { error: error?.message }),
  });
};

// ===== 中间件 =====

/**
 * 添加追踪 ID 中间件
 */
const addTraceId = (req, res, next) => {
  req.traceId = uuidv4();
  res.req = req;
  next();
};

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 默认错误信息
  let statusCode = err.statusCode || 500;
  let msg = err.message || "服务器内部错误";
  let code = err.code || statusCode;

  // 特定错误处理
  if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    msg = err.message || "参数验证失败";
  } else if (err.name === "SyntaxError" && "body" in err) {
    statusCode = 400;
    code = "JSON_PARSE_ERROR";
    msg = "JSON 格式错误";
  } else if (err.code === "ENOTFOUND") {
    statusCode = 503;
    code = "SERVICE_UNAVAILABLE";
    msg = "服务暂时不可用";
  }

  // 日志记录
  if (statusCode >= 500) {
    console.error(
      `[错误] TraceId: ${req.traceId} | ${err.message}\n`,
      err.stack
    );
  } else if (statusCode >= 400) {
    console.warn(`[警告] TraceId: ${req.traceId} | ${msg}`);
  }

  // 响应
  res.status(statusCode).json({
    code,
    msg,
    data: null,
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * 异步路由错误捕获包装器
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  // 错误类
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,

  // 响应函数
  successResponse,
  errorResponse,

  // 中间件
  addTraceId,
  errorHandler,
  asyncHandler,
};
