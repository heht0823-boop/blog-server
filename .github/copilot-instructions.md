# AI Agent 指引（用于代码自动补全与修改）

目标：快速上手、修改与扩展后端 API，遵循本项目的架构风格与约定。

要点速览
- **架构**：基于 Express 的 REST API（入口 [app.js](app.js)）；路由位于 `routes/`，每条路由映射到 `controllers/`；业务逻辑在 `services/`（使用 MySQL 连接池）
- **数据库**：使用 `mysql2/promise` 池，配置见 [config/db.js](config/db.js)。所有 DB 操作通过 `pool.query(...)`。
- **认证/权限**：JWT 在 `utils/jwt.js`。认证中间件：`authMiddleware`（可选）、`strictAuthMiddleware`（必须认证）、`refreshTokenMiddleware`，权限中间件见 [middleware/permission.js](middleware/permission.js)。
- **输入校验**：使用 `express-validator`，统一由 `middleware/validator.js` 的 `validate()` 执行。具体规则在 `middleware/*Validator.js` 文件中（例如 `articleValidator.js`、`userValidator.js`）。
- **错误与响应**：全局格式由 `middleware/errorHandler.js` 提供，使用 `successResponse` / `errorResponse`，并带 `traceId`（追踪请求）。请使用这些工具函数保持一致的响应格式。
- **文件上传**：使用 `multer`，包装工具在 `utils/upload.js`，上传目录由 `UPLOAD_DIR` 环境变量控制。

编码约定与注意事项（面向 AI 代理）
- 控制器只处理请求/校验/权限/格式化响应，核心业务放在 `services/`。若需修改业务逻辑，请优先更新 `services/*` 而不是直接在控制器中写复杂 SQL。
- DB 字段名在 service 层使用下划线（如 `category_id`、`user_id`），而控制器对外使用驼峰或更友好的字段（如 `categoryId`）——注意映射（见 `controllers/articleController.js`）。
- 权限判断常由 `req.user.role === 1` 或 `adminMiddleware` 完成。不要绕过 `verifyArticleOwnership` 等封装好的服务方法。
- 输入校验失败应抛出或交给 `validate()` 处理，避免在控制器里手动返回未结构化错误。
- 错误处理：抛出自定义错误（或 Error 并设置 `.statusCode`）会被 `errorHandler` 捕获并返回一致格式。避免直接 `res.send` 非标准响应。

运行与环境（可复制的命令）
- 安装依赖：
  npm install
- 开发运行：
  npm run dev  # 使用 nodemon
- 启动（生产）：
  npm start
- 关键环境变量（必须）：
  - `DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_CHARSET` (见 `config/db.js`)
  - `JWT_SECRET`, `REFRESH_TOKEN_SECRET`（见 `utils/jwt.js`，启动时会校验）
  - 可选：`ACCESS_TOKEN_EXPIRES`, `REFRESH_TOKEN_EXPIRES`, `UPLOAD_DIR`, `UPLOAD_MAX_SIZE`, `CORS_ORIGIN`, `PORT`, `NODE_ENV`

典型代码模式与示例引用
- 路由→控制器→服务：例如 [routes/article.js](routes/article.js) → [controllers/articleController.js](controllers/articleController.js) → [services/articleService.js](services/articleService.js)。
- 可选认证 vs 必须认证：查看 [middleware/auth.js](middleware/auth.js)。对于需要登录的接口，使用 `strictAuthMiddleware`；对于可匿名访问但需要识别用户的接口，使用 `authMiddleware`。
- 响应示例：在控制器中应调用 `successResponse(res, data, msg, statusCode)` 或 `errorResponse(res, err, msg, code)`（见 `middleware/errorHandler.js`）。

修改建议与自动化准则
- 添加/修改接口：
  1. 在 `routes/` 添加路由并引用中间件（`validate()`、`auth/permission`）。
  2. 在 `controllers/` 添加薄控制器方法，仅做参数映射、权限校验、调用 `services/`。
  3. 在 `services/` 实现 DB 与业务逻辑。尽量复用现有查询模式与事务（若新增复杂业务，请保留 SQL 占位符 `?` 风格以防注入）。
- 日志与调试：开启 `NODE_ENV=development` 可在错误处理中打印堆栈。避免在生产中泄露敏感信息。

合并说明
- 仓库暂无现存的 `.github/copilot-instructions.md`，因此本文件为首个版本。如需补充：请指出常见任务（例如：新增文章审核流程、导出统计脚本），我会把相关示例与文件路径加入本指南。

请审阅本说明并指出希望补充的部分（例如：更多代码片段、常见 PR 检查项或 CI 命令）。
