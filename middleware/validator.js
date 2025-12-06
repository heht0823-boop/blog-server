const { body, param, query, validationResult } = require("express-validator");
const userService = require("../services/userService");
const { ValidationError } = require("./errorHandler");

/**
 * 验证中间件执行器
 * 捕获所有验证错误并使用统一的错误格式
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // 运行所有验证规则
    await Promise.all(validations.map((validation) => validation.run(req)));

    // 获取验证结果
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

// ===== 注册验证 =====

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
    .withMessage("密码必须包含数字")
    .custom((value) => {
      // 检查常见弱密码
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

/**
 * 登录验证规则
 */
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

/**
 * 修改密码验证规则
 */
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

/**
 * 管理员重置密码验证规则
 */
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

/**
 * 更新用户信息验证规则
 */
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

// 文章 ID 参数验证
const articleIdValidator = [
  param("id").isInt({ min: 1 }).withMessage("文章 ID 必须是正整数"),
];

// 文章创建验证
const articleCreateValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("文章标题不能为空")
    .isLength({ min: 1, max: 100 })
    .withMessage("文章标题长度 1-100 位"),

  body("content").trim().notEmpty().withMessage("文章内容不能为空"),

  body("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("分类 ID 必须是正整数"),

  body("status")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("状态值必须是 0 或 1"),

  body("tags").optional().isArray().withMessage("标签必须是数组格式"),
];

// 文章更新验证
const articleUpdateValidator = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("文章标题长度 1-100 位"),

  body("content").optional().trim(),

  body("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("分类 ID 必须是正整数"),

  body("status")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("状态值必须是 0 或 1"),

  body("tags").optional().isArray().withMessage("标签必须是数组格式"),
];

// 文章查询验证
const articleQueryValidator = [
  query("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("分类 ID 必须是正整数")
    .toInt(),

  query("tagId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("标签 ID 必须是正整数")
    .toInt(),

  query("status")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("状态值必须是 0 或 1")
    .toInt(),
];
/**
 * 用户 ID 参数验证
 */
const userIdValidator = [
  param("id").isInt({ min: 1 }).withMessage("用户 ID 必须是正整数"),
];

// ===== 分页参数验证 =====

/**
 * 分页查询验证规则
 */
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

/**
 * 角色参数验证
 */
const roleValidator = [
  query("role")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("角色值必须在 0-1 之间")
    .toInt(),
];

const articleSearchValidator = [
  query("keyword")
    .trim()
    .notEmpty()
    .withMessage("搜索关键词不能为空")
    .isLength({ min: 1, max: 50 })
    .withMessage("搜索关键词长度应在1-50个字符之间"),
];

module.exports = {
  // 执行器
  validate,

  // 用户相关
  registerValidator,
  loginValidator,
  passwordUpdateValidator,
  passwordResetValidator,
  updateUserValidator,
  userIdValidator,

  // 分页和过滤
  paginationValidator,
  roleValidator,
  // 文章相关
  articleIdValidator,
  articleCreateValidator,
  articleUpdateValidator,
  articleQueryValidator,
  articleSearchValidator,
};
