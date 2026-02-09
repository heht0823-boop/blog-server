const { pool } = require("../config/db");

class TagService {
  /**
   * 创建标签（支持单个或批量创建，支持JSON字符串，自动去重）
   */
  async createTag(tagsData) {
    // 如果是字符串，尝试解析为JSON
    let parsedData = tagsData;
    if (typeof tagsData === "string") {
      try {
        parsedData = JSON.parse(tagsData);
      } catch (error) {
        throw new Error("无效的JSON字符串");
      }
    }

    // 判断是单个对象还是数组
    const isBatch = Array.isArray(parsedData);
    const tags = isBatch ? parsedData : [parsedData];

    if (tags.length === 0) {
      throw new Error("标签数据不能为空");
    }

    // 验证数据并去重
    const validTags = [];
    const processedNames = new Set();
    const existingTags = [];

    // 第一步：验证所有标签并检查是否已存在
    for (const tag of tags) {
      // 验证必填字段
      if (!tag.name || tag.name.trim() === "") {
        throw new Error(`标签名称不能为空`);
      }

      const tagName = tag.name.trim();

      // 检查是否已处理过同名标签（去重）
      if (processedNames.has(tagName)) {
        continue; // 跳过重复项
      }

      // 检查数据库中是否已存在同名标签
      const existingTag = await this.getTagByName(tagName);
      if (existingTag) {
        existingTags.push(tagName);
      } else {
        validTags.push({ name: tagName });
      }

      processedNames.add(tagName);
    }

    // 如果有任何已存在的标签，抛出错误
    if (existingTags.length > 0) {
      throw new Error(`以下标签已存在: ${existingTags.join(", ")}`);
    }

    // 如果没有有效的标签需要创建
    if (validTags.length === 0) {
      return isBatch ? 0 : null;
    }

    // 执行批量插入
    const placeholders = validTags.map(() => "(?)").join(", ");
    const values = validTags.map((tag) => tag.name);

    const query = `INSERT INTO tags (name) VALUES ${placeholders}`;
    const [result] = await pool.query(query, values);

    // 返回结果
    if (isBatch) {
      return {
        affectedRows: result.affectedRows,
        insertedCount: validTags.length,
      };
    } else {
      return result.insertId;
    }
  }
  /**
   * 获取标签列表（分页）
   */
  async getTags(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [tags] = await pool.query(
      "SELECT * FROM tags ORDER BY create_time DESC LIMIT ? OFFSET ?",
      [pageSize, offset],
    );

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM tags",
    );
    const total = countResult[0].total;

    return { total, tags };
  }

  /**
   * 获取单个标签详情
   */
  async getTagById(tagId) {
    const [tags] = await pool.query("SELECT * FROM tags WHERE id = ?", [tagId]);

    return tags[0] || null;
  }

  /**
   * 根据名称获取标签
   */
  async getTagByName(name) {
    const [tags] = await pool.query("SELECT * FROM tags WHERE name = ?", [
      name,
    ]);

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
      values,
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
      [tagId],
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
      "SELECT * FROM tags ORDER BY create_time DESC",
    );
    return tags;
  }
}

module.exports = new TagService();
