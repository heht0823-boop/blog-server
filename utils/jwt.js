const jwt = require("jsonwebtoken");

// 检查必要的环境变量
const requiredEnvVars = ["JWT_SECRET", "REFRESH_TOKEN_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ 缺少环境变量: ${envVar}`);
    process.exit(1);
  }
}

class JwtUtil {
  constructor() {
    // JWT 配置
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    this.issuer = process.env.JWT_ISSUER || "blog-server";
    this.audience = process.env.JWT_AUDIENCE || "blog-client";
    this.algorithm = "HS256";

    // Token 过期时间
    this.accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES || "1h";
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES || "7d";
  }

  /**
   * 生成访问 Token
   * @param {Object} payload - Token 数据 { id, role, ... }
   * @param {string} expiresIn - 过期时间（可选，覆盖默认值）
   * @returns {string} JWT Token
   */
  generateAccessToken(payload, expiresIn = null) {
    try {
      if (!payload || !payload.id) {
        throw new Error("payload 必须包含 id 字段");
      }

      const token = jwt.sign(
        {
          ...payload,
          type: "access",
        },
        this.accessTokenSecret,
        {
          expiresIn: expiresIn || this.accessTokenExpiresIn,
          algorithm: this.algorithm,
          issuer: this.issuer,
          audience: this.audience,
          subject: String(payload.id),
        }
      );

      return token;
    } catch (err) {
      console.error("生成 AccessToken 失败:", err.message);
      throw new Error("AccessToken 生成失败");
    }
  }

  /**
   * 生成刷新 Token
   * @param {Object} payload - Token 数据 { id, role, ... }
   * @param {string} expiresIn - 过期时间（可选，覆盖默认值）
   * @returns {string} JWT Token
   */
  generateRefreshToken(payload, expiresIn = null) {
    try {
      if (!payload || !payload.id) {
        throw new Error("payload 必须包含 id 字段");
      }

      const token = jwt.sign(
        {
          ...payload,
          type: "refresh",
        },
        this.refreshTokenSecret,
        {
          expiresIn: expiresIn || this.refreshTokenExpiresIn,
          algorithm: this.algorithm,
          issuer: this.issuer,
          audience: this.audience,
          subject: String(payload.id),
        }
      );

      return token;
    } catch (err) {
      console.error("生成 RefreshToken 失败:", err.message);
      throw new Error("RefreshToken 生成失败");
    }
  }

  /**
   * 一次生成两个 Token
   * @param {Object} payload - Token 数据
   * @returns {Object} { accessToken, refreshToken, expiresIn }
   */
  generateTokenPair(payload) {
    try {
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      // 返回 accessToken 的过期时间（秒）
      const decoded = jwt.decode(accessToken);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      return {
        accessToken,
        refreshToken,
        expiresIn: Math.max(0, expiresIn),
      };
    } catch (err) {
      console.error("生成 Token 对失败:", err.message);
      throw err;
    }
  }

  /**
   * 验证访问 Token
   * @param {string} token - JWT Token
   * @returns {Object} 解码后的负载数据
   */
  verifyAccessToken(token) {
    try {
      if (!token) {
        const err = new Error("Token 不能为空");
        err.code = "TOKEN_INVALID";
        throw err;
      }

      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience,
      });

      // 验证 Token 类型
      if (decoded.type !== "access") {
        const err = new Error("Token 类型不匹配");
        err.code = "TOKEN_INVALID";
        throw err;
      }

      return decoded;
    } catch (err) {
      return this._handleJwtError(err, "AccessToken");
    }
  }

  /**
   * 验证刷新 Token
   * @param {string} token - JWT Token
   * @returns {Object} 解码后的负载数据
   */
  verifyRefreshToken(token) {
    try {
      if (!token) {
        const err = new Error("Refresh token 不能为空");
        err.code = "TOKEN_INVALID";
        throw err;
      }

      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience,
      });

      // 验证 Token 类型
      if (decoded.type !== "refresh") {
        const err = new Error("Token 类型不匹配");
        err.code = "TOKEN_INVALID";
        throw err;
      }

      return decoded;
    } catch (err) {
      return this._handleJwtError(err, "RefreshToken");
    }
  }

  /**
   * 刷新 Token 对
   * @param {string} refreshToken - 刷新 Token
   * @returns {Object} { accessToken, refreshToken, expiresIn }
   */
  refreshTokenPair(refreshToken) {
    try {
      // 验证旧的刷新 Token
      const decoded = this.verifyRefreshToken(refreshToken);

      // 生成新的 Token 对
      const newTokens = this.generateTokenPair({
        id: decoded.id,
        role: decoded.role,
      });

      return newTokens;
    } catch (err) {
      console.error("刷新 Token 对失败:", err.message);
      throw err;
    }
  }

  /**
   * 获取 Token 剩余有效时间（秒）
   * @param {string} token - JWT Token
   * @returns {number} 剩余时间（秒），过期返回 -1
   */
  getTokenRemainingTime(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return -1;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - currentTime;

      return remaining > 0 ? remaining : -1;
    } catch (err) {
      return -1;
    }
  }

  /**
   * 处理 JWT 错误
   * @private
   */
  _handleJwtError(err, tokenType = "Token") {
    if (err.name === "TokenExpiredError") {
      const customErr = new Error(`${tokenType} 已过期`);
      customErr.code = "TOKEN_EXPIRED";
      customErr.expiredAt = err.expiredAt;
      throw customErr;
    }

    if (err.name === "JsonWebTokenError") {
      const customErr = new Error(`${tokenType} 无效`);
      customErr.code = "TOKEN_INVALID";
      throw customErr;
    }

    if (err.name === "NotBeforeError") {
      const customErr = new Error(`${tokenType} 还未生效`);
      customErr.code = "TOKEN_NOT_BEFORE";
      throw customErr;
    }

    // 其他错误
    throw err;
  }
}

module.exports = new JwtUtil();
