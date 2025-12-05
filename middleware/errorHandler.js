// 统一响应格式：成功/失败
const successResponse = (res, data = null, msg = "操作成功", code = 200) => {
  res.status(code).json({ code, msg, data });
};

const errorResponse = (res, err = null, msg = "操作失败", code = 500) => {
  // 开发环境返回错误详情，生产环境隐藏
  const errorMsg = process.env.NODE_ENV === "development" ? err?.message : msg;
  res.status(code).json({ code, msg: errorMsg, data: null });
};

// 全局错误捕获中间件
const errorHandler = (err, req, res, next) => {
  // 验证错误（express-validator）
  if (err.array) {
    return errorResponse(res, err, err.array()[0].msg, 400);
  }
  // Token错误（jsonwebtoken）
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, err, "Token无效", 401);
  }
  if (err.name === "TokenExpiredError") {
    return errorResponse(res, err, "Token已过期", 401);
  }
  // 其他错误
  console.error("服务错误：", err);
  errorResponse(res, err, "服务器内部错误", 500);
};

module.exports = { successResponse, errorResponse, errorHandler };
