exports.up = async function up(knex) {
  await knex.schema.createTable("assinaturas_recebimento", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("ordem_servico_id").unsigned().notNullable();
    table.bigInteger("cliente_id").unsigned().notNullable();
    table.bigInteger("motocicleta_id").unsigned().notNullable();
    table.bigInteger("usuario_responsavel_id").unsigned().notNullable();
    table.string("nome_cliente", 160).nullable();
    table.string("telefone_cliente", 40).nullable();
    table.string("numero_os", 30).notNullable();
    table.string("orcamento_referencia", 40).nullable();
    table.string("termo_titulo", 160).notNullable();
    table.text("termo_texto").notNullable();
    table.boolean("recebeu_fotos_whatsapp").notNullable().defaultTo(true);
    table.boolean("ciente_possivel_cobranca").notNullable().defaultTo(true);
    table.specificType("assinatura_data_url", "longtext").notNullable();
    table.dateTime("assinado_em").notNullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.unique(["ordem_servico_id"], { indexName: "uk_assinaturas_recebimento_ordem" });
    table.index(["cliente_id"], "idx_assinaturas_recebimento_cliente");
    table.index(["motocicleta_id"], "idx_assinaturas_recebimento_motocicleta");
    table.index(["assinado_em"], "idx_assinaturas_recebimento_assinado");

    table
      .foreign("ordem_servico_id", "fk_assinaturas_recebimento_ordem_servico_id")
      .references("ordens_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("cliente_id", "fk_assinaturas_recebimento_cliente_id")
      .references("clientes.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("motocicleta_id", "fk_assinaturas_recebimento_motocicleta_id")
      .references("motocicletas.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("usuario_responsavel_id", "fk_assinaturas_recebimento_usuario_responsavel_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("assinaturas_recebimento");
};
