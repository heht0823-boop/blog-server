const tagService = require("../services/tagService");
const {
  successResponse,
  errorResponse,
  asyncHandler,
} = require("../middleware/errorHandler");

class TagController {
  /**
   * 创建标签（支持单个或批量创建）
   */
  createTag = asyncHandler(async (req, res, next) => {
    try {
      const tagsData = req.body;
      const result = await tagService.createTag(tagsData);
      successResponse(res, result, "标签创建成功", 201);
    } catch (err) {
      // 特别处理重复创建的情况
      if (err.message.startsWith("以下标签已存在:")) {
        return errorResponse(res, null, err.message, 400);
      }
      // 其他错误继续传递给错误处理中间件
      next(err);
    }
  });
  /**
   * 获取标签列表
   */
  getTags = asyncHandler(async (req, res, next) => {
    const { page, pageSize } = req.query;

    // 转换为整数，如果未传则保持 null
    const pageNum = page ? parseInt(page) : null;
    const pageSizeNum = pageSize ? parseInt(pageSize) : null;

    const result = await tagService.getTags(pageNum, pageSizeNum);

    // 统一响应格式
    successResponse(
      res,
      {
        total: result.total,
        page: pageNum || 0, // 不分页时为 0
        pageSize: pageSizeNum || 0, // 不分页时为 0
        tags: result.tags,
      },
      "获取成功",
    );
  });

  /**
   * 获取单个标签
   */
  getTag = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const tag = await tagService.getTagById(id);

    if (!tag) {
      return errorResponse(res, null, "标签不存在", 404);
    }

    successResponse(res, tag, "获取成功");
  });

  /**
   * 更新标签
   */
  updateTag = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { name } = req.body;

    // 检查标签是否存在
    const existingTag = await tagService.getTagById(id);
    if (!existingTag) {
      return errorResponse(res, null, "标签不存在", 404);
    }

    const updated = await tagService.updateTag(id, { name });

    if (!updated) {
      return errorResponse(res, null, "标签更新失败", 500);
    }

    successResponse(res, null, "标签更新成功");
  });

  /**
   * 删除标签
   */
  deleteTag = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // 检查标签是否存在
    const existingTag = await tagService.getTagById(id);
    if (!existingTag) {
      return errorResponse(res, null, "标签不存在", 404);
    }

    try {
      const deleted = await tagService.deleteTag(id);

      if (!deleted) {
        return errorResponse(res, null, "标签删除失败", 500);
      }

      successResponse(res, null, "标签删除成功");
    } catch (err) {
      return errorResponse(res, null, err.message, 400);
    }
  });
}

module.exports = new TagController();
