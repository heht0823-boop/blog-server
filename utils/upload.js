const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { errorResponse } = require("../middleware/errorHandler");

// 上传目录配置
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]; // 允许的文件类型
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE) || 2 * 1024 * 1024; // 2MB

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  // 存储路径
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  // 文件名（避免重复）：时间戳+原文件名
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, "-"); // 替换空格
    const fileName = `${timestamp}-${originalName}`;
    cb(null, fileName);
  },
});

// 文件过滤（类型+大小）
const fileFilter = (req, file, cb) => {
  // 验证文件类型
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error("不支持的文件类型，仅允许JPG/PNG/GIF/WebP"), false);
  }
  // 验证文件大小
  if (file.size > MAX_SIZE) {
    return cb(
      new Error(`文件大小超过限制，最大支持${process.env.UPLOAD_MAX_SIZE}`),
      false
    );
  }
  cb(null, true);
};

// 创建上传中间件
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

/**
 * 封装文件上传响应处理：
 * - 返回文件访问URL
 */
const handleUpload = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return errorResponse(res, err, err.message, 400);
      }
      if (!req.file) {
        return errorResponse(res, null, "请选择文件", 400);
      }
      // 构建文件访问URL（后端域名+文件路径）
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;
      req.uploadFile = {
        url: fileUrl,
        path: req.file.path,
        filename: req.file.filename,
      };
      next();
    });
  };
};

module.exports = { upload, handleUpload };
