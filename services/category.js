const { pool } = require("../config/db");

class CategoryService {
  /**
   * 创建分类
   */
  async createCategory(categoryData) {
    const { name, sort = 0 } = categoryData;
    
    const [result] = await pool.query(
      "INSERT INTO categories (name, sort) VALUES (?, ?)",
      [name, sort]
    );
    
    return result.insertId;
  }

  /**
   * 获取分类列表（分页）
   */
  async getCategories(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    
    const [categories] = await pool.query(
      "SELECT * FROM categories ORDER BY sort DESC, create_time DESC LIMIT ? OFFSET ?",
      [pageSize, offset]
    );
    
    const [countResult] = await pool.query("SELECT COUNT(*) as total FROM categories");
    const total = countResult[0].total;
    
    return { total, categories };
  }

  /**
   * 获取单个分类详情
   */
  async getCategoryById(categoryId) {
    const [categories] = await pool.query(
      "SELECT * FROM categories WHERE id = ?",
      [categoryId]
    );
    
    return categories[0] || null;
  }

  /**
   * 根据名称获取分类
   */
  async getCategoryByName(name) {
    const [categories] = await pool.query(
      "SELECT * FROM categories WHERE name = ?",
      [name]
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
      `UPDATE categories SET ${fields.join(", ")}, update_time = NOW() WHERE id = ?`,
      values
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
      [categoryId]
    );
    
    if (articleCount[0].count > 0) {
      throw new Error("该分类下还有文章，无法删除");
    }
    
    const [result] = await pool.query("DELETE FROM categories WHERE id = ?", [categoryId]);
    return result.affectedRows > 0;
  }
  
  /**
   * 获取所有分类（不分页）
   */
  async getAllCategories() {
    const [categories] = await pool.query(
      "SELECT * FROM categories ORDER BY sort DESC, create_time DESC"
    );
    return categories;
  }
}

module.exports = new CategoryService();