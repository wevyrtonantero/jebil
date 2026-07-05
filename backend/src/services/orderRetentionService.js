const fs = require("fs");
const path = require("path");
const db = require("../database/connection");
const { uploadDir } = require("../config/env");

const CLOSED_ORDER_STATUSES = Object.freeze(["FINALIZADA", "ARQUIVADA", "CANCELADA"]);
const MANAGED_UPLOAD_PREFIXES = Object.freeze([
  "/uploads/fotos-entrada/",
  "/uploads/orcamentos-pdf/",
  "/uploads/assinaturas-pdf/",
]);
let cleanupRunning = false;

function toPositiveNumber(value, fallback) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function parseBooleanFlag(value, fallback = true) {
  if (value == null || value === "") {
    return fallback;
  }

  return !["false", "0", "nao", "off"].includes(String(value).trim().toLowerCase());
}

function buildRetentionCutoffDate(months) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

function normalizeManagedUploadPath(fileUrl) {
  const normalizedUrl = String(fileUrl || "").trim();

  if (!MANAGED_UPLOAD_PREFIXES.some((prefix) => normalizedUrl.startsWith(prefix))) {
    return null;
  }

  const resolvedPath = path.resolve(process.cwd(), `.${normalizedUrl}`);
  const uploadsRoot = path.resolve(process.cwd(), uploadDir);

  if (!resolvedPath.startsWith(uploadsRoot)) {
    return null;
  }

  return resolvedPath;
}

function removeManagedFile(fileUrl) {
  try {
    const filePath = normalizeManagedUploadPath(fileUrl);

    if (!filePath || !fs.existsSync(filePath)) {
      return false;
    }

    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listExpiredClosedOrders(limit, trx = db) {
  const retentionMonths = toPositiveNumber(process.env.ORDER_RETENTION_MONTHS, 5);
  const cutoff = buildRetentionCutoffDate(retentionMonths);

  return trx("ordens_servico")
    .select("id", "numero_os", "status_geral", "finalizada_em", "arquivada_em", "cancelada_em")
    .whereIn("status_geral", CLOSED_ORDER_STATUSES)
    .andWhere(function applyCutoff() {
      this.where(function finalizedOrders() {
        this.where("status_geral", "FINALIZADA").whereNotNull("finalizada_em").where("finalizada_em", "<=", cutoff);
      })
        .orWhere(function archivedOrders() {
          this.where("status_geral", "ARQUIVADA").whereNotNull("arquivada_em").where("arquivada_em", "<=", cutoff);
        })
        .orWhere(function cancelledOrders() {
          this.where("status_geral", "CANCELADA").whereNotNull("cancelada_em").where("cancelada_em", "<=", cutoff);
        });
    })
    .orderBy("id", "asc")
    .limit(limit);
}

async function collectOrderAssetUrls(trx, ordemIds) {
  const [fotos, orcamentos, assinaturas] = await Promise.all([
    trx("fotos_entrada").select("arquivo_url").whereIn("ordem_servico_id", ordemIds),
    trx("orcamentos").select("pdf_url").whereIn("ordem_servico_id", ordemIds),
    trx("assinaturas_recebimento").select("pdf_url").whereIn("ordem_servico_id", ordemIds),
  ]);

  return [
    ...fotos.map((item) => item.arquivo_url),
    ...orcamentos.map((item) => item.pdf_url),
    ...assinaturas.map((item) => item.pdf_url),
  ].filter(Boolean);
}

async function deleteClosedOrdersBatch(ordens = []) {
  if (!ordens.length) {
    return { deletedOrders: 0, deletedFiles: 0 };
  }

  const ordemIds = ordens.map((ordem) => Number(ordem.id));
  const assetUrls = await db.transaction(async (trx) => {
    const itemRows = await trx("itens_ordem_servico").select("id").whereIn("ordem_servico_id", ordemIds);
    const itemIds = itemRows.map((item) => Number(item.id));

    const diagnosticoRows = await trx("diagnosticos").select("id").whereIn("ordem_servico_id", ordemIds);
    const diagnosticoIds = diagnosticoRows.map((item) => Number(item.id));

    const orcamentoRows = await trx("orcamentos").select("id").whereIn("ordem_servico_id", ordemIds);
    const orcamentoIds = orcamentoRows.map((item) => Number(item.id));

    const execucaoRows = itemIds.length ? await trx("execucoes").select("id").whereIn("item_ordem_servico_id", itemIds) : [];
    const execucaoIds = execucaoRows.map((item) => Number(item.id));

    const assetUrlsWithinBatch = await collectOrderAssetUrls(trx, ordemIds);

    if (itemIds.length) {
      await trx("itens_ordem_servico")
        .whereIn("id", itemIds)
        .update({
          item_pai_id: null,
          retorno_garantia_de_item_id: null,
          atualizado_em: db.fn.now(),
        });

      await trx("previsoes_pecas")
        .whereIn("item_ordem_servico_id", itemIds)
        .update({
          substitui_previsao_id: null,
        });
    }

    if (execucaoIds.length) {
      await trx("execucao_mecanicos").whereIn("execucao_id", execucaoIds).del();
    }

    if (diagnosticoIds.length) {
      await trx("comunicacoes_whatsapp").whereIn("diagnostico_id", diagnosticoIds).del();
      await trx("diagnostico_itens").whereIn("diagnostico_id", diagnosticoIds).del();
    }

    if (orcamentoIds.length) {
      await trx("comunicacoes_whatsapp").whereIn("orcamento_id", orcamentoIds).del();
      await trx("orcamento_itens").whereIn("orcamento_id", orcamentoIds).del();
    }

    await trx("comunicacoes_whatsapp").whereIn("ordem_servico_id", ordemIds).del();

    if (itemIds.length) {
      await trx("autorizacoes").whereIn("item_ordem_servico_id", itemIds).del();
      await trx("pagamentos_itens").whereIn("item_ordem_servico_id", itemIds).del();
      await trx("garantias").whereIn("item_ordem_servico_id", itemIds).del();
      await trx("historico_item_ordem_servico").whereIn("item_ordem_servico_id", itemIds).del();
      await trx("prioridades").whereIn("item_ordem_servico_id", itemIds).del();
      await trx("previsoes_pecas").whereIn("item_ordem_servico_id", itemIds).del();
      await trx("execucoes").whereIn("item_ordem_servico_id", itemIds).del();
    }

    if (diagnosticoIds.length) {
      await trx("diagnosticos").whereIn("id", diagnosticoIds).del();
    }

    if (orcamentoIds.length) {
      await trx("orcamentos").whereIn("id", orcamentoIds).del();
    }

    await trx("assinaturas_recebimento").whereIn("ordem_servico_id", ordemIds).del();
    await trx("fotos_entrada").whereIn("ordem_servico_id", ordemIds).del();
    await trx("historico_ordem_servico").whereIn("ordem_servico_id", ordemIds).del();
    await trx("prioridades").whereIn("ordem_servico_id", ordemIds).del();

    if (itemIds.length) {
      await trx("itens_ordem_servico").whereIn("id", itemIds).del();
    }

    await trx("ordens_servico").whereIn("id", ordemIds).del();

    return assetUrlsWithinBatch;
  });

  let deletedFiles = 0;
  for (const assetUrl of assetUrls) {
    if (removeManagedFile(assetUrl)) {
      deletedFiles += 1;
    }
  }

  return {
    deletedOrders: ordens.length,
    deletedFiles,
  };
}

async function runOrderRetentionCleanup() {
  const batchSize = toPositiveNumber(process.env.ORDER_RETENTION_BATCH_SIZE, 25);
  let totalDeletedOrders = 0;
  let totalDeletedFiles = 0;

  while (true) {
    const expiredOrders = await listExpiredClosedOrders(batchSize);

    if (!expiredOrders.length) {
      break;
    }

    const result = await deleteClosedOrdersBatch(expiredOrders);
    totalDeletedOrders += result.deletedOrders;
    totalDeletedFiles += result.deletedFiles;
  }

  return {
    deletedOrders: totalDeletedOrders,
    deletedFiles: totalDeletedFiles,
  };
}

function startOrderRetentionScheduler() {
  const cleanupEnabled = parseBooleanFlag(process.env.ORDER_RETENTION_ENABLED, true);

  if (!cleanupEnabled) {
    console.log("[retencao-os] limpeza automatica desativada.");
    return null;
  }

  const intervalHours = toPositiveNumber(process.env.ORDER_RETENTION_INTERVAL_HOURS, 24);
  const intervalMs = intervalHours * 60 * 60 * 1000;

  const executeCleanup = async () => {
    if (cleanupRunning) {
      return;
    }

    cleanupRunning = true;

    try {
      const result = await runOrderRetentionCleanup();

      if (result.deletedOrders || result.deletedFiles) {
        console.log(
          `[retencao-os] limpeza concluida: ${result.deletedOrders} OS removidas, ${result.deletedFiles} arquivos apagados.`,
        );
      }
    } catch (error) {
      console.error("[retencao-os] erro ao limpar ordens antigas:", error);
    } finally {
      cleanupRunning = false;
    }
  };

  setTimeout(() => {
    void executeCleanup();
  }, 15000);

  return setInterval(() => {
    void executeCleanup();
  }, intervalMs);
}

module.exports = {
  buildRetentionCutoffDate,
  deleteClosedOrdersBatch,
  listExpiredClosedOrders,
  normalizeManagedUploadPath,
  removeManagedFile,
  runOrderRetentionCleanup,
  startOrderRetentionScheduler,
};
