const db = require("../../database/connection");

async function findById(id, trx = db) {
  return trx("orcamentos")
    .leftJoin("usuarios", "usuarios.id", "orcamentos.orcamentista_usuario_id")
    .select(
      "orcamentos.*",
      "usuarios.nome as orcamentista_nome",
    )
    .where("orcamentos.id", id)
    .first();
}

async function listByOrdemServicoId(ordemServicoId, trx = db) {
  return trx("orcamentos")
    .leftJoin("usuarios", "usuarios.id", "orcamentos.orcamentista_usuario_id")
    .select(
      "orcamentos.*",
      "usuarios.nome as orcamentista_nome",
    )
    .where("orcamentos.ordem_servico_id", ordemServicoId)
    .orderBy("orcamentos.versao_numero", "desc")
    .orderBy("orcamentos.id", "desc");
}

async function getNextVersionNumber(ordemServicoId, trx = db) {
  const row = await trx("orcamentos")
    .where({ ordem_servico_id: ordemServicoId })
    .max({ max_versao: "versao_numero" })
    .first();

  return Number(row?.max_versao || 0) + 1;
}

async function insert(trx, payload) {
  const [id] = await trx("orcamentos").insert({
    ordem_servico_id: payload.ordemServicoId,
    versao_numero: payload.versaoNumero,
    numero_externo: payload.numeroExterno,
    orcamentista_usuario_id: payload.orcamentistaUsuarioId,
    status_orcamento: payload.statusOrcamento,
    observacoes: payload.observacoes || null,
    valor_total: payload.valorTotal,
    pdf_url: payload.pdfUrl || null,
    enviado_cliente_em: payload.enviadoClienteEm || null,
    arquivado_em: payload.arquivadoEm || null,
    criado_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });

  return findById(id, trx);
}

async function updateFields(trx, id, fields) {
  await trx("orcamentos")
    .where({ id })
    .update({
      ...fields,
      atualizado_em: db.fn.now(),
    });

  return findById(id, trx);
}

async function replaceItens(trx, orcamentoId, items) {
  await trx("orcamento_itens").where({ orcamento_id: orcamentoId }).del();

  if (!items.length) {
    return [];
  }

  await trx("orcamento_itens").insert(
    items.map((item, index) => ({
      orcamento_id: orcamentoId,
      item_ordem_servico_id: item.itemOrdemServicoId || null,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_peca: item.valorPeca,
      valor_mao_obra: item.valorMaoObra,
      valor_total: item.valorTotal,
      observacao: item.observacao || null,
      origem: item.origem || null,
      autorizacao_status: item.autorizacaoStatus,
      ordem_exibicao: index,
      criado_em: db.fn.now(),
      atualizado_em: db.fn.now(),
    })),
  );

  return trx("orcamento_itens")
    .where({ orcamento_id: orcamentoId })
    .orderBy("ordem_exibicao", "asc")
    .orderBy("id", "asc");
}

module.exports = {
  findById,
  listByOrdemServicoId,
  getNextVersionNumber,
  insert,
  updateFields,
  replaceItens,
};
