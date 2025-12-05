const jwt = require("jsonwebtoken");

class JwtUtil {
  /**
   * 生成 Token 对（访问 Token + 刷新 Token）
   * @param {Object} payload - Token 数据
   * @returns {Object} { accessToken, refreshToken }
   */
  generateTokenPair(payload) {
    try {
      // 访问 Token（1小时）
      const accessToken = jwt.sign(
        { ...payload, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // 刷新 Token（7天）
      const refreshToken = jwt.sign(
        { ...payload, type: "refresh" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return { accessToken, refreshToken };
    } catch (err) {
      throw new Error("Token 生成失败");
    }
  }

  /**
   * 验证访问 Token
   * @param {string} token - Token 字符串
   * @returns {Object} 解码后的 payload
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== "access") {
        const err = new Error("Token 类型错误");
        err.code = "TOKEN_INVALID";
        throw err;
      }
      return decoded;
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        const customErr = new Error("Token 已过期");
        customErr.code = "TOKEN_EXPIRED";
        throw customErr;
      }
      const customErr = new Error("Token 无效");
      customErr.code = "TOKEN_INVALID";
      throw customErr;
    }
  }

  /**
   * 验证刷新 Token
   * @param {string} token - Token 字符串
   * @returns {Object} 解码后的 payload
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== "refresh") {
        const err = new Error("Token 类型错误");
        err.code = "TOKEN_INVALID";
        throw err;
      }
      return decoded;
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        const customErr = new Error("Refresh token 已过期");
        customErr.code = "TOKEN_EXPIRED";
        throw customErr;
      }
      const customErr = new Error("Refresh token 无效");
      customErr.code = "TOKEN_INVALID";
      throw customErr;
    }
  }

  /**
   * 刷新 Token 对
   * @param {string} refreshToken - 刷新 Token
   * @returns {Object} { accessToken, refreshToken }
   */
  refreshTokenPair(refreshToken) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      const { id, role } = decoded;
      return this.generateTokenPair({ id, role });
    } catch (err) {
      throw err;
    }
  }

  /**
   * 检查 Token 是否即将过期
   * @param {string} token - Token 字符串
   * @param {number} threshold - 阈值（秒）
   * @returns {boolean}
   */
  isTokenExpiringSoon(token, threshold = 600) {
    try {
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp - now < threshold;
    } catch {
      return false;
    }
  }

  /**
   * 获取 Token 剩余时间
   * @param {string} token - Token 字符串
   * @returns {number} 剩余秒数
   */
  getTokenRemainingTime(token) {
    try {
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - now);
    } catch {
      return 0;
    }
  }
}

module.exports = new JwtUtil();
