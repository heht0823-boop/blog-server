const { body, validationResult } = require("express-validator");
const userService = require("../services/userService");
/**
 * 验证中间件执行器
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        msg: errors.array()[0].msg,
        data: null,
      });
    }
    next();
  };
};

/**
 * 注册验证规则
 */
const registerValidator = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("用户名不能为空")
    .isLength({ min: 2, max: 20 })
    .withMessage("用户名长度 2-20 位")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("用户名只能包含字母、数字、下划线")
    .custom(async (value) => {
      const user = await userService.getUserByUsername(value);
      if (user) {
        throw new Error("用户名已存在");
      }
    }),

  body("password")
    .notEmpty()
    .withMessage("密码不能为空")
    .isLength({ min: 6, max: 30 })
    .withMessage("密码长度 6-30 位")
    .matches(/[a-z]/)
    .withMessage("密码必须包含小写字母")
    .matches(/[A-Z]/)
    .withMessage("密码必须包含大写字母")
    .matches(/[0-9]/)
    .withMessage("密码必须包含数字"),

  body("nickname")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("昵称长度 1-50 位"),
];

/**
 * 登录验证规则
 */
const loginValidator = [
  body("username").trim().notEmpty().withMessage("用户名不能为空"),

  body("password").notEmpty().withMessage("密码不能为空"),
];

/**
 * 修改密码验证规则
 */
const passwordUpdateValidator = [
  body("oldPassword").notEmpty().withMessage("旧密码不能为空"),

  body("newPassword")
    .notEmpty()
    .withMessage("新密码不能为空")
    .isLength({ min: 6, max: 30 })
    .withMessage("新密码长度 6-30 位")
    .custom((value, { req }) => {
      if (value === req.body.oldPassword) {
        throw new Error("新密码不能与旧密码相同");
      }
      return true;
    }),
];

module.exports = {
  registerValidator,
  loginValidator,
  passwordUpdateValidator,
  validate,
};
