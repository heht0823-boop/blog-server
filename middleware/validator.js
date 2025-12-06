// middleware/validator.js
const { validationResult } = require("express-validator");
const { ValidationError } = require("./errorHandler");

/**
 * 验证中间件执行器
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

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
