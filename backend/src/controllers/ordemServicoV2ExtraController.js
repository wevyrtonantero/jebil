const { sendSuccess } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const ordemServicoV2Service = require("../services/v2/ordemServicoV2Service");
const {
  validateRegistrarComunicacaoWhatsAppPayload,
  validateCreateOrcamentoPayload,
  validateUpdateOrcamentoStatusPayload,
  validateRegistrarPrevisaoPecaPayload,
  validateRetomarItemDaPecaPayload,
  validateAtribuirExecucaoPayload,
} = require("../validators/ordemServicoV2ExtraValidator");

const uploadFotosEntradaV2 = asyncHandler(async (req, res) => {
  const data = await ordemServicoV2Service.addFotosEntrada(Number(req.params.ordemId), req.files, req.user);
  sendSuccess(res, data, "Fotos de entrada V2 enviadas com sucesso.");
});

const finalizarCadastroFotosV2 = asyncHandler(async (req, res) => {
  const data = await ordemServicoV2Service.finalizarCadastroFotos(Number(req.params.ordemId), req.user);
  sendSuccess(res, data, "Cadastro de fotos finalizado com sucesso.");
});

const registrarComunicacaoWhatsAppV2 = asyncHandler(async (req, res) => {
  const payload = validateRegistrarComunicacaoWhatsAppPayload(req.body);
  const data = await ordemServicoV2Service.registrarComunicacaoWhatsApp(Number(req.params.ordemId), payload, req.user);
  sendSuccess(res, data, "Comunicacao WhatsApp V2 registrada com sucesso.", 201);
});

const confirmarRetiradaV2 = asyncHandler(async (req, res) => {
  const data = await ordemServicoV2Service.confirmarRetirada(Number(req.params.ordemId), req.user);
  sendSuccess(res, data, "Retirada da ordem de servico V2 confirmada com sucesso.");
});

const createOrcamentoV2 = asyncHandler(async (req, res) => {
  const payload = validateCreateOrcamentoPayload(req.body);
  const data = await ordemServicoV2Service.createOrcamento(Number(req.params.ordemId), payload, req.user);
  sendSuccess(res, data, "Orcamento V2 criado com sucesso.", 201);
});

const updateOrcamentoStatusV2 = asyncHandler(async (req, res) => {
  const payload = validateUpdateOrcamentoStatusPayload(req.body);
  const data = await ordemServicoV2Service.updateOrcamentoStatus(Number(req.params.id), payload, req.user);
  sendSuccess(res, data, "Status do orcamento V2 atualizado com sucesso.");
});

const registrarPrevisaoPecaV2 = asyncHandler(async (req, res) => {
  const payload = validateRegistrarPrevisaoPecaPayload(req.body);
  const data = await ordemServicoV2Service.registrarPrevisaoPeca(
    Number(req.params.ordemId),
    Number(req.params.itemId),
    payload,
    req.user,
  );
  sendSuccess(res, data, "Previsao de peca V2 registrada com sucesso.", 201);
});

const retomarItemDaPecaV2 = asyncHandler(async (req, res) => {
  const payload = validateRetomarItemDaPecaPayload(req.body);
  const data = await ordemServicoV2Service.retomarItemDaPeca(
    Number(req.params.ordemId),
    Number(req.params.itemId),
    payload,
    req.user,
  );
  sendSuccess(res, data, "Item V2 retomado apos aguardando peca com sucesso.");
});

const atribuirExecucaoV2 = asyncHandler(async (req, res) => {
  const payload = validateAtribuirExecucaoPayload(req.body);
  const data = await ordemServicoV2Service.atribuirExecucao(
    Number(req.params.ordemId),
    Number(req.params.itemId),
    payload,
    req.user,
  );
  sendSuccess(res, data, "Execucao V2 atribuida com sucesso.");
});

const uploadOrcamentoPdfV2 = asyncHandler(async (req, res) => {
  const data = await ordemServicoV2Service.uploadOrcamentoPdf(Number(req.params.id), req.file, req.user);
  sendSuccess(res, data, "PDF do orcamento V2 enviado com sucesso.");
});

const generateOrcamentoPdfV2 = asyncHandler(async (req, res) => {
  const data = await ordemServicoV2Service.generateOrcamentoPdf(Number(req.params.id), req.user);
  sendSuccess(res, data, "PDF do orcamento V2 gerado com sucesso.");
});

module.exports = {
  uploadFotosEntradaV2,
  finalizarCadastroFotosV2,
  registrarComunicacaoWhatsAppV2,
  confirmarRetiradaV2,
  createOrcamentoV2,
  updateOrcamentoStatusV2,
  registrarPrevisaoPecaV2,
  retomarItemDaPecaV2,
  atribuirExecucaoV2,
  uploadOrcamentoPdfV2,
  generateOrcamentoPdfV2,
};
