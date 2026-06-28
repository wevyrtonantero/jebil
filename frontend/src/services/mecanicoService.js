import api from "../api/axios";

async function listMecanicos(params = {}) {
  const response = await api.get("/mecanicos", { params });
  return response.data.data;
}

async function createMecanico(payload) {
  const response = await api.post("/mecanicos", payload);
  return response.data.data;
}

async function updateMecanico(id, payload) {
  const response = await api.put(`/mecanicos/${id}`, payload);
  return response.data.data;
}

async function updateMecanicoStatus(id, ativo) {
  const response = await api.patch(`/mecanicos/${id}/status`, { ativo });
  return response.data.data;
}

async function updateMecanicoDisponibilidade(id, disponivelHoje) {
  const response = await api.patch(`/mecanicos/${id}/disponibilidade`, { disponivel_hoje: disponivelHoje });
  return response.data.data;
}

async function uploadMecanicoFoto(id, file) {
  const formData = new FormData();
  formData.append("foto", file);

  const response = await api.post(`/mecanicos/${id}/foto`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data;
}

async function deleteMecanicoFoto(id) {
  const response = await api.delete(`/mecanicos/${id}/foto`);
  return response.data.data;
}

export {
  listMecanicos,
  createMecanico,
  updateMecanico,
  updateMecanicoStatus,
  updateMecanicoDisponibilidade,
  uploadMecanicoFoto,
  deleteMecanicoFoto,
};
