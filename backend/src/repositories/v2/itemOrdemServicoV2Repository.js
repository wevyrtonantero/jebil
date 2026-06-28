const db = require("../../database/connection");

async function listByOrdemServicoId(ordemServicoId, trx = db) {
  return trx("itens_ordem_servico")
    .leftJoin("usuarios", "usuarios.id", "itens_ordem_servico.criado_por")
    .select(
      "itens_ordem_servico.*",
      "usuarios.nome as criado_por_nome",
    )
    .where("itens_ordem_servico.ordem_servico_id", ordemServicoId)
    .orderBy("itens_ordem_servico.id", "asc");
}

async function findById(id, trx = db) {
  return trx("itens_ordem_servico")
    .leftJoin("usuarios", "usuarios.id", "itens_ordem_servico.criado_por")
    .select(
      "itens_ordem_servico.*",
      "usuarios.nome as criado_por_nome",
    )
    .where("itens_ordem_servico.id", id)
    .first();
}

async function insertMany(trx, items) {
  if (!items.length) {
    return [];
  }

  await trx("itens_ordem_servico").insert(
    items.map((item) => ({
      ordem_servico_id: item.ordemServicoId,
      item_pai_id: item.itemPaiId || null,
      retorno_garantia_de_item_id: item.retornoGarantiaDeItemId || null,
      descricao: item.descricao,
      categoria: item.categoria || null,
      tipo: item.tipo || null,
      origem: item.origem,
      execucao_direta: item.execucaoDireta,
      exige_diagnostico: item.exigeDiagnostico,
      autorizacao_status: item.autorizacaoStatus,
      pagamento_status: item.pagamentoStatus,
      status_item: item.statusItem,
      prioridade: item.prioridade,
      quantidade: item.quantidade,
      valor_unitario: item.valorUnitario,
      valor_total: item.valorTotal,
      data_prometida: item.dataPrometida || null,
      previsao_peca_atual: item.previsaoPecaAtual || null,
      observacoes: item.observacoes || null,
      criado_por: item.criadoPor,
      garantia_aplicavel: item.garantiaAplicavel,
      criado_em: db.fn.now(),
      atualizado_em: db.fn.now(),
    })),
  );

  return listByOrdemServicoId(items[0].ordemServicoId, trx);
}

async function updateFields(trx, id, fields) {
  await trx("itens_ordem_servico")
    .where({ id })
    .update({
      ...fields,
      atualizado_em: db.fn.now(),
    });

  return findById(id, trx);
}

module.exports = {
  listByOrdemServicoId,
  findById,
  insertMany,
  updateFields,
};
