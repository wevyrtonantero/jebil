const { sendSuccess } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateMecanicoPayload,
  validateMecanicoStatusPayload,
  validateMecanicoDisponibilidadePayload,
} = require("../validators/mecanicoValidator");
const mecanicoService = require("../services/mecanicoService");

const listMecanicos = asyncHandler(async (req, res) => {
  const data = await mecanicoService.listMecanicos(req.query);
  sendSuccess(res, data, "Mecanicos listados com sucesso.");
});

const getMecanico = asyncHandler(async (req, res) => {
  const data = await mecanicoService.getMecanicoById(Number(req.params.id));
  sendSuccess(res, data, "Mecanico carregado com sucesso.");
});

const createMecanico = asyncHandler(async (req, res) => {
  const payload = validateMecanicoPayload(req.body);
  const data = await mecanicoService.createMecanico(payload);
  sendSuccess(res, data, "Mecanico criado com sucesso.", 201);
});

const updateMecanico = asyncHandler(async (req, res) => {
  const payload = validateMecanicoPayload(req.body);
  const data = await mecanicoService.updateMecanico(Number(req.params.id), payload);
  sendSuccess(res, data, "Mecanico atualizado com sucesso.");
});

const updateMecanicoStatus = asyncHandler(async (req, res) => {
  const payload = validateMecanicoStatusPayload(req.body);
  const data = await mecanicoService.updateMecanicoStatus(Number(req.params.id), payload.ativo);
  sendSuccess(res, data, "Status do mecanico atualizado com sucesso.");
});

const updateMecanicoDisponibilidade = asyncHandler(async (req, res) => {
  const payload = validateMecanicoDisponibilidadePayload(req.body);
  const data = await mecanicoService.updateMecanicoDisponibilidade(Number(req.params.id), payload.disponivelHoje);
  sendSuccess(res, data, "Disponibilidade do mecanico atualizada com sucesso.");
});

const uploadFoto = asyncHandler(async (req, res) => {
  const data = await mecanicoService.updateMecanicoFoto(Number(req.params.id), req.file);
  sendSuccess(res, data, "Foto do mecanico atualizada com sucesso.");
});

const deleteFoto = asyncHandler(async (req, res) => {
  const data = await mecanicoService.deleteMecanicoFoto(Number(req.params.id));
  sendSuccess(res, data, "Foto do mecanico removida com sucesso.");
});

module.exports = {
  listMecanicos,
  getMecanico,
  createMecanico,
  updateMecanico,
  updateMecanicoStatus,
  updateMecanicoDisponibilidade,
  uploadFoto,
  deleteFoto,
};
