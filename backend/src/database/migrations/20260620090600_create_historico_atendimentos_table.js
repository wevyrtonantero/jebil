exports.up = async function up(knex) {
  await knex.schema.createTable("historico_atendimentos", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("atendimento_id").unsigned().notNullable();
    table.bigInteger("usuario_id").unsigned().nullable();
    table.bigInteger("mecanico_id").unsigned().nullable();
    table.enu(
      "acao",
      [
        "CRIADO",
        "ENVIADO_PARA_FILA",
        "ASSUMIDO",
        "STATUS_ALTERADO",
        "RETORNADO_PARA_FILA",
        "SERVICO_CONCLUIDO",
        "PAGAMENTO_CONFIRMADO",
        "LIBERADO_PARA_RETIRADA",
        "RETIRADA_CONFIRMADA",
        "FINALIZADO",
        "CANCELADO",
      ],
      {
        useNative: true,
        enumName: "acao_historico_atendimento_enum",
      },
    ).notNullable();
    table.string("status_anterior", 40).nullable();
    table.string("status_novo", 40).nullable();
    table.text("observacao").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("atendimento_id", "fk_historico_atendimentos_atendimento_id")
      .references("atendimentos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("usuario_id", "fk_historico_atendimentos_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("mecanico_id", "fk_historico_atendimentos_mecanico_id")
      .references("mecanicos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table.index(["atendimento_id"], "idx_historico_atendimento_id");
    table.index(["criado_em"], "idx_historico_criado_em");
    table.index(["acao"], "idx_historico_acao");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("historico_atendimentos");
};
