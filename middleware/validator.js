const { validationResult } = require("express-validator");
const { errorResponse } = require("./errorHandler");

/**
 * 统一参数校验中间件：
 * - 配合express-validator使用，简化控制器校验逻辑
 * - 校验失败直接返回400错误
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // 执行所有校验规则
    await Promise.all(validations.map((validation) => validation.run(req)));

    // 检查校验结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors, errors.array()[0].msg, 400);
    }

    next();
  };
};

module.exports = { validate };
