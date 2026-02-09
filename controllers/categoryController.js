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
    const { page = 1, pageSize = 10 } = req.query;

    const result = await categoryService.getCategories(
      parseInt(page),
      parseInt(pageSize),
    );

    successResponse(
      res,
      {
        total: result.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        categories: result.categories,
      },
      "获取成功",
    );
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
  async deleteCategory(categoryId) {
    // 检查是否有文章属于这个分类
    const [articleCount] = await pool.query(
      "SELECT COUNT(*) as count FROM articles WHERE category_id = ?",
      [categoryId],
    );

    if (articleCount[0].count > 0) {
      throw new Error("该分类下还有文章，无法删除");
    }

    const [result] = await pool.query("DELETE FROM categories WHERE id = ?", [
      categoryId,
    ]);
    return result.affectedRows > 0;
  }

  async getAllCategories() {
    const [categories] = await pool.query(
      "SELECT * FROM categories ORDER BY sort DESC, create_time DESC",
    );
    return categories;
  }
}
  /**
   * 获取所有分类（不分页）
   */
  getAllCategories = asyncHandler(async (req, res, next) => {
    const categories = await categoryService.getAllCategories();
    successResponse(res, categories, "获取成功");
  });
}

module.exports = new CategoryController();
