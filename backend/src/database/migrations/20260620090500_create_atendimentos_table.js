/**
 * Decisao tecnica desta migration:
 * Mantemos ordem_fila como coluna opcional de compatibilidade visual,
 * mas a prioridade oficial da fila continua baseada em entrada_em.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("atendimentos", (table) => {
    table.bigIncrements("id").primary();
    table.string("numero_os", 30).notNullable();
    table.bigInteger("cliente_id").unsigned().notNullable();
    table.bigInteger("motocicleta_id").unsigned().notNullable();
    table.bigInteger("mecanico_id").unsigned().nullable();
    table.text("problema_servico").notNullable();
    table.text("observacoes").nullable();
    table.text("observacoes_internas").nullable();
    table.enu(
      "status",
      [
        "AGUARDANDO",
        "EM_SERVICO",
        "AGUARDANDO_PECAS",
        "SAIDA_PARA_TESTE",
        "SERVICO_CONCLUIDO",
        "PODE_RETIRAR",
        "FINALIZADO",
        "CANCELADO",
      ],
      {
        useNative: true,
        enumName: "status_atendimento_enum",
      },
    ).notNullable();
    table.enu("situacao_pagamento", ["PENDENTE", "PAGO"], {
      useNative: true,
      enumName: "situacao_pagamento_enum",
    }).notNullable().defaultTo("PENDENTE");
    table.dateTime("entrada_em").notNullable();
    table.dateTime("assumido_em").nullable();
    table.dateTime("servico_concluido_em").nullable();
    table.dateTime("pagamento_confirmado_em").nullable();
    table.bigInteger("pagamento_confirmado_por").unsigned().nullable();
    table.dateTime("liberado_retirada_em").nullable();
    table.dateTime("retirada_confirmada_em").nullable();
    table.dateTime("finalizado_em").nullable();
    table.dateTime("cancelado_em").nullable();
    table.bigInteger("ordem_fila").nullable();
    table.bigInteger("criado_por").unsigned().notNullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.unique(["numero_os"], {
      indexName: "uk_atendimentos_numero_os",
    });

    table
      .foreign("cliente_id", "fk_atendimentos_cliente_id")
      .references("clientes.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("motocicleta_id", "fk_atendimentos_motocicleta_id")
      .references("motocicletas.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("mecanico_id", "fk_atendimentos_mecanico_id")
      .references("mecanicos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("pagamento_confirmado_por", "fk_atendimentos_pagamento_confirmado_por")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("criado_por", "fk_atendimentos_criado_por")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table.index(["status"], "idx_atendimentos_status");
    table.index(["mecanico_id"], "idx_atendimentos_mecanico_id");
    table.index(["entrada_em"], "idx_atendimentos_entrada_em");
    table.index(["status", "entrada_em"], "idx_atendimentos_status_entrada_em");
    table.index(["situacao_pagamento"], "idx_atendimentos_pagamento");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("atendimentos");
};
