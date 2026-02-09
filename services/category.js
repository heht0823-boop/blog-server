const { pool } = require("../config/db");

class CategoryService {
  /**
   * 创建分类（支持单个或批量创建，支持JSON字符串，自动去重）
   */
  async createCategory(categoriesData) {
    // 如果是字符串，尝试解析为JSON
    let parsedData = categoriesData;
    if (typeof categoriesData === "string") {
      try {
        parsedData = JSON.parse(categoriesData);
      } catch (error) {
        throw new Error("无效的JSON字符串");
      }
    }

    // 判断是单个对象还是数组
    const isBatch = Array.isArray(parsedData);
    const categories = isBatch ? parsedData : [parsedData];

    if (categories.length === 0) {
      throw new Error("分类数据不能为空");
    }

    // 验证数据并去重
    const validCategories = [];
    const processedNames = new Set();

    for (const category of categories) {
      // 验证必填字段
      if (!category.name || category.name.trim() === "") {
        throw new Error(`分类名称不能为空`);
      }

      const categoryName = category.name.trim();

      // 检查是否已处理过同名分类（去重）
      if (processedNames.has(categoryName)) {
        continue; // 跳过重复项
      }

      // 检查数据库中是否已存在同名分类
      const existingCategory = await this.getCategoryByName(categoryName);
      if (existingCategory) {
        continue; // 跳过已存在的分类
      }
      if (validCategories.length === 0) {
        // 收集已存在的分类名称
        const existingCategories = [];
        for (const category of categories) {
          const categoryName = category.name.trim();
          const existingCategory = await this.getCategoryByName(categoryName);
          if (existingCategory) {
            existingCategories.push(categoryName);
          }
        }

        throw new Error(`以下分类已存在: ${existingCategories.join(", ")}`);
      }
      validCategories.push({
        name: categoryName,
        sort: category.sort || 0,
      });
      processedNames.add(categoryName);
    }

    if (validCategories.length === 0) {
      return isBatch ? 0 : null;
    }

    // 构建占位符和值
    const placeholders = validCategories.map(() => "(?, ?)").join(", ");
    const values = validCategories.flatMap((cat) => [cat.name, cat.sort]);

    const query = `INSERT INTO categories (name, sort) VALUES ${placeholders}`;

    const [result] = await pool.query(query, values);

    // 如果是单个插入，返回 insertId；如果是批量插入，返回 affectedRows
    if (isBatch) {
      return {
        affectedRows: result.affectedRows,
        insertedCount: validCategories.length,
      };
    } else {
      return result.insertId;
    }
  }
  /**
   * 获取分类列表（分页）
   */
  async getCategories(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [categories] = await pool.query(
      "SELECT * FROM categories ORDER BY sort DESC, create_time DESC LIMIT ? OFFSET ?",
      [pageSize, offset],
    );

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM categories",
    );
    const total = countResult[0].total;

    return { total, categories };
  }

  /**
   * 获取单个分类详情
   */
  async getCategoryById(categoryId) {
    const [categories] = await pool.query(
      "SELECT * FROM categories WHERE id = ?",
      [categoryId],
    );

    return categories[0] || null;
  }

  /**
   * 根据名称获取分类
   */
  async getCategoryByName(name) {
    const [categories] = await pool.query(
      "SELECT * FROM categories WHERE name = ?",
      [name],
    );

    return categories[0] || null;
  }

  /**
   * 更新分类
   */
  async updateCategory(categoryId, updateData) {
    const allowedFields = ["name", "sort"];
    const fields = [];
    const values = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return 0;
    }

    values.push(categoryId);

    const [result] = await pool.query(
      `UPDATE categories SET ${fields.join(
        ", ",
      )}, update_time = NOW() WHERE id = ?`,
      values,
    );

    return result.affectedRows;
  }

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

  /**
   * 获取所有分类（不分页）
   */
  async getAllCategories() {
    const [categories] = await pool.query(
      "SELECT * FROM categories ORDER BY sort DESC, create_time DESC",
    );
    return categories;
  }
}

module.exports = new CategoryService();
