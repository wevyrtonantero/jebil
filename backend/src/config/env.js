const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

module.exports = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  port: Number(getEnv("PORT", 3333)),
  frontendUrl: getEnv("FRONTEND_URL", "http://localhost:5173"),
  jwtSecret: getEnv("JWT_SECRET", "change-this-secret"),
  jwtExpiresIn: getEnv("JWT_EXPIRES_IN", "8h"),
  loginRateLimitWindowMs: Number(getEnv("LOGIN_RATE_LIMIT_WINDOW_MS", 900000)),
  loginRateLimitMax: Number(getEnv("LOGIN_RATE_LIMIT_MAX", 10)),
  uploadBaseUrl: getEnv("UPLOAD_BASE_URL", "http://localhost:3333"),
  uploadDir: getEnv("UPLOAD_DIR", "uploads"),
};
