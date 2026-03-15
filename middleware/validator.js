// middleware/validator.js
const { validationResult } = require("express-validator");
const { ValidationError } = require("./errorHandler");

// ✅ 导入所有验证器
const aboutValidator = require("./aboutValidator");
const articleValidator = require("./articleValidator");
const categoryValidator = require("./categoryValidator");
const commentValidator = require("./commentValidator");
const tagValidator = require("./tagValidator");
const userValidator = require("./userValidator");

// ✅ 建立验证器映射
const validators = {
  ...aboutValidator,
  ...articleValidator,
  ...categoryValidator,
  ...commentValidator,
  ...tagValidator,
  ...userValidator,
};

/**
 * 验证中间件执行器
 * 支持两种调用方式：
 * 1. validate("createMessage") - 字符串方式
 * 2. validate([body('content').notEmpty()]) - 数组方式
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // ✅ 支持字符串方式
    let validationRules;
    if (typeof validations === "string") {
      validationRules = validators[validations];
      if (!validationRules) {
        const error = new ValidationError(`验证器 "${validations}" 不存在`);
        return next(error);
      }
    } else {
      // ✅ 支持数组方式
      validationRules = validations;
    }

    // ✅ 执行验证
    await Promise.all(validationRules.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      const error = new ValidationError(firstError.msg, {
        field: firstError.param,
        value: firstError.value,
        location: firstError.location,
      });
      return next(error);
    }

    next();
  };
};

module.exports = {
  validate,
};
