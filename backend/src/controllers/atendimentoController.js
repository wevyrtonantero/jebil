const { sendSuccess } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateAtendimentoPayload,
  validateAssumirPayload,
  validateStatusPayload,
  validateConclusaoPayload,
  validatePagamentoPayload,
  validateRecepcaoUpdatePayload,
  validateCancelarPayload,
} = require("../validators/atendimentoValidator");
const atendimentoService = require("../services/atendimentoService");

const listAtendimentos = asyncHandler(async (req, res) => {
  const data = await atendimentoService.listAtendimentos(req.query, req.user);
  sendSuccess(res, data, "Atendimentos listados com sucesso.");
});

const listFila = asyncHandler(async (req, res) => {
  const data = await atendimentoService.listFila(req.user);
  sendSuccess(res, data, "Fila carregada com sucesso.");
});

const getAtendimento = asyncHandler(async (req, res) => {
  const data = await atendimentoService.getAtendimentoById(Number(req.params.id), req.user);
  sendSuccess(res, data, "Atendimento carregado com sucesso.");
});

const createAtendimento = asyncHandler(async (req, res) => {
  const payload = validateAtendimentoPayload(req.body);
  const data = await atendimentoService.createAtendimento(payload, req.user);
  sendSuccess(res, data, "Atendimento criado com sucesso.", 201);
});

const assumirAtendimento = asyncHandler(async (req, res) => {
  const payload = validateAssumirPayload(req.body);
  const data = await atendimentoService.assumirAtendimento(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Atendimento assumido com sucesso.");
});

const alterarStatus = asyncHandler(async (req, res) => {
  const payload = validateStatusPayload(req.body);
  const data = await atendimentoService.alterarStatus(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Status do atendimento alterado com sucesso.");
});

const retornarFila = asyncHandler(async (req, res) => {
  const data = await atendimentoService.retornarParaFila(Number(req.params.id), req.user);
  sendSuccess(res, data, "Atendimento retornou para a fila com sucesso.");
});

const concluirServico = asyncHandler(async (req, res) => {
  const payload = validateConclusaoPayload(req.body);
  const data = await atendimentoService.concluirServico(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Servico concluido com sucesso.");
});

const confirmarPagamento = asyncHandler(async (req, res) => {
  const data = await atendimentoService.confirmarPagamento(Number(req.params.id), req.user);
  sendSuccess(res, data, "Pagamento confirmado com sucesso.");
});

const updatePagamento = asyncHandler(async (req, res) => {
  const payload = validatePagamentoPayload(req.body);
  const data = await atendimentoService.updatePagamento(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Pagamento atualizado com sucesso.");
});

const updateAtendimentoRecepcao = asyncHandler(async (req, res) => {
  const payload = validateRecepcaoUpdatePayload(req.body);
  const data = await atendimentoService.updateAtendimentoRecepcao(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Atendimento atualizado com sucesso.");
});

const liberarRetirada = asyncHandler(async (req, res) => {
  const data = await atendimentoService.liberarRetirada(Number(req.params.id), req.user);
  sendSuccess(res, data, "Motocicleta liberada para retirada com sucesso.");
});

const confirmarRetirada = asyncHandler(async (req, res) => {
  const data = await atendimentoService.confirmarRetirada(Number(req.params.id), req.user);
  sendSuccess(res, data, "Retirada confirmada com sucesso.");
});

const cancelarAtendimento = asyncHandler(async (req, res) => {
  const payload = validateCancelarPayload(req.body);
  const data = await atendimentoService.cancelarAtendimento(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Atendimento cancelado com sucesso.");
});

const getHistorico = asyncHandler(async (req, res) => {
  const data = await atendimentoService.getHistorico(Number(req.params.id));
  sendSuccess(res, data, "Historico do atendimento carregado com sucesso.");
});

module.exports = {
  listAtendimentos,
  listFila,
  getAtendimento,
  createAtendimento,
  assumirAtendimento,
  alterarStatus,
  retornarFila,
  concluirServico,
  confirmarPagamento,
  updatePagamento,
  updateAtendimentoRecepcao,
  liberarRetirada,
  confirmarRetirada,
  cancelarAtendimento,
  getHistorico,
};
