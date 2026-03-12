const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { errorResponse } = require("../middleware/errorHandler");

// ===== 上传目录配置 =====
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";
// 计算绝对路径（相对于项目根目录）
const ABSOLUTE_UPLOAD_DIR = path.resolve(__dirname, "../", UPLOAD_DIR);

// ===== 文件类型和大小限制 =====
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE) || 2 * 1024 * 1024; // 2MB

// 确保上传目录存在
if (!fs.existsSync(ABSOLUTE_UPLOAD_DIR)) {
  fs.mkdirSync(ABSOLUTE_UPLOAD_DIR, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ABSOLUTE_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    const fileName = `${timestamp}-${baseName}${ext}`;
    cb(null, fileName);
  },
});

// 文件过滤（类型 + 大小）
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error("不支持的文件类型，仅允许 JPG/PNG/GIF/WebP"), false);
  }
  if (file.size > MAX_SIZE) {
    return cb(
      new Error(`文件大小超过限制，最大支持${MAX_SIZE / 1024 / 1024}MB`),
      false,
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
 * 封装文件上传响应处理
 */
const handleUpload = (fieldName) => {
  const SERVER_DOMAIN =
    process.env.SERVER_DOMAIN || "http://101.132.192.107:3000";

  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return errorResponse(res, err, err.message, 400);
      }
      if (!req.file) {
        return errorResponse(res, null, "请选择文件", 400);
      }
      const fileUrl = `${SERVER_DOMAIN}/uploads/${req.file.filename}`;
      req.uploadFile = {
        url: fileUrl,
        path: req.file.path,
        filename: req.file.filename,
      };
      next();
    });
  };
};

// ✅ 导出上传目录绝对路径供其他模块使用
module.exports = {
  upload,
  handleUpload,
  UPLOAD_DIR: ABSOLUTE_UPLOAD_DIR,
};
