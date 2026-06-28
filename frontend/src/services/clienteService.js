import api from "../api/axios";

async function listClientes(params = {}) {
  const response = await api.get("/clientes", { params });
  return response.data;
}

async function createCliente(payload) {
  const response = await api.post("/clientes", payload);
  return response.data.data;
}

async function updateCliente(id, payload) {
  const response = await api.put(`/clientes/${id}`, payload);
  return response.data.data;
}

async function updateClienteStatus(id, ativo) {
  const response = await api.patch(`/clientes/${id}/status`, { ativo });
  return response.data.data;
}

async function reactivateCliente(id) {
  const response = await api.patch(`/clientes/${id}/reativar`);
  return response.data.data;
}

export { listClientes, createCliente, updateCliente, updateClienteStatus, reactivateCliente };
