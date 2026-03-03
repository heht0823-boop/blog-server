const categoryService = require("../services/category");
const {
  successResponse,
  errorResponse,
  asyncHandler,
} = require("../middleware/errorHandler");

class CategoryController {
  /**
   * 创建分类（支持单个或批量创建）
   */
  createCategory = asyncHandler(async (req, res, next) => {
    try {
      const categoriesData = req.body;
      const result = await categoryService.createCategory(categoriesData);
      successResponse(res, result, "分类创建成功", 201);
    } catch (err) {
      // 特别处理重复创建的情况
      if (err.message.startsWith("以下分类已存在:")) {
        return errorResponse(res, null, err.message, 400);
      }
      next(err);
    }
  });
  /**
   * 获取分类列表
   */
  getCategories = asyncHandler(async (req, res, next) => {
    const { page, pageSize } = req.query;

    // 转换为整数，如果未传则保持 null
    const pageNum = page ? parseInt(page) : null;
    const pageSizeNum = pageSize ? parseInt(pageSize) : null;

    const result = await categoryService.getCategories(pageNum, pageSizeNum);

    // 根据是否分页返回不同的响应格式
    if (pageNum === null || pageSizeNum === null) {
      // 不分页，直接返回数组
      successResponse(
        res,
        {
          total: result.total,
          categories: result.categories,
        },
        "获取成功",
      );
    } else {
      // 分页返回
      successResponse(
        res,
        {
          total: result.total,
          page: pageNum,
          pageSize: pageSizeNum,
          categories: result.categories,
        },
        "获取成功",
      );
    }
  });

  /**
   * 获取单个分类
   */
  getCategory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const category = await categoryService.getCategoryById(id);

    if (!category) {
      return errorResponse(res, null, "分类不存在", 404);
    }

    successResponse(res, category, "获取成功");
  });

  /**
   * 更新分类
   */
  updateCategory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { name, sort } = req.body;

    // 检查分类是否存在
    const existingCategory = await categoryService.getCategoryById(id);
    if (!existingCategory) {
      return errorResponse(res, null, "分类不存在", 404);
    }

    const updated = await categoryService.updateCategory(id, { name, sort });

    if (!updated) {
      return errorResponse(res, null, "分类更新失败", 500);
    }

    successResponse(res, null, "分类更新成功");
  });
  /**
   * 删除分类
   */
  deleteCategory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const deleted = await categoryService.deleteCategory(id);
    successResponse(res, null, "删除成功");
  });
}
module.exports = new CategoryController();
