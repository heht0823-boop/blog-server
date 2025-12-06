const jwt = require("jsonwebtoken");

const requiredEnvVars = ["JWT_SECRET", "REFRESH_TOKEN_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ 缺少环境变量: ${envVar}`);
    process.exit(1);
  }
}

class JwtUtil {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    this.issuer = process.env.JWT_ISSUER || "blog-server";
    this.audience = process.env.JWT_AUDIENCE || "blog-client";
    this.algorithm = "HS256";

    this.accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES || "1h";
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES || "7d";
  }

  /**
   * 生成访问 Token
   */
  generateAccessToken(payload, expiresIn = null) {
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
  }

  /**
   * 生成刷新 Token
   */
  generateRefreshToken(payload, expiresIn = null) {
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
  }

  /**
   * 生成 Token 对
   */
  generateTokenPair(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    const decoded = jwt.decode(accessToken);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.max(0, expiresIn),
    };
  }

  /**
   * 验证访问 Token
   */
  verifyAccessToken(token) {
    if (!token) {
      const err = new Error("Token 不能为空");
      err.code = "TOKEN_INVALID";
      throw err;
    }

    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience,
      });

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
   */
  verifyRefreshToken(token) {
    if (!token) {
      const err = new Error("Refresh token 不能为空");
      err.code = "TOKEN_INVALID";
      throw err;
    }

    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience,
      });

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
   */
  refreshTokenPair(refreshToken) {
    const decoded = this.verifyRefreshToken(refreshToken);

    const newTokens = this.generateTokenPair({
      id: decoded.id,
      role: decoded.role,
    });

    return newTokens;
  }

  /**
   * 处理 JWT 错误
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

    throw err;
  }
}

module.exports = new JwtUtil();
