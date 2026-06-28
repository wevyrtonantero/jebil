const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { validateRelatorioQuery } = require("../validators/relatorioValidator");
const relatorioService = require("../services/relatorioService");

const getRelatorioAtendimentos = asyncHandler(async (req, res) => {
  const filters = validateRelatorioQuery(req.query);
  const data = await relatorioService.gerarRelatorio(filters, req.user);
  sendSuccess(res, data, "Relatorio carregado com sucesso.");
});

module.exports = {
  getRelatorioAtendimentos,
};
