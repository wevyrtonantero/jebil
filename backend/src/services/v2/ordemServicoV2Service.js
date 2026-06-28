const fs = require("fs");
const path = require("path");
const db = require("../../database/connection");
const { ApiError } = require("../../utils/ApiError");
const { formatOsNumber } = require("../../utils/formatOsNumber");
const { orcamentosPdfDir } = require("../../config/upload");
const clienteRepository = require("../../repositories/clienteRepository");
const motocicletaRepository = require("../../repositories/motocicletaRepository");
const ordemServicoV2Repository = require("../../repositories/v2/ordemServicoV2Repository");
const itemOrdemServicoV2Repository = require("../../repositories/v2/itemOrdemServicoV2Repository");
const diagnosticoV2Repository = require("../../repositories/v2/diagnosticoV2Repository");
const orcamentoV2Repository = require("../../repositories/v2/orcamentoV2Repository");
const mecanicoRepository = require("../../repositories/mecanicoRepository");
const atendimentoRepository = require("../../repositories/atendimentoRepository");
const { registrarHistorico } = require("../historicoService");
const { toOrdemServicoV2Dto } = require("../../utils/ordemServicoV2Dtos");
const { generateOrcamentoPdfBuffer } = require("../../utils/generateSimplePdfBuffer");
const { emitSocketEvent } = require("../../sockets");
const {
  deriveOrdemServicoStatus,
  derivePrioridadeAgregada,
  canTransitionItemStatus,
  resolveInitialItemStatus,
} = require("../../utils/ordemServicoV2Rules");

async function generateNumeroOs(trx) {
  const year = new Date().getFullYear();
  const sequence = await ordemServicoV2Repository.getSequenceRowForYear(trx, year);

  if (!sequence) {
    await ordemServicoV2Repository.insertSequenceRow(trx, year, 1);
    return formatOsNumber(year, 1);
  }

  const nextNumber = Number(sequence.ultimo_numero) + 1;
  await ordemServicoV2Repository.updateSequenceRow(trx, year, nextNumber);
  return formatOsNumber(year, nextNumber);
}

async function ensureClienteEMotocicleta(payload) {
  const cliente = await clienteRepository.findById(payload.clienteId);

  if (!cliente) {
    throw new ApiError(404, "Cliente nao encontrado para a ordem de servico V2.");
  }

  const motocicleta = await motocicletaRepository.findById(payload.motocicletaId);

  if (!motocicleta) {
    throw new ApiError(404, "Motocicleta nao encontrada para a ordem de servico V2.");
  }

  if (Number(motocicleta.cliente_id) !== payload.clienteId) {
    throw new ApiError(400, "A motocicleta informada nao pertence ao cliente selecionado.");
  }

  return { cliente, motocicleta };
}

async function ensureNoActiveOrderForMotocicleta(motocicletaId, trx = db) {
  const activeOrder = await ordemServicoV2Repository.findActiveByMotocicletaId(motocicletaId, trx);

  if (!activeOrder) {
    return null;
  }

  throw new ApiError(
    409,
    `Esta moto ja possui uma ordem ativa (${activeOrder.numero_os}). Altere ou adicione servico na ordem existente.`,
    {
      existingOrderId: activeOrder.id,
      existingOrderNumber: activeOrder.numero_os,
      existingOrderStatus: activeOrder.status_geral,
    },
  );
}

function normalizeItems(items, currentUser) {
  return items.map((item) => {
    const autorizacaoStatus = item.autorizacaoStatus || "AGUARDANDO_RESPOSTA";
    const pagamentoStatus = item.pagamentoStatus || "PENDENTE";
    const normalized = {
      descricao: String(item.descricao || "").trim(),
      categoria: item.categoria ? String(item.categoria).trim() : null,
      tipo: item.tipo ? String(item.tipo).trim() : null,
      origem: item.origem || "SOLICITADO_CLIENTE",
      execucaoDireta: Boolean(item.execucaoDireta),
      exigeDiagnostico: Boolean(item.exigeDiagnostico),
      autorizacaoStatus,
      pagamentoStatus,
      prioridade: item.prioridade || "NORMAL",
      dataPrometida: item.dataPrometida || null,
      previsaoPecaAtual: item.previsaoPecaAtual || null,
      observacoes: item.observacoes ? String(item.observacoes).trim() : null,
      garantiaAplicavel: Boolean(item.garantiaAplicavel),
      criadoPor: currentUser.id,
    };

    return {
      ...normalized,
      statusItem: resolveInitialItemStatus(normalized),
    };
  });
}

function buildAutomaticDiagnosticItem(currentUser) {
  const normalized = {
    descricao: "Diagnostico inicial",
    categoria: null,
    tipo: null,
    origem: "SOLICITADO_CLIENTE",
    execucaoDireta: false,
    exigeDiagnostico: true,
    autorizacaoStatus: "NAO_SE_APLICA",
    pagamentoStatus: "PENDENTE",
    prioridade: "NORMAL",
    dataPrometida: null,
    previsaoPecaAtual: null,
    observacoes: "Item criado automaticamente a partir da queixa informada na recepcao.",
    garantiaAplicavel: false,
    criadoPor: currentUser.id,
  };

  return {
    ...normalized,
    statusItem: resolveInitialItemStatus(normalized),
  };
}

function buildLegacyProblemaServico(items = []) {
  return items
    .map((item) => String(item.descricao || "").trim())
    .filter(Boolean)
    .join(" | ");
}

function deriveLegacySituacaoPagamento(items = []) {
  if (!items.length) {
    return "PENDENTE";
  }

  return items.every((item) => item.pagamentoStatus === "PAGO") ? "PAGO" : "PENDENTE";
}

async function createLegacyQueueEntryForQuickService(trx, payload, currentUser, numeroOs) {
  const problemaServico = buildLegacyProblemaServico(payload.items);

  const atendimento = await atendimentoRepository.insert(trx, {
    numeroOs,
    clienteId: payload.clienteId,
    motocicletaId: payload.motocicletaId,
    problemaServico,
    observacoes: payload.observacoesEntrada || null,
    observacoesInternas: payload.observacoesInternas || null,
    situacaoPagamento: deriveLegacySituacaoPagamento(payload.items),
    status: "AGUARDANDO",
    entradaEm: new Date(),
    criadoPor: currentUser.id,
  });

  await registrarHistorico(trx, {
    atendimentoId: atendimento.id,
    usuarioId: currentUser.id,
    acao: "CRIADO",
    statusNovo: "AGUARDANDO",
    observacao: "Atendimento rapido criado automaticamente a partir da OS V2.",
  });

  await registrarHistorico(trx, {
    atendimentoId: atendimento.id,
    usuarioId: currentUser.id,
    acao: "ENVIADO_PARA_FILA",
    statusNovo: "AGUARDANDO",
    observacao: "Atendimento rapido enviado automaticamente para a fila da oficina.",
  });

  return atendimento;
}

async function createOrdemServicoDraft(payload, currentUser) {
  const queixaPrincipal = String(payload.queixaPrincipal || "").trim();

  await ensureClienteEMotocicleta(payload);
  await ensureNoActiveOrderForMotocicleta(payload.motocicletaId);
  const normalizedItems = payload.items.length
    ? normalizeItems(payload.items, currentUser)
    : [buildAutomaticDiagnosticItem(currentUser)];

  if (normalizedItems.some((item) => !item.descricao)) {
    throw new ApiError(400, "Todos os itens da ordem de servico V2 precisam de descricao.");
  }

  const prioridadeAgregada = derivePrioridadeAgregada(normalizedItems, payload.prioridadeAgregada || "NORMAL");
  const statusGeral = deriveOrdemServicoStatus(normalizedItems);

  return db.transaction(async (trx) => {
    const numeroOs = await generateNumeroOs(trx);
    const legacyQueueEntry = payload.atendimentoRapido
      ? await createLegacyQueueEntryForQuickService(trx, payload, currentUser, numeroOs)
      : null;
    const ordemServico = await ordemServicoV2Repository.insert(trx, {
      numeroOs,
      clienteId: payload.clienteId,
      motocicletaId: payload.motocicletaId,
      usuarioAberturaId: currentUser.id,
      queixaPrincipal,
      observacoesEntrada: payload.observacoesEntrada || null,
      observacoesInternas: payload.observacoesInternas || null,
      dataPrometida: payload.dataPrometida || null,
      prioridadeAgregada,
      statusGeral,
      kmEntrada: payload.kmEntrada || null,
      buscarMoto: payload.buscarMoto,
      enderecoRetirada: payload.enderecoRetirada || null,
      cadastroFotosFinalizado: payload.atendimentoRapido,
      legadoAtendimentoId: legacyQueueEntry?.id || payload.legadoAtendimentoId || null,
    });

    const itensCriados = await itemOrdemServicoV2Repository.insertMany(
      trx,
      normalizedItems.map((item) => ({
        ...item,
        ordemServicoId: ordemServico.id,
      })),
    );

    await trx("historico_ordem_servico").insert({
      ordem_servico_id: ordemServico.id,
      usuario_id: currentUser.id,
      acao: "ORDEM_SERVICO_CRIADA",
      status_anterior: null,
      status_novo: statusGeral,
      observacao: "Ordem de servico V2 criada.",
      criado_em: db.fn.now(),
    });

    if (itensCriados.length) {
      await trx("historico_item_ordem_servico").insert(
        itensCriados.map((item) => ({
          item_ordem_servico_id: item.id,
          usuario_id: currentUser.id,
          acao: "ITEM_CRIADO",
          status_item_anterior: null,
          status_item_novo: item.status_item,
          autorizacao_anterior: null,
          autorizacao_nova: item.autorizacao_status,
          pagamento_anterior: null,
          pagamento_novo: item.pagamento_status,
          observacao: "Item inicial da ordem de servico V2.",
          criado_em: db.fn.now(),
        })),
      );
    }

    const ordemAtualizada = await ordemServicoV2Repository.findById(ordemServico.id, trx);
    const itensAtualizados = await itemOrdemServicoV2Repository.listByOrdemServicoId(ordemServico.id, trx);

    const response = toOrdemServicoV2Dto(ordemAtualizada, itensAtualizados);

    if (legacyQueueEntry) {
      emitSocketEvent("atendimento:criado", { atendimentoId: legacyQueueEntry.id });
      emitSocketEvent("fila:atualizada", {});
    }

    emitV2Updated(ordemServico.id, { tipo: "ordem_servico_criada" });

    return response;
  });
}

async function appendHistoricoOrdemServico(trx, payload) {
  await trx("historico_ordem_servico").insert({
    ordem_servico_id: payload.ordemServicoId,
    usuario_id: payload.usuarioId || null,
    acao: payload.acao,
    status_anterior: payload.statusAnterior || null,
    status_novo: payload.statusNovo || null,
    observacao: payload.observacao || null,
    criado_em: db.fn.now(),
  });
}

async function appendHistoricoItem(trx, payload) {
  await trx("historico_item_ordem_servico").insert({
    item_ordem_servico_id: payload.itemOrdemServicoId,
    usuario_id: payload.usuarioId || null,
    acao: payload.acao,
    status_item_anterior: payload.statusItemAnterior || null,
    status_item_novo: payload.statusItemNovo || null,
    autorizacao_anterior: payload.autorizacaoAnterior || null,
    autorizacao_nova: payload.autorizacaoNova || null,
    pagamento_anterior: payload.pagamentoAnterior || null,
    pagamento_novo: payload.pagamentoNovo || null,
    observacao: payload.observacao || null,
    criado_em: db.fn.now(),
  });
}

function emitV2Updated(ordemServicoId, payload = {}) {
  emitSocketEvent("ordem-servico-v2:atualizada", {
    ordemServicoId,
    ...payload,
  });
}

async function loadOrdemServicoBundle(ordemServicoId, trx = db) {
  const ordemServico = await ordemServicoV2Repository.findById(ordemServicoId, trx);

  if (!ordemServico) {
    throw new ApiError(404, "Ordem de servico V2 nao encontrada.");
  }

  const [items, diagnosticos, historicoOrdem, historicoItens, fotosEntrada, comunicacoes, garantias, previsoesPecas, execucoes] = await Promise.all([
    itemOrdemServicoV2Repository.listByOrdemServicoId(ordemServicoId, trx),
    diagnosticoV2Repository.listByOrdemServicoId(ordemServicoId, trx),
    trx("historico_ordem_servico")
      .leftJoin("usuarios", "usuarios.id", "historico_ordem_servico.usuario_id")
      .select(
        "historico_ordem_servico.*",
        "usuarios.nome as usuario_nome",
      )
      .where("historico_ordem_servico.ordem_servico_id", ordemServicoId)
      .orderBy("historico_ordem_servico.criado_em", "asc")
      .orderBy("historico_ordem_servico.id", "asc"),
    trx("historico_item_ordem_servico")
      .leftJoin("usuarios", "usuarios.id", "historico_item_ordem_servico.usuario_id")
      .select(
        "historico_item_ordem_servico.*",
        "usuarios.nome as usuario_nome",
      )
      .whereIn(
        "historico_item_ordem_servico.item_ordem_servico_id",
        trx("itens_ordem_servico").select("id").where("ordem_servico_id", ordemServicoId),
      )
      .orderBy("historico_item_ordem_servico.criado_em", "asc")
      .orderBy("historico_item_ordem_servico.id", "asc"),
    trx("fotos_entrada")
      .where({ ordem_servico_id: ordemServicoId })
      .orderBy("ordem_exibicao", "asc")
      .orderBy("id", "asc"),
    trx("comunicacoes_whatsapp")
      .where({ ordem_servico_id: ordemServicoId })
      .orderBy("criado_em", "asc")
      .orderBy("id", "asc"),
    trx("garantias")
      .whereIn(
        "item_ordem_servico_id",
        trx("itens_ordem_servico").select("id").where("ordem_servico_id", ordemServicoId),
      )
      .orderBy("criado_em", "asc")
      .orderBy("id", "asc"),
    trx("previsoes_pecas")
      .whereIn(
        "item_ordem_servico_id",
        trx("itens_ordem_servico").select("id").where("ordem_servico_id", ordemServicoId),
      )
      .orderBy("informado_em", "desc")
      .orderBy("id", "desc"),
    trx("execucoes")
      .leftJoin("mecanicos", "mecanicos.id", "execucoes.mecanico_principal_id")
      .select(
        "execucoes.*",
        "mecanicos.nome as mecanico_principal_nome",
      )
      .whereIn(
        "execucoes.item_ordem_servico_id",
        trx("itens_ordem_servico").select("id").where("ordem_servico_id", ordemServicoId),
      )
      .orderBy("execucoes.id", "asc"),
  ]);
  const orcamentos = await orcamentoV2Repository.listByOrdemServicoId(ordemServicoId, trx);
  const execucaoIds = execucoes.map((execucao) => execucao.id);
  const execucaoMecanicos = execucaoIds.length
    ? await trx("execucao_mecanicos")
      .leftJoin("mecanicos", "mecanicos.id", "execucao_mecanicos.mecanico_id")
      .select(
        "execucao_mecanicos.*",
        "mecanicos.nome as mecanico_nome",
        "mecanicos.foto_url as mecanico_foto_url",
      )
      .whereIn("execucao_mecanicos.execucao_id", execucaoIds)
      .orderBy("execucao_mecanicos.id", "asc")
    : [];

  const orcamentosComItens = await Promise.all(
    orcamentos.map(async (orcamento) => ({
      ...orcamento,
      items: await trx("orcamento_itens")
        .where({ orcamento_id: orcamento.id })
        .orderBy("ordem_exibicao", "asc")
        .orderBy("id", "asc"),
    })),
  );

  return {
    ...toOrdemServicoV2Dto(ordemServico, items),
    diagnosticos,
    orcamentos: orcamentosComItens,
    historico_ordem_servico: historicoOrdem,
    historico_itens: historicoItens,
    fotos_entrada: fotosEntrada,
    comunicacoes_whatsapp: comunicacoes,
    garantias,
    previsoes_pecas: previsoesPecas,
    execucoes: execucoes.map((execucao) => ({
      ...execucao,
      mecanicos: execucaoMecanicos.filter((mecanico) => Number(mecanico.execucao_id) === Number(execucao.id)),
    })),
  };
}

async function getOrdemServicoById(id) {
  return loadOrdemServicoBundle(id);
}

async function listOrdensServico(filters = {}) {
  const ordens = await ordemServicoV2Repository.list(filters);
  return ordens.map((ordem) => toOrdemServicoV2Dto(ordem, []));
}

async function ensureItemBelongsToOrdem(ordemServicoId, itemId, trx = db) {
  const item = await itemOrdemServicoV2Repository.findById(itemId, trx);

  if (!item || Number(item.ordem_servico_id) !== ordemServicoId) {
    throw new ApiError(404, "Item da ordem de servico V2 nao encontrado.");
  }

  return item;
}

async function recalculateOrdemServicoAggregate(trx, ordemServicoId, currentUser, observacao = null) {
  const items = await itemOrdemServicoV2Repository.listByOrdemServicoId(ordemServicoId, trx);
  const ordemServicoAtual = await ordemServicoV2Repository.findById(ordemServicoId, trx);
  const novaPrioridade = derivePrioridadeAgregada(items, ordemServicoAtual.prioridade_agregada);
  const novoStatus = deriveOrdemServicoStatus(
    items.map((item) => ({ statusItem: item.status_item })),
    {
      finalizadaEm: ordemServicoAtual.finalizada_em,
      canceladaEm: ordemServicoAtual.cancelada_em,
    },
  );

  const mudouStatus = novoStatus !== ordemServicoAtual.status_geral;
  const mudouPrioridade = novaPrioridade !== ordemServicoAtual.prioridade_agregada;

  if (!mudouStatus && !mudouPrioridade) {
    return ordemServicoAtual;
  }

  const atualizada = await ordemServicoV2Repository.updateFields(trx, ordemServicoId, {
    status_geral: novoStatus,
    prioridade_agregada: novaPrioridade,
    pronta_retirada_em:
      novoStatus === "PRONTA_PARA_RETIRADA" && !ordemServicoAtual.pronta_retirada_em
        ? db.fn.now()
        : ordemServicoAtual.pronta_retirada_em,
  });

  if (mudouStatus) {
    await appendHistoricoOrdemServico(trx, {
      ordemServicoId,
      usuarioId: currentUser?.id || null,
      acao: "STATUS_GERAL_RECALCULADO",
      statusAnterior: ordemServicoAtual.status_geral,
      statusNovo: novoStatus,
      observacao: observacao || "Status geral recalculado automaticamente pela V2.",
    });
  }

  return atualizada;
}

async function updateItemStatus(ordemServicoId, itemId, nextStatus, currentUser, observacao = null) {
  const data = await db.transaction(async (trx) => {
    await ordemServicoV2Repository.findById(ordemServicoId, trx);
    const item = await ensureItemBelongsToOrdem(ordemServicoId, itemId, trx);

    if (!canTransitionItemStatus(item.status_item, nextStatus)) {
      throw new ApiError(409, `Transicao invalida de ${item.status_item} para ${nextStatus}.`);
    }

    const updateFields = {
      status_item: nextStatus,
      iniciado_em:
        nextStatus === "EM_EXECUCAO" && !item.iniciado_em ? db.fn.now() : item.iniciado_em,
      concluido_em:
        nextStatus === "CONCLUIDO" ? db.fn.now() : item.concluido_em,
      cancelado_em:
        nextStatus === "CANCELADO" ? db.fn.now() : item.cancelado_em,
    };

    await itemOrdemServicoV2Repository.updateFields(trx, itemId, updateFields);
    await appendHistoricoItem(trx, {
      itemOrdemServicoId: itemId,
      usuarioId: currentUser.id,
      acao: "STATUS_ITEM_ALTERADO",
      statusItemAnterior: item.status_item,
      statusItemNovo: nextStatus,
      autorizacaoAnterior: item.autorizacao_status,
      autorizacaoNova: item.autorizacao_status,
      pagamentoAnterior: item.pagamento_status,
      pagamentoNovo: item.pagamento_status,
      observacao,
    });

    if (nextStatus === "EM_EXECUCAO") {
      const execucao = await trx("execucoes").where({ item_ordem_servico_id: itemId }).first();

      if (execucao) {
        await trx("execucoes").where({ id: execucao.id }).update({
          status_execucao: "EM_EXECUCAO",
          iniciado_em: execucao.iniciado_em || db.fn.now(),
          atualizado_em: db.fn.now(),
        });
      }
    }

    if (nextStatus === "CONCLUIDO") {
      const execucao = await trx("execucoes").where({ item_ordem_servico_id: itemId }).first();

      if (execucao) {
        await trx("execucoes").where({ id: execucao.id }).update({
          status_execucao: "CONCLUIDA",
          finalizado_em: db.fn.now(),
          atualizado_em: db.fn.now(),
        });

        await trx("execucao_mecanicos")
          .where({ execucao_id: execucao.id, status_participacao: "ATIVA" })
          .update({
            status_participacao: "CONCLUIDA",
            finalizado_em: db.fn.now(),
          });
      }

      if (item.garantia_aplicavel) {
        const ordem = await ordemServicoV2Repository.findById(ordemServicoId, trx);
        const garantiaExistente = await trx("garantias")
          .where({ item_ordem_servico_id: itemId })
          .whereIn("status_garantia", ["ATIVA", "EXPIRADA", "ENCERRADA"])
          .first();

        if (!garantiaExistente) {
          await trx("garantias").insert({
            item_ordem_servico_id: itemId,
            motocicleta_id: ordem.motocicleta_id,
            dias_garantia: 90,
            inicio_garantia_em: db.fn.now(),
            fim_garantia_em: trx.raw("DATE_ADD(NOW(), INTERVAL 90 DAY)"),
            status_garantia: "ATIVA",
            origem_regra: "PADRAO_90_DIAS",
            editado_por_usuario_id: currentUser.id,
            observacao: "Garantia criada automaticamente na conclusao do item.",
            criado_em: db.fn.now(),
            atualizado_em: db.fn.now(),
          });
        }
      }
    }

    await recalculateOrdemServicoAggregate(trx, ordemServicoId, currentUser, "Recalculo apos alteracao de status do item.");
    return loadOrdemServicoBundle(ordemServicoId, trx);
  });
  emitV2Updated(ordemServicoId, { tipo: "status_item" });
  return data;
}

async function updateItemAutorizacao(ordemServicoId, itemId, autorizacaoStatus, currentUser, observacao = null) {
  const data = await db.transaction(async (trx) => {
    await ordemServicoV2Repository.findById(ordemServicoId, trx);
    const item = await ensureItemBelongsToOrdem(ordemServicoId, itemId, trx);

    const updates = {
      autorizacao_status: autorizacaoStatus,
      status_item:
        ["AUTORIZADO", "NAO_SE_APLICA"].includes(autorizacaoStatus) && item.status_item === "AGUARDANDO_AUTORIZACAO"
          ? "PRONTO_PARA_EXECUTAR"
          : autorizacaoStatus === "PARCIALMENTE_AUTORIZADO"
            ? "AGUARDANDO_AUTORIZACAO"
          : autorizacaoStatus === "NAO_AUTORIZADO" && item.status_item !== "CONCLUIDO"
            ? "CANCELADO"
            : item.status_item,
      cancelado_em:
        autorizacaoStatus === "NAO_AUTORIZADO" && item.status_item !== "CONCLUIDO" ? db.fn.now() : item.cancelado_em,
    };

    await itemOrdemServicoV2Repository.updateFields(trx, itemId, updates);
    await trx("autorizacoes").insert({
      item_ordem_servico_id: itemId,
      status_autorizacao: autorizacaoStatus,
      decidido_por_usuario_id: currentUser.id,
      decidido_em: db.fn.now(),
      origem_decisao: "SISTEMA_V2",
      observacao: observacao || null,
      criado_em: db.fn.now(),
    });
    await appendHistoricoItem(trx, {
      itemOrdemServicoId: itemId,
      usuarioId: currentUser.id,
      acao: "AUTORIZACAO_ALTERADA",
      statusItemAnterior: item.status_item,
      statusItemNovo: updates.status_item,
      autorizacaoAnterior: item.autorizacao_status,
      autorizacaoNova: autorizacaoStatus,
      pagamentoAnterior: item.pagamento_status,
      pagamentoNovo: item.pagamento_status,
      observacao,
    });

    await recalculateOrdemServicoAggregate(trx, ordemServicoId, currentUser, "Recalculo apos alteracao de autorizacao do item.");
    return loadOrdemServicoBundle(ordemServicoId, trx);
  });
  emitV2Updated(ordemServicoId, { tipo: "autorizacao_item" });
  return data;
}

async function registrarPrevisaoPeca(ordemServicoId, itemId, payload, currentUser) {
  const data = await db.transaction(async (trx) => {
    await ordemServicoV2Repository.findById(ordemServicoId, trx);
    const item = await ensureItemBelongsToOrdem(ordemServicoId, itemId, trx);

    await trx("previsoes_pecas")
      .where({ item_ordem_servico_id: itemId, status_previsao: "ATIVA" })
      .update({
        status_previsao: "SUPERADA",
      });

    await trx("previsoes_pecas").insert({
      item_ordem_servico_id: itemId,
      descricao_peca: payload.descricaoPeca,
      previsao_chegada: payload.previsaoChegada || null,
      informado_por_usuario_id: currentUser.id,
      informado_em: db.fn.now(),
      observacao: payload.observacao || null,
      status_previsao: "ATIVA",
      criado_em: db.fn.now(),
    });

    await itemOrdemServicoV2Repository.updateFields(trx, itemId, {
      status_item: "AGUARDANDO_PECA",
      previsao_peca_atual: payload.previsaoChegada || null,
    });

    await appendHistoricoItem(trx, {
      itemOrdemServicoId: itemId,
      usuarioId: currentUser.id,
      acao: "PREVISAO_PECA_REGISTRADA",
      statusItemAnterior: item.status_item,
      statusItemNovo: "AGUARDANDO_PECA",
      autorizacaoAnterior: item.autorizacao_status,
      autorizacaoNova: item.autorizacao_status,
      pagamentoAnterior: item.pagamento_status,
      pagamentoNovo: item.pagamento_status,
      observacao: payload.observacao || payload.descricaoPeca,
    });

    await recalculateOrdemServicoAggregate(trx, ordemServicoId, currentUser, "Recalculo apos item entrar em aguardando peca.");
    return loadOrdemServicoBundle(ordemServicoId, trx);
  });
  emitV2Updated(ordemServicoId, { tipo: "previsao_peca" });
  return data;
}

async function retomarItemDaPeca(ordemServicoId, itemId, payload, currentUser) {
  const data = await db.transaction(async (trx) => {
    await ordemServicoV2Repository.findById(ordemServicoId, trx);
    const item = await ensureItemBelongsToOrdem(ordemServicoId, itemId, trx);

    await trx("previsoes_pecas")
      .where({ item_ordem_servico_id: itemId, status_previsao: "ATIVA" })
      .update({
        status_previsao: "CONCLUIDA",
      });

    await itemOrdemServicoV2Repository.updateFields(trx, itemId, {
      status_item: payload.statusDestino,
      previsao_peca_atual: null,
      iniciado_em:
        payload.statusDestino === "EM_EXECUCAO" && !item.iniciado_em ? db.fn.now() : item.iniciado_em,
    });

    await appendHistoricoItem(trx, {
      itemOrdemServicoId: itemId,
      usuarioId: currentUser.id,
      acao: "ITEM_RETOMADO_APOS_PECA",
      statusItemAnterior: item.status_item,
      statusItemNovo: payload.statusDestino,
      autorizacaoAnterior: item.autorizacao_status,
      autorizacaoNova: item.autorizacao_status,
      pagamentoAnterior: item.pagamento_status,
      pagamentoNovo: item.pagamento_status,
      observacao: payload.observacao || "Peca recebida e item retomado.",
    });

    await recalculateOrdemServicoAggregate(trx, ordemServicoId, currentUser, "Recalculo apos retorno de aguardando peca.");
    return loadOrdemServicoBundle(ordemServicoId, trx);
  });
  emitV2Updated(ordemServicoId, { tipo: "retomada_peca" });
  return data;
}

async function atribuirExecucao(ordemServicoId, itemId, payload, currentUser) {
  const data = await db.transaction(async (trx) => {
    await ordemServicoV2Repository.findById(ordemServicoId, trx);
    const item = await ensureItemBelongsToOrdem(ordemServicoId, itemId, trx);
    const principal = await mecanicoRepository.findById(payload.mecanicoPrincipalId);

    if (!principal || !principal.ativo) {
      throw new ApiError(404, "Mecanico principal nao encontrado ou inativo.");
    }

    for (const mecanicoId of payload.mecanicosAuxiliaresIds) {
      const auxiliar = await mecanicoRepository.findById(mecanicoId);

      if (!auxiliar || !auxiliar.ativo) {
        throw new ApiError(404, `Mecanico auxiliar ${mecanicoId} nao encontrado ou inativo.`);
      }
    }

    let execucao = await trx("execucoes").where({ item_ordem_servico_id: itemId }).first();

    if (!execucao) {
      const [execucaoId] = await trx("execucoes").insert({
        item_ordem_servico_id: itemId,
        mecanico_principal_id: payload.mecanicoPrincipalId,
        status_execucao: item.status_item === "EM_EXECUCAO" ? "EM_EXECUCAO" : "ABERTA",
        descricao_execucao: payload.descricaoExecucao || null,
        iniciado_em: item.status_item === "EM_EXECUCAO" ? item.iniciado_em || db.fn.now() : null,
        criado_em: db.fn.now(),
        atualizado_em: db.fn.now(),
      });
      execucao = await trx("execucoes").where({ id: execucaoId }).first();
    } else {
      await trx("execucoes").where({ id: execucao.id }).update({
        mecanico_principal_id: payload.mecanicoPrincipalId,
        descricao_execucao: payload.descricaoExecucao ?? execucao.descricao_execucao,
        atualizado_em: db.fn.now(),
      });
    }

    await trx("execucao_mecanicos").where({ execucao_id: execucao.id }).del();
    const auxiliaresIds = payload.mecanicosAuxiliaresIds.filter((id) => id !== payload.mecanicoPrincipalId);

    await trx("execucao_mecanicos").insert([
      {
        execucao_id: execucao.id,
        mecanico_id: payload.mecanicoPrincipalId,
        papel: "PRINCIPAL",
        status_participacao: "ATIVA",
        iniciado_em: item.iniciado_em || null,
        criado_em: db.fn.now(),
      },
      ...auxiliaresIds.map((mecanicoId) => ({
        execucao_id: execucao.id,
        mecanico_id: mecanicoId,
        papel: "AUXILIAR",
        status_participacao: "ATIVA",
        iniciado_em: item.iniciado_em || null,
        criado_em: db.fn.now(),
      })),
    ]);

    await appendHistoricoItem(trx, {
      itemOrdemServicoId: itemId,
      usuarioId: currentUser.id,
      acao: "EXECUCAO_ATRIBUIDA",
      statusItemAnterior: item.status_item,
      statusItemNovo: item.status_item,
      autorizacaoAnterior: item.autorizacao_status,
      autorizacaoNova: item.autorizacao_status,
      pagamentoAnterior: item.pagamento_status,
      pagamentoNovo: item.pagamento_status,
      observacao: payload.descricaoExecucao || "Mecanicos vinculados a execucao do item.",
    });

    return loadOrdemServicoBundle(ordemServicoId, trx);
  });

  emitSocketEvent("mecanico:atualizado", { tipo: "execucao-v2" });
  emitV2Updated(ordemServicoId, { tipo: "execucao_atribuida" });
  return data;
}

async function updateItemPagamento(ordemServicoId, itemId, pagamentoStatus, currentUser, observacao = null) {
  const data = await db.transaction(async (trx) => {
    await ordemServicoV2Repository.findById(ordemServicoId, trx);
    const item = await ensureItemBelongsToOrdem(ordemServicoId, itemId, trx);

    await itemOrdemServicoV2Repository.updateFields(trx, itemId, {
      pagamento_status: pagamentoStatus,
    });
    await trx("pagamentos_itens").insert({
      item_ordem_servico_id: itemId,
      status_pagamento: pagamentoStatus,
      alterado_por_usuario_id: currentUser.id,
      alterado_em: db.fn.now(),
      observacao: observacao || null,
      criado_em: db.fn.now(),
    });
    await appendHistoricoItem(trx, {
      itemOrdemServicoId: itemId,
      usuarioId: currentUser.id,
      acao: "PAGAMENTO_ALTERADO",
      statusItemAnterior: item.status_item,
      statusItemNovo: item.status_item,
      autorizacaoAnterior: item.autorizacao_status,
      autorizacaoNova: item.autorizacao_status,
      pagamentoAnterior: item.pagamento_status,
      pagamentoNovo: pagamentoStatus,
      observacao,
    });

    await recalculateOrdemServicoAggregate(trx, ordemServicoId, currentUser, "Recalculo apos alteracao de pagamento do item.");
    return loadOrdemServicoBundle(ordemServicoId, trx);
  });
  emitV2Updated(ordemServicoId, { tipo: "pagamento_item" });
  return data;
}

async function createDiagnostico(ordemServicoId, payload, currentUser) {
  return db.transaction(async (trx) => {
    const ordem = await ordemServicoV2Repository.findById(ordemServicoId, trx);

    if (!ordem) {
      throw new ApiError(404, "Ordem de servico V2 nao encontrada.");
    }

    let itemDiagnostico = null;
    if (payload.itemDiagnosticoId) {
      itemDiagnostico = await ensureItemBelongsToOrdem(ordemServicoId, payload.itemDiagnosticoId, trx);
    }

    const diagnostico = await diagnosticoV2Repository.insert(trx, {
      ordemServicoId,
      itemDiagnosticoId: payload.itemDiagnosticoId || null,
      mecanicoPrincipalId: payload.mecanicoPrincipalId || null,
      queixaAvaliada: payload.queixaAvaliada,
      causaIdentificada: payload.causaIdentificada,
      descricaoTecnica: payload.descricaoTecnica,
      servicosSugeridosResumo: payload.servicosSugeridosResumo,
      pecasSugeridasResumo: payload.pecasSugeridasResumo,
      observacoes: payload.observacoes,
      statusDiagnostico: "EM_ANDAMENTO",
      iniciadoEm: db.fn.now(),
    });

    if (itemDiagnostico && itemDiagnostico.status_item === "AGUARDANDO_DIAGNOSTICO") {
      await itemOrdemServicoV2Repository.updateFields(trx, itemDiagnostico.id, {
        status_item: "EM_DIAGNOSTICO",
      });
      await appendHistoricoItem(trx, {
        itemOrdemServicoId: itemDiagnostico.id,
        usuarioId: currentUser.id,
        acao: "DIAGNOSTICO_INICIADO",
        statusItemAnterior: itemDiagnostico.status_item,
        statusItemNovo: "EM_DIAGNOSTICO",
        autorizacaoAnterior: itemDiagnostico.autorizacao_status,
        autorizacaoNova: itemDiagnostico.autorizacao_status,
        pagamentoAnterior: itemDiagnostico.pagamento_status,
        pagamentoNovo: itemDiagnostico.pagamento_status,
        observacao: "Item entrou em diagnostico.",
      });
    }

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId,
      usuarioId: currentUser.id,
      acao: "DIAGNOSTICO_CRIADO",
      statusAnterior: ordem.status_geral,
      statusNovo: ordem.status_geral,
      observacao: "Diagnostico V2 criado.",
    });

    await recalculateOrdemServicoAggregate(trx, ordemServicoId, currentUser, "Recalculo apos criacao de diagnostico.");
    return {
      diagnostico,
      ordemServico: await loadOrdemServicoBundle(ordemServicoId, trx),
    };
  });
}

async function concluirDiagnostico(diagnosticoId, payload, currentUser) {
  return db.transaction(async (trx) => {
    const diagnostico = await diagnosticoV2Repository.findById(diagnosticoId, trx);

    if (!diagnostico) {
      throw new ApiError(404, "Diagnostico V2 nao encontrado.");
    }

    const atualizado = await diagnosticoV2Repository.updateFields(trx, diagnosticoId, {
      causa_identificada: payload.causaIdentificada ?? diagnostico.causa_identificada,
      descricao_tecnica: payload.descricaoTecnica ?? diagnostico.descricao_tecnica,
      servicos_sugeridos_resumo: payload.servicosSugeridosResumo ?? diagnostico.servicos_sugeridos_resumo,
      pecas_sugeridas_resumo: payload.pecasSugeridasResumo ?? diagnostico.pecas_sugeridas_resumo,
      observacoes: payload.observacoes ?? diagnostico.observacoes,
      status_diagnostico: "CONCLUIDO",
      concluido_em: db.fn.now(),
      enviado_orcamentista_em: payload.enviarOrcamentista ? db.fn.now() : diagnostico.enviado_orcamentista_em,
    });

    if (diagnostico.item_diagnostico_id) {
      const item = await itemOrdemServicoV2Repository.findById(diagnostico.item_diagnostico_id, trx);
      if (item && item.status_item === "EM_DIAGNOSTICO") {
        await itemOrdemServicoV2Repository.updateFields(trx, item.id, {
          status_item: "AGUARDANDO_ORCAMENTO",
          concluido_em: item.concluido_em,
        });
        await appendHistoricoItem(trx, {
          itemOrdemServicoId: item.id,
          usuarioId: currentUser.id,
          acao: payload.enviarOrcamentista ? "DIAGNOSTICO_CONCLUIDO_ENVIADO_ORCAMENTO" : "DIAGNOSTICO_CONCLUIDO",
          statusItemAnterior: item.status_item,
          statusItemNovo: "AGUARDANDO_ORCAMENTO",
          autorizacaoAnterior: item.autorizacao_status,
          autorizacaoNova: item.autorizacao_status,
          pagamentoAnterior: item.pagamento_status,
          pagamentoNovo: item.pagamento_status,
          observacao: "Item de diagnostico concluido.",
        });
      }
    }

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId: diagnostico.ordem_servico_id,
      usuarioId: currentUser.id,
      acao: payload.enviarOrcamentista ? "DIAGNOSTICO_ENVIADO_ORCAMENTISTA" : "DIAGNOSTICO_CONCLUIDO",
      observacao: "Diagnostico V2 concluido.",
    });

    await recalculateOrdemServicoAggregate(trx, diagnostico.ordem_servico_id, currentUser, "Recalculo apos conclusao de diagnostico.");
    return {
      diagnostico: atualizado,
      ordemServico: await loadOrdemServicoBundle(diagnostico.ordem_servico_id, trx),
    };
  });
}

async function adicionarItensSugeridosDiagnostico(diagnosticoId, payload, currentUser) {
  return db.transaction(async (trx) => {
    const diagnostico = await diagnosticoV2Repository.findById(diagnosticoId, trx);

    if (!diagnostico) {
      throw new ApiError(404, "Diagnostico V2 nao encontrado.");
    }

    const items = normalizeItems(
      payload.items.map((item) => ({
        ...item,
        origem: "GERADO_DIAGNOSTICO",
      })),
      currentUser,
    );

    const criados = await itemOrdemServicoV2Repository.insertMany(
      trx,
      items.map((item) => ({
        ...item,
        ordemServicoId: diagnostico.ordem_servico_id,
      })),
    );

    const itemsNovos = criados.slice(-items.length);

    if (itemsNovos.length) {
      await trx("diagnostico_itens").insert(
        itemsNovos.map((item) => ({
          diagnostico_id: diagnosticoId,
          item_ordem_servico_id: item.id,
          tipo_vinculo: "GERADO",
          criado_em: db.fn.now(),
        })),
      );
      await trx("historico_item_ordem_servico").insert(
        itemsNovos.map((item) => ({
          item_ordem_servico_id: item.id,
          usuario_id: currentUser.id,
          acao: "ITEM_GERADO_DIAGNOSTICO",
          status_item_anterior: null,
          status_item_novo: item.status_item,
          autorizacao_anterior: null,
          autorizacao_nova: item.autorizacao_status,
          pagamento_anterior: null,
          pagamento_novo: item.pagamento_status,
          observacao: "Item sugerido a partir do diagnostico.",
          criado_em: db.fn.now(),
        })),
      );
    }

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId: diagnostico.ordem_servico_id,
      usuarioId: currentUser.id,
      acao: "ITENS_GERADOS_DIAGNOSTICO",
      observacao: `${items.length} item(ns) gerado(s) pelo diagnostico.`,
    });

    await recalculateOrdemServicoAggregate(trx, diagnostico.ordem_servico_id, currentUser, "Recalculo apos criacao de itens por diagnostico.");
    return loadOrdemServicoBundle(diagnostico.ordem_servico_id, trx);
  });
}

async function getProntuarioByMotocicletaId(motocicletaId) {
  const ordens = await ordemServicoV2Repository.listByMotocicletaId(motocicletaId);

  if (!ordens.length) {
    return {
      motocicleta_id: motocicletaId,
      ordens_servico: [],
    };
  }

  const bundles = await Promise.all(ordens.map((ordem) => loadOrdemServicoBundle(ordem.id)));

  return {
    motocicleta_id: motocicletaId,
    cliente_id: ordens[0].cliente_id,
    cliente_nome: ordens[0].cliente_nome,
    motocicleta_marca: ordens[0].motocicleta_marca,
    motocicleta_modelo: ordens[0].motocicleta_modelo,
    motocicleta_placa: ordens[0].motocicleta_placa,
    ordens_servico: bundles,
  };
}

async function listOperacional(limit = 30) {
  const ordens = await ordemServicoV2Repository.listRecent(limit);
  return Promise.all(ordens.map((ordem) => loadOrdemServicoBundle(ordem.id)));
}

async function listItemSuggestions(query = "", limit = 20) {
  const normalizedQuery = String(query || "").trim();
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 20;
  const rows = await db("itens_ordem_servico")
    .distinct("descricao")
    .modify((builder) => {
      if (normalizedQuery) {
        builder.where("descricao", "like", `%${normalizedQuery}%`);
      }
    })
    .whereNotNull("descricao")
    .whereRaw("TRIM(descricao) <> ''")
    .orderBy("descricao", "asc")
    .limit(safeLimit);

  return rows.map((row) => row.descricao);
}

async function addFotosEntrada(ordemServicoId, files, currentUser) {
  if (!Array.isArray(files) || !files.length) {
    throw new ApiError(400, "Envie ao menos uma foto de entrada.");
  }

  return db.transaction(async (trx) => {
    const ordem = await ordemServicoV2Repository.findById(ordemServicoId, trx);

    if (!ordem) {
      throw new ApiError(404, "Ordem de servico V2 nao encontrada.");
    }

    const fotosExistentes = await trx("fotos_entrada").where({ ordem_servico_id: ordemServicoId }).count({ total: "*" }).first();
    const totalAtual = Number(fotosExistentes?.total || 0);

    await trx("fotos_entrada").insert(
      files.map((file, index) => ({
        ordem_servico_id: ordemServicoId,
        cliente_id: ordem.cliente_id,
        motocicleta_id: ordem.motocicleta_id,
        usuario_responsavel_id: currentUser.id,
        arquivo_url: `/uploads/fotos-entrada/${file.filename}`,
        nome_arquivo: file.originalname || file.filename,
        mime_type: file.mimetype,
        tamanho_bytes: file.size,
        ordem_exibicao: totalAtual + index,
        hash_arquivo: null,
        criado_em: db.fn.now(),
      })),
    );

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId,
      usuarioId: currentUser.id,
      acao: "FOTOS_ENTRADA_ADICIONADAS",
      observacao: `${files.length} foto(s) inicial(is) adicionada(s).`,
    });

    return loadOrdemServicoBundle(ordemServicoId, trx);
  });
}

async function finalizarCadastroFotos(ordemServicoId, currentUser) {
  const data = await db.transaction(async (trx) => {
    const ordem = await ordemServicoV2Repository.findById(ordemServicoId, trx);

    if (!ordem) {
      throw new ApiError(404, "Ordem de servico V2 nao encontrada.");
    }

    await ordemServicoV2Repository.updateFields(trx, ordemServicoId, {
      cadastro_fotos_finalizado: true,
    });

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId,
      usuarioId: currentUser.id,
      acao: "CADASTRO_FOTOS_FINALIZADO",
      observacao: "Cadastro de fotos finalizado na recepcao.",
    });

    return loadOrdemServicoBundle(ordemServicoId, trx);
  });

  emitV2Updated(ordemServicoId, { tipo: "cadastro_fotos_finalizado" });
  return data;
}

async function registrarComunicacaoWhatsApp(ordemServicoId, payload, currentUser) {
  return db.transaction(async (trx) => {
    const ordem = await ordemServicoV2Repository.findById(ordemServicoId, trx);

    if (!ordem) {
      throw new ApiError(404, "Ordem de servico V2 nao encontrada.");
    }

    await trx("comunicacoes_whatsapp").insert({
      ordem_servico_id: ordemServicoId,
      diagnostico_id: payload.diagnosticoId || null,
      orcamento_id: payload.orcamentoId || null,
      tipo_comunicacao: payload.tipoComunicacao,
      destinatario: payload.destinatario,
      finalidade: payload.finalidade,
      usuario_responsavel_id: currentUser.id,
      mensagem_preparada: payload.mensagemPreparada || null,
      status_registro: payload.statusRegistro || "PREPARADA",
      criado_em: db.fn.now(),
    });

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId,
      usuarioId: currentUser.id,
      acao: "COMUNICACAO_WHATSAPP_REGISTRADA",
      observacao: `${payload.tipoComunicacao} para ${payload.destinatario}.`,
    });

    return loadOrdemServicoBundle(ordemServicoId, trx);
  });
}

function sumOrcamentoItems(items = []) {
  return items.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
}

function isManagedOrcamentoPdf(pdfUrl = "") {
  return String(pdfUrl || "").startsWith("/uploads/orcamentos-pdf/");
}

function buildGeneratedPdfFilename(orcamentoId) {
  return `orcamento-${orcamentoId}-${Date.now()}.pdf`;
}

async function saveGeneratedOrcamentoPdf(orcamentoId, currentUser, registerHistory = true) {
  const data = await db.transaction(async (trx) => {
    const orcamento = await orcamentoV2Repository.findById(orcamentoId, trx);

    if (!orcamento) {
      throw new ApiError(404, "Orcamento V2 nao encontrado.");
    }

    const ordemServico = await loadOrdemServicoBundle(orcamento.ordem_servico_id, trx);
    const itens = await trx("orcamento_itens").where({ orcamento_id: orcamentoId }).orderBy("ordem_exibicao", "asc");
    const filename = buildGeneratedPdfFilename(orcamento.id);
    const pdfUrl = `/uploads/orcamentos-pdf/${filename}`;
    const filePath = path.resolve(orcamentosPdfDir, filename);
    const buffer = generateOrcamentoPdfBuffer({
      ordem: ordemServico,
      orcamento,
      itens,
    });

    fs.writeFileSync(filePath, buffer);

    if (isManagedOrcamentoPdf(orcamento.pdf_url)) {
      const previousPath = path.resolve(process.cwd(), `.${orcamento.pdf_url}`);
      if (previousPath !== filePath && fs.existsSync(previousPath)) {
        fs.unlinkSync(previousPath);
      }
    }

    const atualizado = await orcamentoV2Repository.updateFields(trx, orcamentoId, {
      pdf_url: pdfUrl,
    });

    if (registerHistory) {
      await appendHistoricoOrdemServico(trx, {
        ordemServicoId: orcamento.ordem_servico_id,
        usuarioId: currentUser.id,
        acao: "ORCAMENTO_PDF_GERADO",
        observacao: `PDF gerado automaticamente para o orcamento ${orcamento.numero_externo || "#"}.`,
      });
    }

    return {
      orcamento: {
        ...atualizado,
        items: itens,
      },
      ordemServico: await loadOrdemServicoBundle(orcamento.ordem_servico_id, trx),
    };
  });

  emitV2Updated(data.ordemServico.id, { tipo: "orcamento_pdf" });
  return data;
}

async function createOrcamento(ordemServicoId, payload, currentUser) {
  const data = await db.transaction(async (trx) => {
    const ordem = await ordemServicoV2Repository.findById(ordemServicoId, trx);

    if (!ordem) {
      throw new ApiError(404, "Ordem de servico V2 nao encontrada.");
    }

    const orcamentosExistentes = await orcamentoV2Repository.listByOrdemServicoId(ordemServicoId, trx);
    const orcamentoExistente = orcamentosExistentes[0] || null;
    const valorTotal = sumOrcamentoItems(payload.items);

    if (payload.dataPrometida) {
      await ordemServicoV2Repository.updateFields(trx, ordemServicoId, {
        data_prometida: payload.dataPrometida,
      });
    }

    const orcamento = orcamentoExistente
      ? await orcamentoV2Repository.updateFields(trx, orcamentoExistente.id, {
          numero_externo: payload.numeroExterno,
          orcamentista_usuario_id: currentUser.id,
          status_orcamento: payload.statusOrcamento || "RASCUNHO",
          observacoes: payload.observacoes || null,
          valor_total: valorTotal,
        })
      : await orcamentoV2Repository.insert(trx, {
          ordemServicoId,
          versaoNumero: 1,
          numeroExterno: payload.numeroExterno,
          orcamentistaUsuarioId: currentUser.id,
          statusOrcamento: payload.statusOrcamento || "RASCUNHO",
          observacoes: payload.observacoes || null,
          valorTotal,
        });

    const items = await orcamentoV2Repository.replaceItens(
      trx,
      orcamento.id,
      payload.items.map((item) => ({
        itemOrdemServicoId: item.itemOrdemServicoId,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valorPeca: item.valorPeca,
        valorMaoObra: item.valorMaoObra,
        valorTotal: item.valorTotal,
        observacao: item.observacao,
        origem: item.origem,
        autorizacaoStatus: item.autorizacaoStatus,
      })),
    );

    for (const item of payload.items) {
      if (item.itemOrdemServicoId) {
        const existingItem = await ensureItemBelongsToOrdem(ordemServicoId, item.itemOrdemServicoId, trx);
        if (["DIAGNOSTICADO", "AGUARDANDO_ORCAMENTO"].includes(existingItem.status_item)) {
          await itemOrdemServicoV2Repository.updateFields(trx, existingItem.id, {
            status_item: "AGUARDANDO_AUTORIZACAO",
          });
          await appendHistoricoItem(trx, {
            itemOrdemServicoId: existingItem.id,
            usuarioId: currentUser.id,
            acao: "ITEM_ENVIADO_PARA_AUTORIZACAO",
            statusItemAnterior: existingItem.status_item,
            statusItemNovo: "AGUARDANDO_AUTORIZACAO",
            autorizacaoAnterior: existingItem.autorizacao_status,
            autorizacaoNova: existingItem.autorizacao_status,
            pagamentoAnterior: existingItem.pagamento_status,
            pagamentoNovo: existingItem.pagamento_status,
            observacao: "Item vinculado a orcamento V2.",
          });
        }
      }
    }

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId,
      usuarioId: currentUser.id,
      acao: orcamentoExistente ? "ORCAMENTO_ATUALIZADO" : "ORCAMENTO_CRIADO",
      observacao: orcamentoExistente ? "Orcamento V2 atualizado." : "Orcamento V2 criado.",
    });

    await recalculateOrdemServicoAggregate(trx, ordemServicoId, currentUser, "Recalculo apos criacao de orcamento.");
    return {
      orcamento: {
        ...orcamento,
        items,
      },
      ordemServico: await loadOrdemServicoBundle(ordemServicoId, trx),
    };
  });

  const pdfData = await saveGeneratedOrcamentoPdf(data.orcamento.id, currentUser, false);
  emitV2Updated(ordemServicoId, { tipo: "orcamento_salvo" });
  return pdfData;
}

async function updateOrcamentoStatus(orcamentoId, payload, currentUser) {
  return db.transaction(async (trx) => {
    const orcamento = await orcamentoV2Repository.findById(orcamentoId, trx);

    if (!orcamento) {
      throw new ApiError(404, "Orcamento V2 nao encontrado.");
    }

    const atualizado = await orcamentoV2Repository.updateFields(trx, orcamentoId, {
      status_orcamento: payload.statusOrcamento,
      observacoes: payload.observacoes ?? orcamento.observacoes,
      enviado_cliente_em:
        payload.statusOrcamento === "ENVIADO" && !orcamento.enviado_cliente_em ? db.fn.now() : orcamento.enviado_cliente_em,
      arquivado_em:
        payload.statusOrcamento === "ARQUIVADO" ? db.fn.now() : orcamento.arquivado_em,
    });

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId: orcamento.ordem_servico_id,
      usuarioId: currentUser.id,
      acao: "ORCAMENTO_STATUS_ALTERADO",
      observacao: `Orcamento #${orcamento.numero_externo} movido para ${payload.statusOrcamento}.`,
    });

    return {
      orcamento: {
        ...atualizado,
        items: await trx("orcamento_itens").where({ orcamento_id: orcamentoId }).orderBy("ordem_exibicao", "asc"),
      },
      ordemServico: await loadOrdemServicoBundle(orcamento.ordem_servico_id, trx),
    };
  });
}

async function uploadOrcamentoPdf(orcamentoId, file, currentUser) {
  if (!file) {
    throw new ApiError(400, "Arquivo PDF nao enviado.");
  }

  const data = await db.transaction(async (trx) => {
    const orcamento = await orcamentoV2Repository.findById(orcamentoId, trx);

    if (!orcamento) {
      throw new ApiError(404, "Orcamento V2 nao encontrado.");
    }

    const atualizado = await orcamentoV2Repository.updateFields(trx, orcamentoId, {
      pdf_url: `/uploads/orcamentos-pdf/${file.filename}`,
    });

    await appendHistoricoOrdemServico(trx, {
      ordemServicoId: orcamento.ordem_servico_id,
      usuarioId: currentUser.id,
      acao: "ORCAMENTO_PDF_ENVIADO",
      observacao: `PDF vinculado ao orcamento #${orcamento.numero_externo}.`,
    });

    return {
      orcamento: {
        ...atualizado,
        items: await trx("orcamento_itens").where({ orcamento_id: orcamentoId }).orderBy("ordem_exibicao", "asc"),
      },
      ordemServico: await loadOrdemServicoBundle(orcamento.ordem_servico_id, trx),
    };
  });

  emitV2Updated(data.ordemServico.id, { tipo: "orcamento_pdf" });
  return data;
}

module.exports = {
  createOrdemServicoDraft,
  getOrdemServicoById,
  listOrdensServico,
  updateItemStatus,
  updateItemAutorizacao,
  updateItemPagamento,
  createDiagnostico,
  concluirDiagnostico,
  adicionarItensSugeridosDiagnostico,
  getProntuarioByMotocicletaId,
  listOperacional,
  listItemSuggestions,
  addFotosEntrada,
  finalizarCadastroFotos,
  registrarComunicacaoWhatsApp,
  createOrcamento,
  generateOrcamentoPdf: saveGeneratedOrcamentoPdf,
  updateOrcamentoStatus,
  uploadOrcamentoPdf,
  registrarPrevisaoPeca,
  retomarItemDaPeca,
  atribuirExecucao,
};
