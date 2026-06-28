const { sendSuccess } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateMotocicletaPayload, validateMotocicletaStatusPayload } = require("../validators/motocicletaValidator");
const motocicletaService = require("../services/motocicletaService");

const listMotocicletas = asyncHandler(async (req, res) => {
  const result = await motocicletaService.listMotocicletas(req.query);
  sendSuccess(res, result.rows, "Motocicletas listadas com sucesso.", 200, result.meta);
});

const getMotocicleta = asyncHandler(async (req, res) => {
  const data = await motocicletaService.getMotocicletaById(Number(req.params.id));
  sendSuccess(res, data, "Motocicleta carregada com sucesso.");
});

const listMotocicletasByCliente = asyncHandler(async (req, res) => {
  const data = await motocicletaService.listMotocicletasByClienteId(Number(req.params.clienteId));
  sendSuccess(res, data, "Motocicletas do cliente listadas com sucesso.");
});

const createMotocicleta = asyncHandler(async (req, res) => {
  const payload = validateMotocicletaPayload(req.body);
  const data = await motocicletaService.createMotocicleta(payload);
  sendSuccess(res, data, "Motocicleta criada com sucesso.", 201);
});

const updateMotocicleta = asyncHandler(async (req, res) => {
  const payload = validateMotocicletaPayload(req.body);
  const data = await motocicletaService.updateMotocicleta(Number(req.params.id), payload);
  sendSuccess(res, data, "Motocicleta atualizada com sucesso.");
});

const updateMotocicletaStatus = asyncHandler(async (req, res) => {
  const payload = validateMotocicletaStatusPayload(req.body);
  const data = await motocicletaService.updateMotocicletaStatus(Number(req.params.id), payload.ativo);
  sendSuccess(res, data, "Status da motocicleta atualizado com sucesso.");
});

const reactivateMotocicleta = asyncHandler(async (req, res) => {
  const data = await motocicletaService.reactivateMotocicleta(Number(req.params.id));
  sendSuccess(res, data, "Motocicleta reativada com sucesso.");
});

module.exports = {
  listMotocicletas,
  getMotocicleta,
  listMotocicletasByCliente,
  createMotocicleta,
  updateMotocicleta,
  updateMotocicletaStatus,
  reactivateMotocicleta,
};
