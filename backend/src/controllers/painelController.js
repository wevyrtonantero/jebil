const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const painelService = require("../services/painelService");
const painelPublicoService = require("../services/painelPublicoService");

const getPainelOficina = asyncHandler(async (_req, res) => {
  const data = await painelService.getPainelOficina();
  sendSuccess(res, data, "Painel interno da oficina carregado com sucesso.");
});

const getPainelClientes = asyncHandler(async (_req, res) => {
  const data = await painelService.getPainelClientes();
  sendSuccess(res, data, "Painel de clientes carregado com sucesso.");
});

const getPainelClientesContexto = asyncHandler(async (_req, res) => {
  const data = await painelPublicoService.getPainelClientesContexto();
  sendSuccess(res, data, "Contexto publico do painel carregado com sucesso.");
});

module.exports = {
  getPainelOficina,
  getPainelClientes,
  getPainelClientesContexto,
};
