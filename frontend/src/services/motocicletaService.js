import api from "../api/axios";

async function listMotocicletas(params = {}) {
  const response = await api.get("/motocicletas", { params });
  return response.data;
}

async function listMotocicletasByCliente(clienteId) {
  const response = await api.get(`/clientes/${clienteId}/motocicletas`);
  return response.data.data;
}

async function createMotocicleta(payload) {
  const response = await api.post("/motocicletas", payload);
  return response.data.data;
}

async function updateMotocicleta(id, payload) {
  const response = await api.put(`/motocicletas/${id}`, payload);
  return response.data.data;
}

async function updateMotocicletaStatus(id, ativo) {
  const response = await api.patch(`/motocicletas/${id}/status`, { ativo });
  return response.data.data;
}

async function reactivateMotocicleta(id) {
  const response = await api.patch(`/motocicletas/${id}/reativar`);
  return response.data.data;
}

export {
  listMotocicletas,
  listMotocicletasByCliente,
  createMotocicleta,
  updateMotocicleta,
  updateMotocicletaStatus,
  reactivateMotocicleta,
};
