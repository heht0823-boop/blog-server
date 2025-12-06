const categoryService = require("../services/category");
const {
  successResponse,
  errorResponse,
  asyncHandler,
} = require("../middleware/errorHandler");

class CategoryController {
  /**
   * 创建分类
   */
  createCategory = asyncHandler(async (req, res, next) => {
    const { name, sort } = req.body;
    
    const categoryId = await categoryService.createCategory({ name, sort });
    
    successResponse(res, { categoryId }, "分类创建成功", 201);
  });

  /**
   * 获取分类列表
   */
  getCategories = asyncHandler(async (req, res, next) => {
    const { page = 1, pageSize = 10 } = req.query;
    
    const result = await categoryService.getCategories(
      parseInt(page),
      parseInt(pageSize)
    );
    
    successResponse(res, {
      total: result.total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      categories: result.categories,
    }, "获取成功");
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
    
    // 检查分类是否存在
    const existingCategory = await categoryService.getCategoryById(id);
    if (!existingCategory) {
      return errorResponse(res, null, "分类不存在", 404);
    }
    
    try {
      const deleted = await categoryService.deleteCategory(id);
      
      if (!deleted) {
        return errorResponse(res, null, "分类删除失败", 500);
      }
      
      successResponse(res, null, "分类删除成功");
    } catch (err) {
      return errorResponse(res, null, err.message, 400);
    }
  });
  
  /**
   * 获取所有分类（不分页）
   */
  getAllCategories = asyncHandler(async (req, res, next) => {
    const categories = await categoryService.getAllCategories();
    successResponse(res, categories, "获取成功");
  });
}

module.exports = new CategoryController();