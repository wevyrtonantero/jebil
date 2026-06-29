exports.up = async function up(knex) {
  const finishedQuickOrders = await knex("ordens_servico")
    .whereNotNull("legado_atendimento_id")
    .whereIn("status_geral", ["PRONTA_PARA_RETIRADA", "PARCIALMENTE_CONCLUIDA"])
    .whereNotExists(function onlyOpenItems() {
      this.select(1)
        .from("itens_ordem_servico")
        .whereRaw("itens_ordem_servico.ordem_servico_id = ordens_servico.id")
        .whereNotIn("itens_ordem_servico.status_item", ["CONCLUIDO", "CANCELADO"]);
    })
    .select("id", "legado_atendimento_id");

  if (!finishedQuickOrders.length) {
    return;
  }

  const orderIds = finishedQuickOrders.map((order) => order.id);
  const atendimentoIds = finishedQuickOrders.map((order) => order.legado_atendimento_id).filter(Boolean);

  await knex("ordens_servico")
    .whereIn("id", orderIds)
    .update({
      status_geral: "ARQUIVADA",
      arquivada_em: knex.fn.now(),
      atualizado_em: knex.fn.now(),
    });

  if (atendimentoIds.length) {
    await knex("atendimentos")
      .whereIn("id", atendimentoIds)
      .whereNotIn("status", ["FINALIZADO", "CANCELADO"])
      .update({
        status: "FINALIZADO",
        servico_concluido_em: knex.fn.now(),
        liberado_retirada_em: knex.fn.now(),
        retirada_confirmada_em: knex.fn.now(),
        finalizado_em: knex.fn.now(),
        atualizado_em: knex.fn.now(),
      });
  }
};

exports.down = async function down() {
  // Data correction only. We intentionally do not reopen finished services.
};
