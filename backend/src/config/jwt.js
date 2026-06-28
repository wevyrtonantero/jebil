const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("./env");

function signAccessToken(payload) {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
