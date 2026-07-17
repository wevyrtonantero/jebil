const { sendSuccess } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const ordemServicoV2Service = require("../services/v2/ordemServicoV2Service");
const {
  validateCreateOrdemServicoV2Payload,
  validateListOrdensServicoV2Query,
  validateUpdateItemStatusPayload,
  validateUpdateItemAutorizacaoPayload,
  validateUpdateItemPagamentoPayload,
  validateCreateDiagnosticoPayload,
  validateConcluirDiagnosticoPayload,
  validateAdicionarItensSugeridosPayload,
  validateAdicionarServicoRapidoPayload,
  validateReordenarControlePatioPayload,
} = require("../validators/ordemServicoV2Validator");

const listOrdensServicoV2 = asyncHandler(async (req, res) => {
  const filters = validateListOrdensServicoV2Query(req.query);
  const data = await ordemServicoV2Service.listOrdensServico(filters);
  sendSuccess(res, data, "Ordens de servico V2 listadas com sucesso.");
});

const getOrdemServicoV2 = asyncHandler(async (req, res) => {
  const data = await ordemServicoV2Service.getOrdemServicoById(Number(req.params.id));
  sendSuccess(res, data, "Ordem de servico V2 carregada com sucesso.");
});

const createOrdemServicoV2 = asyncHandler(async (req, res) => {
  const payload = validateCreateOrdemServicoV2Payload(req.body);
  const data = await ordemServicoV2Service.createOrdemServicoDraft(payload, req.user);
  sendSuccess(res, data, "Ordem de servico V2 criada com sucesso.", 201);
});

const updateItemStatusV2 = asyncHandler(async (req, res) => {
  const payload = validateUpdateItemStatusPayload(req.body);
  const data = await ordemServicoV2Service.updateItemStatus(
    Number(req.params.ordemId),
    Number(req.params.itemId),
    payload.status,
    req.user,
    payload.observacao,
  );
  sendSuccess(res, data, "Status do item V2 atualizado com sucesso.");
});

const updateItemAutorizacaoV2 = asyncHandler(async (req, res) => {
  const payload = validateUpdateItemAutorizacaoPayload(req.body);
  const data = await ordemServicoV2Service.updateItemAutorizacao(
    Number(req.params.ordemId),
    Number(req.params.itemId),
    payload.autorizacaoStatus,
    req.user,
    payload.observacao,
  );
  sendSuccess(res, data, "Autorizacao do item V2 atualizada com sucesso.");
});

const updateItemPagamentoV2 = asyncHandler(async (req, res) => {
  const payload = validateUpdateItemPagamentoPayload(req.body);
  const data = await ordemServicoV2Service.updateItemPagamento(
    Number(req.params.ordemId),
    Number(req.params.itemId),
    payload.pagamentoStatus,
    req.user,
    payload.observacao,
  );
  sendSuccess(res, data, "Pagamento do item V2 atualizado com sucesso.");
});

const createDiagnosticoV2 = asyncHandler(async (req, res) => {
  const payload = validateCreateDiagnosticoPayload(req.body);
  const data = await ordemServicoV2Service.createDiagnostico(Number(req.params.ordemId), payload, req.user);
  sendSuccess(res, data, "Diagnostico V2 criado com sucesso.", 201);
});

const concluirDiagnosticoV2 = asyncHandler(async (req, res) => {
  const payload = validateConcluirDiagnosticoPayload(req.body);
  const data = await ordemServicoV2Service.concluirDiagnostico(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Diagnostico V2 concluido com sucesso.");
});

const adicionarItensSugeridosDiagnosticoV2 = asyncHandler(async (req, res) => {
  const payload = validateAdicionarItensSugeridosPayload(req.body);
  const data = await ordemServicoV2Service.adicionarItensSugeridosDiagnostico(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Itens sugeridos do diagnostico V2 criados com sucesso.", 201);
});

const adicionarServicoRapidoV2 = asyncHandler(async (req, res) => {
  const payload = validateAdicionarServicoRapidoPayload(req.body);
  const data = await ordemServicoV2Service.adicionarServicoRapido(Number(req.params.ordemId), payload, req.user);
  sendSuccess(res, data, "Servico rapido V2 adicionado com sucesso.", 201);
});

const getProntuarioMotocicletaV2 = asyncHandler(async (req, res) => {
  const data = await ordemServicoV2Service.getProntuarioByMotocicletaId(Number(req.params.motocicletaId));
  sendSuccess(res, data, "Prontuario V2 da motocicleta carregado com sucesso.");
});

const listOperacionalV2 = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 30;
  const data = await ordemServicoV2Service.listOperacional(limit);
  sendSuccess(res, data, "Lista operacional V2 carregada com sucesso.");
});

const listItemSuggestionsV2 = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const data = await ordemServicoV2Service.listItemSuggestions(req.query.q, limit);
  sendSuccess(res, data, "Sugestoes de itens V2 carregadas com sucesso.");
});

const reordenarControlePatioV2 = asyncHandler(async (req, res) => {
  const payload = validateReordenarControlePatioPayload(req.body);
  const data = await ordemServicoV2Service.reordenarControlePatio(payload.ordemIds);
  sendSuccess(res, data, "Ordem do patio atualizada com sucesso.");
});

module.exports = {
  listOrdensServicoV2,
  getOrdemServicoV2,
  createOrdemServicoV2,
  updateItemStatusV2,
  updateItemAutorizacaoV2,
  updateItemPagamentoV2,
  createDiagnosticoV2,
  concluirDiagnosticoV2,
  adicionarItensSugeridosDiagnosticoV2,
  adicionarServicoRapidoV2,
  getProntuarioMotocicletaV2,
  listOperacionalV2,
  listItemSuggestionsV2,
  reordenarControlePatioV2,
};
