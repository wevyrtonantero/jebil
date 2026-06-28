const { sendSuccess } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateClientePayload, validateClienteStatusPayload } = require("../validators/clienteValidator");
const clienteService = require("../services/clienteService");

const listClientes = asyncHandler(async (req, res) => {
  const result = await clienteService.listClientes(req.query);
  sendSuccess(res, result.rows, "Clientes listados com sucesso.", 200, result.meta);
});

const getCliente = asyncHandler(async (req, res) => {
  const data = await clienteService.getClienteById(Number(req.params.id));
  sendSuccess(res, data, "Cliente carregado com sucesso.");
});

const createCliente = asyncHandler(async (req, res) => {
  const payload = validateClientePayload(req.body);
  const data = await clienteService.createCliente(payload);
  sendSuccess(res, data, "Cliente criado com sucesso.", 201);
});

const updateCliente = asyncHandler(async (req, res) => {
  const payload = validateClientePayload(req.body);
  const data = await clienteService.updateCliente(Number(req.params.id), payload);
  sendSuccess(res, data, "Cliente atualizado com sucesso.");
});

const updateClienteStatus = asyncHandler(async (req, res) => {
  const payload = validateClienteStatusPayload(req.body);
  const data = await clienteService.updateClienteStatus(Number(req.params.id), payload.ativo);
  sendSuccess(res, data, "Status do cliente atualizado com sucesso.");
});

const reactivateCliente = asyncHandler(async (req, res) => {
  const data = await clienteService.reactivateCliente(Number(req.params.id));
  sendSuccess(res, data, "Cliente reativado com sucesso.");
});

module.exports = {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  updateClienteStatus,
  reactivateCliente,
};
