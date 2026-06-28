const { ApiError } = require("../utils/ApiError");

function validateLoginPayload(payload) {
  const email = String(payload.email || payload.login || "").trim().toLowerCase();
  const senha = String(payload.senha || "");

  if (!email) {
    throw new ApiError(400, "Login e obrigatorio.");
  }

  if (!senha) {
    throw new ApiError(400, "Senha e obrigatoria.");
  }

  return {
    email,
    senha,
  };
}

module.exports = {
  validateLoginPayload,
};
