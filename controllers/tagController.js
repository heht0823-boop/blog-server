const tagService = require("../services/tagService");
const {
  successResponse,
  errorResponse,
  asyncHandler,
} = require("../middleware/errorHandler");

class TagController {
  /**
   * 创建标签
   */
  createTag = asyncHandler(async (req, res, next) => {
    const { name } = req.body;
    
    const tagId = await tagService.createTag({ name });
    
    successResponse(res, { tagId }, "标签创建成功", 201);
  });

  /**
   * 获取标签列表
   */
  getTags = asyncHandler(async (req, res, next) => {
    const { page = 1, pageSize = 10 } = req.query;
    
    const result = await tagService.getTags(
      parseInt(page),
      parseInt(pageSize)
    );
    
    successResponse(res, {
      total: result.total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      tags: result.tags,
    }, "获取成功");
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
  
  /**
   * 获取所有标签（不分页）
   */
  getAllTags = asyncHandler(async (req, res, next) => {
    const tags = await tagService.getAllTags();
    successResponse(res, tags, "获取成功");
  });
}

module.exports = new TagController();