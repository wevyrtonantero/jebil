const db = require("../database/connection");
const { ApiError } = require("../utils/ApiError");
const { formatOsNumber } = require("../utils/formatOsNumber");
const { normalizeCpf } = require("../utils/normalizeCpf");
const { canTransitionOperationalStatus, activeServiceStatuses } = require("../utils/statusRules");
const clienteRepository = require("../repositories/clienteRepository");
const motocicletaRepository = require("../repositories/motocicletaRepository");
const mecanicoRepository = require("../repositories/mecanicoRepository");
const atendimentoRepository = require("../repositories/atendimentoRepository");
const historicoRepository = require("../repositories/historicoRepository");
const { registrarHistorico } = require("./historicoService");
const { emitSocketEvent } = require("../sockets");
const { mapAtendimentoByPerfil } = require("../utils/atendimentoDtos");

async function generateNumeroOs(trx) {
  const year = new Date().getFullYear();
  const sequence = await atendimentoRepository.getSequenceRowForYear(trx, year);

  if (!sequence) {
    await atendimentoRepository.insertSequenceRow(trx, year, 1);
    return formatOsNumber(year, 1);
  }

  const nextNumber = Number(sequence.ultimo_numero) + 1;
  await atendimentoRepository.updateSequenceRow(trx, year, nextNumber);
  return formatOsNumber(year, nextNumber);
}

async function ensureAtendimentoExists(id, trx = db) {
  const atendimento = await atendimentoRepository.findById(id, trx);

  if (!atendimento) {
    throw new ApiError(404, "Atendimento nao encontrado.");
  }

  return atendimento;
}

async function listAtendimentos(query, currentUser) {
  const atendimentos = await atendimentoRepository.list({
    status: query.status ? String(query.status).trim().toUpperCase() : null,
    mecanicoId: query.mecanico_id ? Number(query.mecanico_id) : null,
    situacaoPagamento: query.situacao_pagamento ? String(query.situacao_pagamento).trim().toUpperCase() : null,
    numeroOs: query.numero_os ? String(query.numero_os).trim() : null,
    clienteNome: query.cliente_nome ? String(query.cliente_nome).trim() : null,
    clienteCpf: query.cliente_cpf ? normalizeCpf(query.cliente_cpf) : null,
    placa: query.placa ? String(query.placa).trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : null,
    startDate: query.data_inicial ? String(query.data_inicial).trim() : null,
    endDate: query.data_final ? String(query.data_final).trim() : null,
  });

  return atendimentos.map((item) => mapAtendimentoByPerfil(item, currentUser.perfil));
}

async function listFila(currentUser) {
  const fila = await atendimentoRepository.listFila();
  return fila.map((item) => mapAtendimentoByPerfil(item, currentUser.perfil));
}

async function getAtendimentoById(id, currentUser) {
  const atendimento = await ensureAtendimentoExists(id);
  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function createAtendimento(payload, currentUser) {
  const cliente = await clienteRepository.findById(payload.clienteId);

  if (!cliente) {
    throw new ApiError(404, "Cliente nao encontrado.");
  }

  const motocicleta = await motocicletaRepository.findById(payload.motocicletaId);

  if (!motocicleta) {
    throw new ApiError(404, "Motocicleta nao encontrada.");
  }

  if (Number(motocicleta.cliente_id) !== payload.clienteId) {
    throw new ApiError(400, "A motocicleta informada nao pertence ao cliente selecionado.");
  }

  const atendimento = await db.transaction(async (trx) => {
    const numeroOs = await generateNumeroOs(trx);
    const entradaEm = new Date();
    const created = await atendimentoRepository.insert(trx, {
      numeroOs,
      clienteId: payload.clienteId,
      motocicletaId: payload.motocicletaId,
      problemaServico: payload.problemaServico,
      observacoes: payload.observacoes,
      observacoesInternas: payload.observacoesInternas,
      situacaoPagamento: payload.situacaoPagamento,
      status: "AGUARDANDO",
      entradaEm,
      criadoPor: currentUser.id,
    });

    await registrarHistorico(trx, {
      atendimentoId: created.id,
      usuarioId: currentUser.id,
      acao: "CRIADO",
      statusNovo: "AGUARDANDO",
      observacao: "Atendimento criado na recepcao.",
    });

    await registrarHistorico(trx, {
      atendimentoId: created.id,
      usuarioId: currentUser.id,
      acao: "ENVIADO_PARA_FILA",
      statusNovo: "AGUARDANDO",
      observacao: "Atendimento enviado automaticamente para a fila.",
    });

    return created;
  });

  emitSocketEvent("atendimento:criado", { atendimentoId: atendimento.id });
  emitSocketEvent("fila:atualizada", {});

  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function assumirAtendimento(id, payload, currentUser) {
  const mecanico = await mecanicoRepository.findById(payload.mecanicoId);

  if (!mecanico) {
    throw new ApiError(404, "Mecanico nao encontrado.");
  }

  if (!mecanico.ativo) {
    throw new ApiError(409, "Mecanico inativo nao pode assumir novos atendimentos.");
  }

  if (!mecanico.disponivel_hoje) {
    throw new ApiError(409, "Mecanico esta fora da escala no momento.");
  }

  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);

    if (existing.status !== "AGUARDANDO" || existing.mecanico_id) {
      throw new ApiError(409, "Este atendimento nao esta mais disponivel para assumir.");
    }

    const updated = await atendimentoRepository.updateFields(trx, id, {
      mecanico_id: payload.mecanicoId,
      status: "EM_SERVICO",
      assumido_em: db.fn.now(),
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: payload.mecanicoId,
      acao: "ASSUMIDO",
      statusAnterior: existing.status,
      statusNovo: "EM_SERVICO",
      observacao: "Atendimento assumido por mecanico.",
    });

    return updated;
  });

  emitSocketEvent("atendimento:assumido", { atendimentoId: atendimento.id, mecanicoId: atendimento.mecanico_id });
  emitSocketEvent("fila:atualizada", {});
  emitSocketEvent("mecanico:atualizado", { mecanicoId: atendimento.mecanico_id });

  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function alterarStatus(id, payload, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);

    if (!activeServiceStatuses.has(existing.status)) {
      throw new ApiError(409, "Somente atendimentos em execucao podem mudar de status operacional.");
    }

    if (!canTransitionOperationalStatus(existing.status, payload.status)) {
      throw new ApiError(409, `Transicao invalida de ${existing.status} para ${payload.status}.`);
    }

    const updated = await atendimentoRepository.updateFields(trx, id, {
      status: payload.status,
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "STATUS_ALTERADO",
      statusAnterior: existing.status,
      statusNovo: payload.status,
      observacao: "Status operacional alterado.",
    });

    return updated;
  });

  emitSocketEvent("atendimento:status_alterado", { atendimentoId: atendimento.id, status: atendimento.status });
  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function retornarParaFila(id, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);

    if (!existing.mecanico_id || !activeServiceStatuses.has(existing.status)) {
      throw new ApiError(409, "Somente atendimentos ativos com mecanico podem retornar para a fila.");
    }

    const updated = await atendimentoRepository.updateFields(trx, id, {
      mecanico_id: null,
      status: "AGUARDANDO",
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "RETORNADO_PARA_FILA",
      statusAnterior: existing.status,
      statusNovo: "AGUARDANDO",
      observacao: "Atendimento retornou para a fila.",
    });

    return updated;
  });

  emitSocketEvent("atendimento:retornado_fila", { atendimentoId: atendimento.id });
  emitSocketEvent("fila:atualizada", {});
  emitSocketEvent("mecanico:atualizado", {});

  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function concluirServico(id, payload, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);

    if (!activeServiceStatuses.has(existing.status)) {
      throw new ApiError(409, "Somente atendimentos em execucao podem ser concluidos.");
    }

    const statusFinal = existing.situacao_pagamento === "PAGO" ? "PODE_RETIRAR" : "SERVICO_CONCLUIDO";

    const updated = await atendimentoRepository.updateFields(trx, id, {
      status: statusFinal,
      servico_executado: payload.servicoExecutado,
      servico_concluido_em: db.fn.now(),
      liberado_retirada_em: statusFinal === "PODE_RETIRAR" ? db.fn.now() : existing.liberado_retirada_em,
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "SERVICO_CONCLUIDO",
      statusAnterior: existing.status,
      statusNovo: statusFinal,
      observacao: payload.servicoExecutado,
    });

    if (statusFinal === "PODE_RETIRAR") {
      await registrarHistorico(trx, {
        atendimentoId: id,
        usuarioId: currentUser.id,
        mecanicoId: existing.mecanico_id,
        acao: "LIBERADO_PARA_RETIRADA",
        statusAnterior: "SERVICO_CONCLUIDO",
        statusNovo: "PODE_RETIRAR",
        observacao: "Motocicleta liberada automaticamente para retirada porque o pagamento ja estava confirmado.",
      });
    }

    return updated;
  });

  emitSocketEvent("atendimento:servico_concluido", { atendimentoId: atendimento.id });
  if (atendimento.status === "PODE_RETIRAR") {
    emitSocketEvent("atendimento:liberado_retirada", { atendimentoId: atendimento.id });
  }
  emitSocketEvent("mecanico:atualizado", {});

  const canLiberarRetirada = atendimento.situacao_pagamento === "PAGO";

  return {
    atendimento: mapAtendimentoByPerfil(atendimento, currentUser.perfil),
    canLiberarRetirada,
    alerta: canLiberarRetirada
      ? "Servico concluido e pagamento confirmado. Deseja liberar a motocicleta para retirada?"
      : "PAGAMENTO PENDENTE\n\nEste servico ainda nao consta como pago.\n\nOriente o proprietario a procurar a recepcao antes da retirada da motocicleta.",
  };
}

async function confirmarPagamento(id, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);

    if (existing.situacao_pagamento === "PAGO") {
      return existing;
    }

    const updated = await atendimentoRepository.updateFields(trx, id, {
      situacao_pagamento: "PAGO",
      pagamento_confirmado_em: db.fn.now(),
      pagamento_confirmado_por: currentUser.id,
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "PAGAMENTO_CONFIRMADO",
      statusAnterior: existing.status,
      statusNovo: existing.status,
      observacao: "Pagamento confirmado na recepcao.",
    });

    return updated;
  });

  emitSocketEvent("atendimento:pagamento_confirmado", { atendimentoId: atendimento.id });
  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function updatePagamento(id, payload, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);
    const shouldLiberarRetirada = existing.status === "SERVICO_CONCLUIDO" && payload.situacaoPagamento === "PAGO";

    const updated = await atendimentoRepository.updateFields(trx, id, {
      status: shouldLiberarRetirada ? "PODE_RETIRAR" : existing.status,
      situacao_pagamento: payload.situacaoPagamento,
      pagamento_confirmado_em: payload.situacaoPagamento === "PAGO" ? db.fn.now() : null,
      pagamento_confirmado_por: payload.situacaoPagamento === "PAGO" ? currentUser.id : null,
      liberado_retirada_em: shouldLiberarRetirada ? db.fn.now() : existing.liberado_retirada_em,
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "PAGAMENTO_CONFIRMADO",
      statusAnterior: existing.status,
      statusNovo: shouldLiberarRetirada ? "PODE_RETIRAR" : existing.status,
      observacao:
        payload.situacaoPagamento === "PAGO"
          ? "Pagamento marcado como pago."
          : "Pagamento marcado como pendente.",
    });

    if (shouldLiberarRetirada) {
      await registrarHistorico(trx, {
        atendimentoId: id,
        usuarioId: currentUser.id,
        mecanicoId: existing.mecanico_id,
        acao: "LIBERADO_PARA_RETIRADA",
        statusAnterior: "SERVICO_CONCLUIDO",
        statusNovo: "PODE_RETIRAR",
        observacao: "Motocicleta liberada para retirada apos confirmacao do pagamento.",
      });
    }

    return updated;
  });

  emitSocketEvent("atendimento:pagamento_confirmado", { atendimentoId: atendimento.id });
  if (atendimento.status === "PODE_RETIRAR") {
    emitSocketEvent("atendimento:liberado_retirada", { atendimentoId: atendimento.id });
  }
  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function updateAtendimentoRecepcao(id, payload, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);
    const nextSituacaoPagamento = payload.situacaoPagamento ?? existing.situacao_pagamento;
    const shouldLiberarRetirada = existing.status === "SERVICO_CONCLUIDO" && nextSituacaoPagamento === "PAGO";

    const updated = await atendimentoRepository.updateFields(trx, id, {
      problema_servico: payload.problemaServico ?? existing.problema_servico,
      observacoes: payload.observacoes ?? existing.observacoes,
      observacoes_internas: payload.observacoesInternas ?? existing.observacoes_internas,
      status: shouldLiberarRetirada ? "PODE_RETIRAR" : existing.status,
      situacao_pagamento: nextSituacaoPagamento,
      pagamento_confirmado_em:
        payload.situacaoPagamento === undefined
          ? existing.pagamento_confirmado_em
          : payload.situacaoPagamento === "PAGO"
            ? db.fn.now()
            : null,
      pagamento_confirmado_por:
        payload.situacaoPagamento === undefined
          ? existing.pagamento_confirmado_por
          : payload.situacaoPagamento === "PAGO"
            ? currentUser.id
            : null,
      liberado_retirada_em: shouldLiberarRetirada ? db.fn.now() : existing.liberado_retirada_em,
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "STATUS_ALTERADO",
      statusAnterior: existing.status,
      statusNovo: shouldLiberarRetirada ? "PODE_RETIRAR" : existing.status,
      observacao: "Dados da recepcao atualizados.",
    });

    if (shouldLiberarRetirada) {
      await registrarHistorico(trx, {
        atendimentoId: id,
        usuarioId: currentUser.id,
        mecanicoId: existing.mecanico_id,
        acao: "LIBERADO_PARA_RETIRADA",
        statusAnterior: "SERVICO_CONCLUIDO",
        statusNovo: "PODE_RETIRAR",
        observacao: "Motocicleta liberada para retirada apos ajuste da recepcao.",
      });
    }

    return updated;
  });

  emitSocketEvent("atendimento:status_alterado", { atendimentoId: atendimento.id, status: atendimento.status });
  emitSocketEvent("atendimento:pagamento_confirmado", { atendimentoId: atendimento.id });
  if (atendimento.status === "PODE_RETIRAR") {
    emitSocketEvent("atendimento:liberado_retirada", { atendimentoId: atendimento.id });
  }

  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function liberarRetirada(id, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);

    if (existing.status !== "SERVICO_CONCLUIDO") {
      throw new ApiError(409, "Somente atendimentos com servico concluido podem ser liberados.");
    }

    if (existing.situacao_pagamento !== "PAGO") {
      throw new ApiError(409, "Nao e permitido liberar retirada com pagamento pendente.");
    }

    const updated = await atendimentoRepository.updateFields(trx, id, {
      status: "PODE_RETIRAR",
      liberado_retirada_em: db.fn.now(),
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "LIBERADO_PARA_RETIRADA",
      statusAnterior: existing.status,
      statusNovo: "PODE_RETIRAR",
      observacao: "Motocicleta liberada para retirada.",
    });

    return updated;
  });

  emitSocketEvent("atendimento:liberado_retirada", { atendimentoId: atendimento.id });
  emitSocketEvent("mecanico:atualizado", {});
  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function confirmarRetirada(id, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);

    if (existing.status !== "PODE_RETIRAR") {
      throw new ApiError(409, "Somente atendimentos liberados podem ter retirada confirmada.");
    }

    const updated = await atendimentoRepository.updateFields(trx, id, {
      status: "FINALIZADO",
      retirada_confirmada_em: db.fn.now(),
      finalizado_em: db.fn.now(),
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "RETIRADA_CONFIRMADA",
      statusAnterior: existing.status,
      statusNovo: "FINALIZADO",
      observacao: "Retirada confirmada e atendimento finalizado.",
    });

    return updated;
  });

  emitSocketEvent("atendimento:retirada_confirmada", { atendimentoId: atendimento.id });
  emitSocketEvent("atendimento:finalizado", { atendimentoId: atendimento.id });
  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function cancelarAtendimento(id, payload, currentUser) {
  const atendimento = await db.transaction(async (trx) => {
    const existing = await ensureAtendimentoExists(id, trx);

    if (existing.status === "FINALIZADO" || existing.status === "CANCELADO") {
      throw new ApiError(409, "Nao e possivel cancelar um atendimento finalizado ou ja cancelado.");
    }

    const updated = await atendimentoRepository.updateFields(trx, id, {
      status: "CANCELADO",
      cancelado_em: db.fn.now(),
    });

    await registrarHistorico(trx, {
      atendimentoId: id,
      usuarioId: currentUser.id,
      mecanicoId: existing.mecanico_id,
      acao: "CANCELADO",
      statusAnterior: existing.status,
      statusNovo: "CANCELADO",
      observacao: payload.motivo,
    });

    return updated;
  });

  emitSocketEvent("atendimento:cancelado", { atendimentoId: atendimento.id });
  emitSocketEvent("fila:atualizada", {});
  emitSocketEvent("mecanico:atualizado", {});
  return mapAtendimentoByPerfil(atendimento, currentUser.perfil);
}

async function getHistorico(id) {
  await ensureAtendimentoExists(id);
  return historicoRepository.listByAtendimentoId(id);
}

module.exports = {
  listAtendimentos,
  listFila,
  getAtendimentoById,
  createAtendimento,
  assumirAtendimento,
  alterarStatus,
  retornarParaFila,
  concluirServico,
  confirmarPagamento,
  updatePagamento,
  updateAtendimentoRecepcao,
  liberarRetirada,
  confirmarRetirada,
  cancelarAtendimento,
  getHistorico,
};
