exports.up = async function up(knex) {
  const placeholderItems = await knex("itens_ordem_servico as item")
    .whereIn("item.status_item", ["DIAGNOSTICADO", "AGUARDANDO_ORCAMENTO", "AGUARDANDO_AUTORIZACAO"])
    .where(function whereDiagnosticPlaceholder() {
      this.whereRaw("LOWER(TRIM(item.descricao)) = 'diagnostico inicial'")
        .orWhere(function whereDiagnosticFlags() {
          this.where("item.exige_diagnostico", true).andWhere("item.execucao_direta", false);
        });
    })
    .whereExists(function whereCommercialSibling() {
      this.select(1)
        .from("itens_ordem_servico as sibling")
        .whereRaw("sibling.ordem_servico_id = item.ordem_servico_id")
        .whereRaw("sibling.id <> item.id")
        .whereNotIn("sibling.status_item", ["CANCELADO"])
        .where(function whereExecutableSibling() {
          this.whereRaw("LOWER(TRIM(sibling.descricao)) <> 'diagnostico inicial'")
            .orWhere("sibling.execucao_direta", true)
            .orWhere("sibling.exige_diagnostico", false);
        })
        .whereIn("sibling.status_item", [
          "AGUARDANDO_AUTORIZACAO",
          "PRONTO_PARA_EXECUTAR",
          "EM_EXECUCAO",
          "AGUARDANDO_PECA",
          "CONCLUIDO",
        ]);
    })
    .select("item.id");

  if (!placeholderItems.length) {
    return;
  }

  await knex("itens_ordem_servico")
    .whereIn(
      "id",
      placeholderItems.map((item) => item.id),
    )
    .update({
      status_item: "CONCLUIDO",
      concluido_em: knex.fn.now(),
      atualizado_em: knex.fn.now(),
    });
};

exports.down = async function down() {
  // Data correction only. We intentionally do not reopen diagnostic placeholders.
};
