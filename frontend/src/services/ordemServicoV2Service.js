import api from "../api/axios";

async function listOrdensServicoV2(params = {}) {
  const response = await api.get("/v2/ordens-servico", { params });
  return response.data.data;
}

async function listOperacionalV2(limit = 30) {
  const response = await api.get("/v2/ordens-servico/operacional/lista", {
    params: { limit },
  });
  return response.data.data;
}

async function listItemSuggestionsV2(query = "", limit = 20) {
  const response = await api.get("/v2/ordens-servico/sugestoes-itens", {
    params: { q: query, limit },
  });
  return response.data.data;
}

async function getOrdemServicoV2(id) {
  const response = await api.get(`/v2/ordens-servico/${id}`);
  return response.data.data;
}

async function createOrdemServicoV2(payload) {
  const response = await api.post("/v2/ordens-servico", payload);
  return response.data.data;
}

async function uploadFotosEntradaV2(ordemId, files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("fotos", file);
  });

  const response = await api.post(`/v2/ordens-servico/${ordemId}/fotos-entrada`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.data;
}

async function finalizarCadastroFotosV2(ordemId) {
  const response = await api.patch(`/v2/ordens-servico/${ordemId}/finalizar-cadastro-fotos`);
  return response.data.data;
}

async function registrarComunicacaoWhatsAppV2(ordemId, payload) {
  const response = await api.post(`/v2/ordens-servico/${ordemId}/comunicacoes-whatsapp`, payload);
  return response.data.data;
}

async function createOrcamentoV2(ordemId, payload) {
  const response = await api.post(`/v2/ordens-servico/${ordemId}/orcamentos`, payload);
  return response.data.data;
}

async function updateOrcamentoStatusV2(orcamentoId, payload) {
  const response = await api.patch(`/v2/ordens-servico/orcamentos/${orcamentoId}/status`, payload);
  return response.data.data;
}

async function uploadOrcamentoPdfV2(orcamentoId, file) {
  const formData = new FormData();
  formData.append("arquivo", file);

  const response = await api.post(`/v2/ordens-servico/orcamentos/${orcamentoId}/pdf`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.data;
}

async function generateOrcamentoPdfV2(orcamentoId) {
  const response = await api.post(`/v2/ordens-servico/orcamentos/${orcamentoId}/gerar-pdf`);
  return response.data.data;
}

async function registrarPrevisaoPecaV2(ordemId, itemId, payload) {
  const response = await api.post(`/v2/ordens-servico/${ordemId}/items/${itemId}/previsoes-pecas`, payload);
  return response.data.data;
}

async function retomarItemDaPecaV2(ordemId, itemId, payload) {
  const response = await api.patch(`/v2/ordens-servico/${ordemId}/items/${itemId}/retomar-peca`, payload);
  return response.data.data;
}

async function atribuirExecucaoV2(ordemId, itemId, payload) {
  const response = await api.post(`/v2/ordens-servico/${ordemId}/items/${itemId}/execucao`, payload);
  return response.data.data;
}

async function updateItemStatusV2(ordemId, itemId, statusItem, observacao = null) {
  const response = await api.patch(`/v2/ordens-servico/${ordemId}/items/${itemId}/status`, {
    status_item: statusItem,
    observacao,
  });
  return response.data.data;
}

async function updateItemAutorizacaoV2(ordemId, itemId, autorizacaoStatus, observacao = null) {
  const response = await api.patch(`/v2/ordens-servico/${ordemId}/items/${itemId}/autorizacao`, {
    autorizacao_status: autorizacaoStatus,
    observacao,
  });
  return response.data.data;
}

async function updateItemPagamentoV2(ordemId, itemId, pagamentoStatus, observacao = null) {
  const response = await api.patch(`/v2/ordens-servico/${ordemId}/items/${itemId}/pagamento`, {
    pagamento_status: pagamentoStatus,
    observacao,
  });
  return response.data.data;
}

async function createDiagnosticoV2(ordemId, payload) {
  const response = await api.post(`/v2/ordens-servico/${ordemId}/diagnosticos`, payload);
  return response.data.data;
}

async function concluirDiagnosticoV2(diagnosticoId, payload) {
  const response = await api.patch(`/v2/ordens-servico/diagnosticos/${diagnosticoId}/concluir`, payload);
  return response.data.data;
}

async function adicionarItensSugeridosDiagnosticoV2(diagnosticoId, payload) {
  const response = await api.post(`/v2/ordens-servico/diagnosticos/${diagnosticoId}/itens-sugeridos`, payload);
  return response.data.data;
}

async function getProntuarioMotocicletaV2(motocicletaId) {
  const response = await api.get(`/v2/ordens-servico/prontuario/motocicletas/${motocicletaId}`);
  return response.data.data;
}

export {
  listOrdensServicoV2,
  listOperacionalV2,
  listItemSuggestionsV2,
  getOrdemServicoV2,
  createOrdemServicoV2,
  uploadFotosEntradaV2,
  finalizarCadastroFotosV2,
  registrarComunicacaoWhatsAppV2,
  createOrcamentoV2,
  updateOrcamentoStatusV2,
  uploadOrcamentoPdfV2,
  generateOrcamentoPdfV2,
  registrarPrevisaoPecaV2,
  retomarItemDaPecaV2,
  atribuirExecucaoV2,
  updateItemStatusV2,
  updateItemAutorizacaoV2,
  updateItemPagamentoV2,
  createDiagnosticoV2,
  concluirDiagnosticoV2,
  adicionarItensSugeridosDiagnosticoV2,
  getProntuarioMotocicletaV2,
};
