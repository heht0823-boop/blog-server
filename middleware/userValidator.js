// middleware/userValidator.js
const { body, param, query } = require("express-validator");
const userService = require("../services/userService");

// ===== 注册验证 =====
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
    .withMessage("密码必须包含数字")
    .custom((value) => {
      const weakPasswords = [
        "123456",
        "password",
        "qwerty",
        "123123",
        "111111",
      ];
      if (weakPasswords.includes(value)) {
        throw new Error("密码过于简单，请使用更复杂的密码");
      }
      return true;
    }),

  body("nickname")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("昵称长度 1-20 位")
    .matches(/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/)
    .withMessage("昵称只能包含中文、字母、数字、下划线"),
];

// ===== 登录验证 =====
const loginValidator = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("用户名不能为空")
    .isLength({ min: 2, max: 20 })
    .withMessage("用户名长度 2-20 位"),

  body("password")
    .notEmpty()
    .withMessage("密码不能为空")
    .isLength({ min: 6, max: 30 })
    .withMessage("密码长度 6-30 位"),
];

// ===== 用户信息更新验证 =====
const passwordUpdateValidator = [
  body("oldPassword")
    .notEmpty()
    .withMessage("旧密码不能为空")
    .isLength({ min: 6, max: 30 })
    .withMessage("旧密码长度 6-30 位"),

  body("newPassword")
    .notEmpty()
    .withMessage("新密码不能为空")
    .isLength({ min: 6, max: 30 })
    .withMessage("新密码长度 6-30 位")
    .matches(/[a-z]/)
    .withMessage("新密码必须包含小写字母")
    .matches(/[A-Z]/)
    .withMessage("新密码必须包含大写字母")
    .matches(/[0-9]/)
    .withMessage("新密码必须包含数字")
    .custom((value, { req }) => {
      if (value === req.body.oldPassword) {
        throw new Error("新密码不能与旧密码相同");
      }
      return true;
    }),
];

// ===== 密码重置验证 =====
const passwordResetValidator = [
  body("newPassword")
    .notEmpty()
    .withMessage("新密码不能为空")
    .isLength({ min: 6, max: 30 })
    .withMessage("新密码长度 6-30 位")
    .matches(/[a-z]/)
    .withMessage("新密码必须包含小写字母")
    .matches(/[A-Z]/)
    .withMessage("新密码必须包含大写字母")
    .matches(/[0-9]/)
    .withMessage("新密码必须包含数字"),
];

const updateUserValidator = [
  body("nickname")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("昵称长度 1-20 位")
    .matches(/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/)
    .withMessage("昵称只能包含中文、字母、数字、下划线"),

  body("avatar").optional().trim().isURL().withMessage("头像 URL 格式不正确"),
];

// ===== ID 参数验证 =====
const userIdValidator = [
  param("id").isInt({ min: 1 }).withMessage("用户 ID 必须是正整数"),
];

// ===== 分页参数验证 =====
const paginationValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("页码必须是正整数")
    .toInt(),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("每页条数必须在 1-100 之间")
    .toInt(),
];

// ===== 角色验证 =====
const roleValidator = [
  query("role")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("角色值必须在 0-1 之间")
    .toInt(),
];

module.exports = {
  registerValidator,
  loginValidator,
  passwordUpdateValidator,
  passwordResetValidator,
  updateUserValidator,
  userIdValidator,
  paginationValidator,
  roleValidator,
};
