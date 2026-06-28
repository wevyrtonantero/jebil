import api from "../api/axios";

async function getRelatorioAtendimentos(params = {}) {
  const response = await api.get("/relatorios/atendimentos", { params });
  return response.data.data;
}

export { getRelatorioAtendimentos };
