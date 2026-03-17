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
      if (err.message.startsWith("以下标签已存在:")) {
        return errorResponse(res, null, err.message, 400);
      }
      next(err);
    }
  });

  /**
   * 获取标签列表
   */
  getTags = asyncHandler(async (req, res, next) => {
    const { page, pageSize } = req.query;

    const pageNum = page ? parseInt(page) : null;
    const pageSizeNum = pageSize ? parseInt(pageSize) : null;

    const result = await tagService.getTags(pageNum, pageSizeNum);

    successResponse(
      res,
      {
        total: result.total,
        page: pageNum || 0,
        pageSize: pageSizeNum || 0,
        tags: result.tags,
      },
      "获取成功",
    );
  });

  /**
   * 更新标签
   */
  updateTag = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { name } = req.body;

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
