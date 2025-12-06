const { pool } = require("../config/db");

class TagService {
  /**
   * 创建标签
   */
  async createTag(tagData) {
    const { name } = tagData;
    
    const [result] = await pool.query(
      "INSERT INTO tags (name) VALUES (?)",
      [name]
    );
    
    return result.insertId;
  }

  /**
   * 获取标签列表（分页）
   */
  async getTags(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    
    const [tags] = await pool.query(
      "SELECT * FROM tags ORDER BY create_time DESC LIMIT ? OFFSET ?",
      [pageSize, offset]
    );
    
    const [countResult] = await pool.query("SELECT COUNT(*) as total FROM tags");
    const total = countResult[0].total;
    
    return { total, tags };
  }

  /**
   * 获取单个标签详情
   */
  async getTagById(tagId) {
    const [tags] = await pool.query(
      "SELECT * FROM tags WHERE id = ?",
      [tagId]
    );
    
    return tags[0] || null;
  }

  /**
   * 根据名称获取标签
   */
  async getTagByName(name) {
    const [tags] = await pool.query(
      "SELECT * FROM tags WHERE name = ?",
      [name]
    );
    
    return tags[0] || null;
  }

  /**
   * 更新标签
   */
  async updateTag(tagId, updateData) {
    const allowedFields = ["name"];
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
    
    values.push(tagId);
    
    const [result] = await pool.query(
      `UPDATE tags SET ${fields.join(", ")}, update_time = NOW() WHERE id = ?`,
      values
    );
    
    return result.affectedRows;
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId) {
    // 检查是否有文章使用了这个标签
    const [articleCount] = await pool.query(
      "SELECT COUNT(*) as count FROM article_tags WHERE tag_id = ?",
      [tagId]
    );
    
    if (articleCount[0].count > 0) {
      throw new Error("该标签已被文章使用，无法删除");
    }
    
    const [result] = await pool.query("DELETE FROM tags WHERE id = ?", [tagId]);
    return result.affectedRows > 0;
  }
  
  /**
   * 获取所有标签（不分页）
   */
  async getAllTags() {
    const [tags] = await pool.query(
      "SELECT * FROM tags ORDER BY create_time DESC"
    );
    return tags;
  }
}

module.exports = new TagService();