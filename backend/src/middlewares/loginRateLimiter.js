const rateLimit = require("express-rate-limit");
const { loginRateLimitWindowMs, loginRateLimitMax } = require("../config/env");

const loginRateLimiter = rateLimit({
  windowMs: loginRateLimitWindowMs,
  max: loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas tentativas de login. Tente novamente mais tarde.",
  },
});

module.exports = {
  loginRateLimiter,
};
