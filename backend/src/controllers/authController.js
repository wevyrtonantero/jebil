const { sendSuccess } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateLoginPayload } = require("../validators/authValidator");
const authService = require("../services/authService");

const login = asyncHandler(async (req, res) => {
  const payload = validateLoginPayload(req.body);
  const data = await authService.login(payload);

  sendSuccess(res, data, "Login realizado com sucesso.");
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getCurrentUser(req.user.id);

  sendSuccess(res, data, "Usuario autenticado carregado com sucesso.");
});

const logout = asyncHandler(async (_req, res) => {
  const data = authService.logout();

  sendSuccess(res, data, "Logout realizado com sucesso.");
});

const updateOwnPassword = asyncHandler(async (req, res) => {
  const senhaAtual = String(req.body?.senhaAtual || "");
  const novaSenha = String(req.body?.novaSenha || "");
  const data = await authService.updateOwnPassword(req.user.id, senhaAtual, novaSenha);

  sendSuccess(res, data, "Sua senha foi atualizada com sucesso.");
});

const updateSystemPassword = asyncHandler(async (req, res) => {
  const perfil = String(req.params.perfil || "").trim().toUpperCase();
  const senha = String(req.body?.senha || "");
  const data = await authService.updateSystemPassword(perfil, senha);

  sendSuccess(res, data, "Senha atualizada com sucesso.");
});

module.exports = {
  login,
  me,
  logout,
  updateOwnPassword,
  updateSystemPassword,
};
