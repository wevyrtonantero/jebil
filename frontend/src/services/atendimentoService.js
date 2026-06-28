import api from "../api/axios";

async function listAtendimentos(params = {}) {
  const response = await api.get("/atendimentos", { params });
  return response.data.data;
}

async function listFila() {
  const response = await api.get("/atendimentos/fila");
  return response.data.data;
}

async function listHistorico(id) {
  const response = await api.get(`/atendimentos/${id}/historico`);
  return response.data.data;
}

async function createAtendimento(payload) {
  const response = await api.post("/atendimentos", payload);
  return response.data.data;
}

async function assumirAtendimento(id, mecanicoId) {
  const response = await api.patch(`/atendimentos/${id}/assumir`, {
    mecanico_id: mecanicoId,
  });
  return response.data.data;
}

async function alterarStatusAtendimento(id, status) {
  const response = await api.patch(`/atendimentos/${id}/status`, { status });
  return response.data.data;
}

async function retornarFila(id) {
  const response = await api.patch(`/atendimentos/${id}/retornar-fila`);
  return response.data.data;
}

async function concluirServico(id, servicoExecutado) {
  const response = await api.patch(`/atendimentos/${id}/concluir-servico`, {
    servico_executado: servicoExecutado,
  });
  return response.data.data;
}

async function confirmarPagamento(id) {
  const response = await api.patch(`/atendimentos/${id}/confirmar-pagamento`);
  return response.data.data;
}

async function updatePagamento(id, situacaoPagamento) {
  const response = await api.patch(`/atendimentos/${id}/pagamento`, {
    situacao_pagamento: situacaoPagamento,
  });
  return response.data.data;
}

async function updateAtendimentoRecepcao(id, payload) {
  const response = await api.patch(`/atendimentos/${id}/recepcao`, payload);
  return response.data.data;
}

async function liberarRetirada(id) {
  const response = await api.patch(`/atendimentos/${id}/liberar-retirada`);
  return response.data.data;
}

async function confirmarRetirada(id) {
  const response = await api.patch(`/atendimentos/${id}/confirmar-retirada`);
  return response.data.data;
}

async function cancelarAtendimento(id, motivo) {
  const response = await api.patch(`/atendimentos/${id}/cancelar`, { motivo });
  return response.data.data;
}

export {
  listAtendimentos,
  listFila,
  listHistorico,
  createAtendimento,
  assumirAtendimento,
  alterarStatusAtendimento,
  retornarFila,
  concluirServico,
  confirmarPagamento,
  updatePagamento,
  updateAtendimentoRecepcao,
  liberarRetirada,
  confirmarRetirada,
  cancelarAtendimento,
};
