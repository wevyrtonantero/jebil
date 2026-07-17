const { ApiError } = require("../utils/ApiError");
const {
  autorizacaoStatusV2,
  itemOrigensV2,
  itemStatusV2,
  pagamentoStatusV2,
  prioridadeNiveisV2,
} = require("../utils/ordemServicoV2Rules");

const allowedPrioridades = new Set(prioridadeNiveisV2);
const allowedOrigens = new Set(itemOrigensV2);
const allowedAutorizacoes = new Set(autorizacaoStatusV2);
const allowedPagamentos = new Set(pagamentoStatusV2);
const allowedItemStatuses = new Set(itemStatusV2);

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function validateCreateOrdemServicoV2Payload(payload) {
  const clienteId = Number(payload.cliente_id);
  const motocicletaId = Number(payload.motocicleta_id);
  const queixaPrincipal = String(payload.queixa_principal || "").trim();
  const observacoesEntrada = payload.observacoes_entrada ? String(payload.observacoes_entrada).trim() : null;
  const observacoesInternas = payload.observacoes_internas ? String(payload.observacoes_internas).trim() : null;
  const dataPrometida = payload.data_prometida ? String(payload.data_prometida).trim() : null;
  const buscarMoto = Boolean(payload.buscar_moto);
  const atendimentoRapido = Boolean(payload.atendimento_rapido);
  const enderecoRetirada = payload.endereco_retirada ? String(payload.endereco_retirada).trim() : null;
  const kmEntrada = payload.km_entrada === undefined || payload.km_entrada === null || payload.km_entrada === ""
    ? null
    : Number(payload.km_entrada);

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    throw new ApiError(400, "cliente_id invalido.");
  }

  if (!Number.isInteger(motocicletaId) || motocicletaId <= 0) {
    throw new ApiError(400, "motocicleta_id invalido.");
  }

  if (kmEntrada !== null && (!Number.isInteger(kmEntrada) || kmEntrada < 0)) {
    throw new ApiError(400, "km_entrada invalido.");
  }

  if (buscarMoto && !enderecoRetirada) {
    throw new ApiError(400, "endereco_retirada e obrigatorio quando buscar_moto estiver ativo.");
  }

  if (!Array.isArray(payload.items)) {
    throw new ApiError(400, "items invalido para a ordem de servico V2.");
  }

  if (atendimentoRapido && payload.items.length === 0) {
    throw new ApiError(400, "Informe ao menos um item para o atendimento rapido.");
  }

  const items = payload.items.map((item, index) => {
    const descricao = String(item.descricao || "").trim();
    const categoria = item.categoria ? String(item.categoria).trim() : null;
    const tipo = item.tipo ? String(item.tipo).trim() : null;
    const origem = String(item.origem || "SOLICITADO_CLIENTE").trim().toUpperCase();
    const execucaoDireta = Boolean(item.execucao_direta);
    const exigeDiagnostico = Boolean(item.exige_diagnostico);
    const autorizacaoStatus = String(item.autorizacao_status || "AGUARDANDO_RESPOSTA").trim().toUpperCase();
    const pagamentoStatus = String(item.pagamento_status || "PENDENTE").trim().toUpperCase();
    const prioridade = String(item.prioridade || "NORMAL").trim().toUpperCase();
    const quantidade = item.quantidade === undefined || item.quantidade === null || item.quantidade === ""
      ? 1
      : Number(item.quantidade);
    const valorUnitario = item.valor_unitario === undefined || item.valor_unitario === null || item.valor_unitario === ""
      ? 0
      : Number(item.valor_unitario);
    const valorTotalInformado = item.valor_total === undefined || item.valor_total === null || item.valor_total === ""
      ? null
      : Number(item.valor_total);
    const itemDataPrometida = item.data_prometida ? String(item.data_prometida).trim() : null;
    const previsaoPecaAtual = item.previsao_peca_atual ? String(item.previsao_peca_atual).trim() : null;
    const observacoes = item.observacoes ? String(item.observacoes).trim() : null;
    const garantiaAplicavel = Boolean(item.garantia_aplicavel);

    if (!descricao) {
      throw new ApiError(400, `descricao do item ${index + 1} e obrigatoria.`);
    }

    if (!allowedOrigens.has(origem)) {
      throw new ApiError(400, `origem invalida no item ${index + 1}.`);
    }

    if (!allowedAutorizacoes.has(autorizacaoStatus)) {
      throw new ApiError(400, `autorizacao_status invalido no item ${index + 1}.`);
    }

    if (!allowedPagamentos.has(pagamentoStatus)) {
      throw new ApiError(400, `pagamento_status invalido no item ${index + 1}.`);
    }

    if (!allowedPrioridades.has(prioridade)) {
      throw new ApiError(400, `prioridade invalida no item ${index + 1}.`);
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new ApiError(400, `quantidade invalida no item ${index + 1}.`);
    }

    if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
      throw new ApiError(400, `valor_unitario invalido no item ${index + 1}.`);
    }

    if (valorTotalInformado !== null && (!Number.isFinite(valorTotalInformado) || valorTotalInformado < 0)) {
      throw new ApiError(400, `valor_total invalido no item ${index + 1}.`);
    }

    return {
      descricao,
      categoria,
      tipo,
      origem,
      execucaoDireta,
      exigeDiagnostico,
      autorizacaoStatus,
      pagamentoStatus,
      prioridade,
      quantidade,
      valorUnitario: roundMoney(valorUnitario),
      valorTotal: roundMoney(valorTotalInformado ?? quantidade * valorUnitario),
      dataPrometida: itemDataPrometida,
      previsaoPecaAtual,
      observacoes,
      garantiaAplicavel,
    };
  });

  return {
    clienteId,
    motocicletaId,
    queixaPrincipal,
    observacoesEntrada,
    observacoesInternas,
    dataPrometida,
    buscarMoto,
    atendimentoRapido,
    enderecoRetirada,
    kmEntrada,
    items,
  };
}

function validateListOrdensServicoV2Query(query) {
  const clienteId = query.cliente_id ? Number(query.cliente_id) : null;
  const motocicletaId = query.motocicleta_id ? Number(query.motocicleta_id) : null;
  const numeroOs = query.numero_os ? String(query.numero_os).trim() : null;
  const statusGeral = query.status_geral ? String(query.status_geral).trim().toUpperCase() : null;

  if (query.cliente_id && (!Number.isInteger(clienteId) || clienteId <= 0)) {
    throw new ApiError(400, "cliente_id invalido.");
  }

  if (query.motocicleta_id && (!Number.isInteger(motocicletaId) || motocicletaId <= 0)) {
    throw new ApiError(400, "motocicleta_id invalido.");
  }

  return {
    clienteId,
    motocicletaId,
    numeroOs,
    statusGeral,
  };
}

module.exports = {
  validateCreateOrdemServicoV2Payload,
  validateListOrdensServicoV2Query,
  validateUpdateItemStatusPayload,
  validateUpdateItemAutorizacaoPayload,
  validateUpdateItemPagamentoPayload,
  validateCreateDiagnosticoPayload,
  validateConcluirDiagnosticoPayload,
  validateAdicionarItensSugeridosPayload,
  validateAdicionarServicoRapidoPayload,
  validateReordenarControlePatioPayload,
};

function validateReordenarControlePatioPayload(payload) {
  if (!Array.isArray(payload.ordem_ids)) {
    throw new ApiError(400, "ordem_ids deve ser uma lista.");
  }

  if (payload.ordem_ids.length > 200) {
    throw new ApiError(400, "A fila do patio excede o limite de 200 motos.");
  }

  const ordemIds = payload.ordem_ids.map((id) => Number(id));

  if (ordemIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ApiError(400, "ordem_ids contem uma OS invalida.");
  }

  if (new Set(ordemIds).size !== ordemIds.length) {
    throw new ApiError(400, "ordem_ids nao pode conter OS duplicada.");
  }

  return { ordemIds };
}

function validateUpdateItemStatusPayload(payload) {
  const status = String(payload.status_item || "").trim().toUpperCase();
  const observacao = payload.observacao ? String(payload.observacao).trim() : null;

  if (!allowedItemStatuses.has(status)) {
    throw new ApiError(400, "status_item invalido.");
  }

  return {
    status,
    observacao,
  };
}

function validateUpdateItemAutorizacaoPayload(payload) {
  const autorizacaoStatus = String(payload.autorizacao_status || "").trim().toUpperCase();
  const observacao = payload.observacao ? String(payload.observacao).trim() : null;

  if (!allowedAutorizacoes.has(autorizacaoStatus)) {
    throw new ApiError(400, "autorizacao_status invalido.");
  }

  return {
    autorizacaoStatus,
    observacao,
  };
}

function validateUpdateItemPagamentoPayload(payload) {
  const pagamentoStatus = String(payload.pagamento_status || "").trim().toUpperCase();
  const observacao = payload.observacao ? String(payload.observacao).trim() : null;

  if (!allowedPagamentos.has(pagamentoStatus)) {
    throw new ApiError(400, "pagamento_status invalido.");
  }

  return {
    pagamentoStatus,
    observacao,
  };
}

function validateAdicionarServicoRapidoPayload(payload) {
  const descricao = String(payload.descricao || "").trim();
  const mecanicoPrincipalId = Number(payload.mecanico_principal_id);
  const mecanicosAuxiliaresIds = Array.isArray(payload.mecanicos_auxiliares_ids)
    ? payload.mecanicos_auxiliares_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const pecaCodigo = String(payload.peca_codigo || "").trim();
  const pecaDescricao = String(payload.peca_descricao || "").trim();

  if (!descricao) {
    throw new ApiError(400, "Informe o servico que sera feito.");
  }

  if (!Number.isInteger(mecanicoPrincipalId) || mecanicoPrincipalId <= 0) {
    throw new ApiError(400, "Selecione o mecanico responsavel pelo novo servico.");
  }

  if (!pecaCodigo) {
    throw new ApiError(400, "Informe o codigo da peca aplicada.");
  }

  if (!pecaDescricao) {
    throw new ApiError(400, "Informe a descricao/modelo da peca aplicada.");
  }

  return {
    descricao,
    mecanicoPrincipalId,
    mecanicosAuxiliaresIds: [...new Set(mecanicosAuxiliaresIds.filter((id) => id !== mecanicoPrincipalId))],
    pecaCodigo,
    pecaDescricao,
  };
}

function validateCreateDiagnosticoPayload(payload) {
  const itemDiagnosticoId = payload.item_diagnostico_id ? Number(payload.item_diagnostico_id) : null;
  const mecanicoPrincipalId = payload.mecanico_principal_id ? Number(payload.mecanico_principal_id) : null;
  const queixaAvaliada = String(payload.queixa_avaliada || "").trim();
  const causaIdentificada = payload.causa_identificada ? String(payload.causa_identificada).trim() : null;
  const descricaoTecnica = payload.descricao_tecnica ? String(payload.descricao_tecnica).trim() : null;
  const servicosSugeridosResumo = payload.servicos_sugeridos_resumo ? String(payload.servicos_sugeridos_resumo).trim() : null;
  const pecasSugeridasResumo = payload.pecas_sugeridas_resumo ? String(payload.pecas_sugeridas_resumo).trim() : null;
  const observacoes = payload.observacoes ? String(payload.observacoes).trim() : null;

  if (!queixaAvaliada) {
    throw new ApiError(400, "queixa_avaliada e obrigatoria.");
  }

  if (payload.item_diagnostico_id && (!Number.isInteger(itemDiagnosticoId) || itemDiagnosticoId <= 0)) {
    throw new ApiError(400, "item_diagnostico_id invalido.");
  }

  if (payload.mecanico_principal_id && (!Number.isInteger(mecanicoPrincipalId) || mecanicoPrincipalId <= 0)) {
    throw new ApiError(400, "mecanico_principal_id invalido.");
  }

  return {
    itemDiagnosticoId,
    mecanicoPrincipalId,
    queixaAvaliada,
    causaIdentificada,
    descricaoTecnica,
    servicosSugeridosResumo,
    pecasSugeridasResumo,
    observacoes,
  };
}

function validateConcluirDiagnosticoPayload(payload) {
  const causaIdentificada = payload.causa_identificada === undefined ? undefined : String(payload.causa_identificada || "").trim();
  const descricaoTecnica = payload.descricao_tecnica === undefined ? undefined : String(payload.descricao_tecnica || "").trim();
  const servicosSugeridosResumo =
    payload.servicos_sugeridos_resumo === undefined ? undefined : String(payload.servicos_sugeridos_resumo || "").trim();
  const pecasSugeridasResumo =
    payload.pecas_sugeridas_resumo === undefined ? undefined : String(payload.pecas_sugeridas_resumo || "").trim();
  const observacoes = payload.observacoes === undefined ? undefined : String(payload.observacoes || "").trim();
  const enviarOrcamentista = Boolean(payload.enviar_orcamentista);

  return {
    causaIdentificada,
    descricaoTecnica,
    servicosSugeridosResumo,
    pecasSugeridasResumo,
    observacoes,
    enviarOrcamentista,
  };
}

function validateAdicionarItensSugeridosPayload(payload) {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ApiError(400, "Informe ao menos um item sugerido.");
  }

  return {
    items: payload.items.map((item, index) => {
      const descricao = String(item.descricao || "").trim();
      const categoria = item.categoria ? String(item.categoria).trim() : null;
      const tipo = item.tipo ? String(item.tipo).trim() : null;
      const execucaoDireta = Boolean(item.execucao_direta);
      const exigeDiagnostico = Boolean(item.exige_diagnostico);
      const autorizacaoStatus = String(item.autorizacao_status || "AGUARDANDO_RESPOSTA").trim().toUpperCase();
      const pagamentoStatus = String(item.pagamento_status || "PENDENTE").trim().toUpperCase();
      const prioridade = String(item.prioridade || "NORMAL").trim().toUpperCase();
      const observacoes = item.observacoes ? String(item.observacoes).trim() : null;
      const garantiaAplicavel = Boolean(item.garantia_aplicavel);

      if (!descricao) {
        throw new ApiError(400, `descricao do item sugerido ${index + 1} e obrigatoria.`);
      }

      if (!allowedAutorizacoes.has(autorizacaoStatus)) {
        throw new ApiError(400, `autorizacao_status invalido no item sugerido ${index + 1}.`);
      }

      if (!allowedPagamentos.has(pagamentoStatus)) {
        throw new ApiError(400, `pagamento_status invalido no item sugerido ${index + 1}.`);
      }

      if (!allowedPrioridades.has(prioridade)) {
        throw new ApiError(400, `prioridade invalida no item sugerido ${index + 1}.`);
      }

      return {
        descricao,
        categoria,
        tipo,
        execucaoDireta,
        exigeDiagnostico,
        autorizacaoStatus,
        pagamentoStatus,
        prioridade,
        observacoes,
        garantiaAplicavel,
      };
    }),
  };
}
