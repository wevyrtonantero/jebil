exports.up = async function up(knex) {
  await knex.schema.createTable("ordens_servico", (table) => {
    table.bigIncrements("id").primary();
    table.string("numero_os", 30).notNullable();
    table.bigInteger("cliente_id").unsigned().notNullable();
    table.bigInteger("motocicleta_id").unsigned().notNullable();
    table.bigInteger("usuario_abertura_id").unsigned().notNullable();
    table.text("queixa_principal").notNullable();
    table.text("observacoes_entrada").nullable();
    table.text("observacoes_internas").nullable();
    table.dateTime("data_prometida").nullable();
    table.enu("prioridade_agregada", ["NORMAL", "ALTA", "URGENTE"], {
      useNative: true,
      enumName: "prioridade_ordem_servico_enum",
    }).notNullable().defaultTo("NORMAL");
    table.enu(
      "status_geral",
      [
        "ABERTA",
        "EM_DIAGNOSTICO",
        "EM_ORCAMENTO",
        "AGUARDANDO_CLIENTE",
        "AGUARDANDO_PECA",
        "EM_EXECUCAO",
        "PARCIALMENTE_CONCLUIDA",
        "PRONTA_PARA_RETIRADA",
        "FINALIZADA",
        "ARQUIVADA",
        "CANCELADA",
      ],
      {
        useNative: true,
        enumName: "status_geral_ordem_servico_enum",
      },
    ).notNullable().defaultTo("ABERTA");
    table.integer("km_entrada").nullable();
    table.bigInteger("legado_atendimento_id").unsigned().nullable();
    table.dateTime("aberta_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("pronta_retirada_em").nullable();
    table.dateTime("retirada_em").nullable();
    table.dateTime("finalizada_em").nullable();
    table.dateTime("arquivada_em").nullable();
    table.dateTime("cancelada_em").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.unique(["numero_os"], { indexName: "uk_ordens_servico_numero_os" });
    table.index(["cliente_id", "aberta_em"], "idx_ordens_servico_cliente_aberta");
    table.index(["motocicleta_id", "aberta_em"], "idx_ordens_servico_moto_aberta");
    table.index(["status_geral"], "idx_ordens_servico_status_geral");
    table.index(["prioridade_agregada"], "idx_ordens_servico_prioridade");
    table.index(["data_prometida"], "idx_ordens_servico_data_prometida");

    table
      .foreign("cliente_id", "fk_ordens_servico_cliente_id")
      .references("clientes.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("motocicleta_id", "fk_ordens_servico_motocicleta_id")
      .references("motocicletas.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("usuario_abertura_id", "fk_ordens_servico_usuario_abertura_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("legado_atendimento_id", "fk_ordens_servico_legado_atendimento_id")
      .references("atendimentos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("itens_ordem_servico", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("ordem_servico_id").unsigned().notNullable();
    table.bigInteger("item_pai_id").unsigned().nullable();
    table.bigInteger("retorno_garantia_de_item_id").unsigned().nullable();
    table.string("descricao", 255).notNullable();
    table.string("categoria", 80).nullable();
    table.string("tipo", 80).nullable();
    table.enu("origem", ["SOLICITADO_CLIENTE", "GERADO_DIAGNOSTICO", "INCLUIDO_ORCAMENTISTA", "RETORNO_GARANTIA"], {
      useNative: true,
      enumName: "origem_item_ordem_servico_enum",
    }).notNullable();
    table.boolean("execucao_direta").notNullable().defaultTo(false);
    table.boolean("exige_diagnostico").notNullable().defaultTo(false);
    table.enu(
      "autorizacao_status",
      ["NAO_SE_APLICA", "AGUARDANDO_RESPOSTA", "AUTORIZADO", "NAO_AUTORIZADO", "PARCIALMENTE_AUTORIZADO", "CANCELADO"],
      {
        useNative: true,
        enumName: "autorizacao_item_ordem_servico_enum",
      },
    ).notNullable().defaultTo("AGUARDANDO_RESPOSTA");
    table.enu("pagamento_status", ["PENDENTE", "PAGO"], {
      useNative: true,
      enumName: "pagamento_item_ordem_servico_enum",
    }).notNullable().defaultTo("PENDENTE");
    table.enu(
      "status_item",
      [
        "SOLICITADO",
        "AGUARDANDO_DIAGNOSTICO",
        "EM_DIAGNOSTICO",
        "DIAGNOSTICADO",
        "AGUARDANDO_ORCAMENTO",
        "AGUARDANDO_AUTORIZACAO",
        "AGUARDANDO_PECA",
        "PRONTO_PARA_EXECUTAR",
        "EM_EXECUCAO",
        "CONCLUIDO",
        "EM_GARANTIA",
        "CANCELADO",
      ],
      {
        useNative: true,
        enumName: "status_item_ordem_servico_enum",
      },
    ).notNullable().defaultTo("SOLICITADO");
    table.enu("prioridade", ["NORMAL", "ALTA", "URGENTE"], {
      useNative: true,
      enumName: "prioridade_item_ordem_servico_enum",
    }).notNullable().defaultTo("NORMAL");
    table.dateTime("data_prometida").nullable();
    table.dateTime("previsao_peca_atual").nullable();
    table.text("observacoes").nullable();
    table.bigInteger("criado_por").unsigned().notNullable();
    table.boolean("garantia_aplicavel").notNullable().defaultTo(false);
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("iniciado_em").nullable();
    table.dateTime("concluido_em").nullable();
    table.dateTime("cancelado_em").nullable();
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["ordem_servico_id", "status_item"], "idx_itens_os_ordem_status");
    table.index(["ordem_servico_id", "prioridade"], "idx_itens_os_ordem_prioridade");
    table.index(["status_item"], "idx_itens_os_status");
    table.index(["autorizacao_status"], "idx_itens_os_autorizacao");
    table.index(["pagamento_status"], "idx_itens_os_pagamento");
    table.index(["data_prometida"], "idx_itens_os_data_prometida");

    table
      .foreign("ordem_servico_id", "fk_itens_os_ordem_servico_id")
      .references("ordens_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("item_pai_id", "fk_itens_os_item_pai_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("retorno_garantia_de_item_id", "fk_itens_os_retorno_garantia_de_item_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("criado_por", "fk_itens_os_criado_por")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("historico_ordem_servico", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("ordem_servico_id").unsigned().notNullable();
    table.bigInteger("usuario_id").unsigned().nullable();
    table.string("acao", 80).notNullable();
    table.string("status_anterior", 60).nullable();
    table.string("status_novo", 60).nullable();
    table.text("observacao").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["ordem_servico_id", "criado_em"], "idx_hist_os_ordem_criado");
    table.index(["acao"], "idx_hist_os_acao");

    table
      .foreign("ordem_servico_id", "fk_hist_os_ordem_servico_id")
      .references("ordens_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("usuario_id", "fk_hist_os_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("historico_item_ordem_servico", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("item_ordem_servico_id").unsigned().notNullable();
    table.bigInteger("usuario_id").unsigned().nullable();
    table.string("acao", 80).notNullable();
    table.string("status_item_anterior", 60).nullable();
    table.string("status_item_novo", 60).nullable();
    table.string("autorizacao_anterior", 60).nullable();
    table.string("autorizacao_nova", 60).nullable();
    table.string("pagamento_anterior", 60).nullable();
    table.string("pagamento_novo", 60).nullable();
    table.text("observacao").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["item_ordem_servico_id", "criado_em"], "idx_hist_item_os_item_criado");
    table.index(["acao"], "idx_hist_item_os_acao");

    table
      .foreign("item_ordem_servico_id", "fk_hist_item_os_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("usuario_id", "fk_hist_item_os_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("diagnosticos", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("ordem_servico_id").unsigned().notNullable();
    table.bigInteger("item_diagnostico_id").unsigned().nullable();
    table.bigInteger("mecanico_principal_id").unsigned().nullable();
    table.text("queixa_avaliada").notNullable();
    table.text("causa_identificada").nullable();
    table.text("descricao_tecnica").nullable();
    table.text("servicos_sugeridos_resumo").nullable();
    table.text("pecas_sugeridas_resumo").nullable();
    table.text("observacoes").nullable();
    table.enu("status_diagnostico", ["ABERTO", "EM_ANDAMENTO", "CONCLUIDO", "ENVIADO_ORCAMENTISTA", "CANCELADO"], {
      useNative: true,
      enumName: "status_diagnostico_v2_enum",
    }).notNullable().defaultTo("ABERTO");
    table.dateTime("iniciado_em").nullable();
    table.dateTime("concluido_em").nullable();
    table.dateTime("enviado_orcamentista_em").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["ordem_servico_id"], "idx_diagnosticos_ordem");
    table.index(["item_diagnostico_id"], "idx_diagnosticos_item");
    table.index(["mecanico_principal_id"], "idx_diagnosticos_mecanico");
    table.index(["status_diagnostico"], "idx_diagnosticos_status");

    table
      .foreign("ordem_servico_id", "fk_diagnosticos_ordem_servico_id")
      .references("ordens_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("item_diagnostico_id", "fk_diagnosticos_item_diagnostico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("mecanico_principal_id", "fk_diagnosticos_mecanico_principal_id")
      .references("mecanicos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("diagnostico_itens", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("diagnostico_id").unsigned().notNullable();
    table.bigInteger("item_ordem_servico_id").unsigned().notNullable();
    table.string("tipo_vinculo", 40).notNullable().defaultTo("GERADO");
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table.unique(["diagnostico_id", "item_ordem_servico_id"], { indexName: "uk_diagnostico_itens_par" });
    table.index(["item_ordem_servico_id"], "idx_diagnostico_itens_item");

    table
      .foreign("diagnostico_id", "fk_diagnostico_itens_diagnostico_id")
      .references("diagnosticos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("item_ordem_servico_id", "fk_diagnostico_itens_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("orcamentos", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("ordem_servico_id").unsigned().notNullable();
    table.integer("versao_numero").notNullable().defaultTo(1);
    table.string("numero_externo", 20).notNullable();
    table.bigInteger("orcamentista_usuario_id").unsigned().notNullable();
    table.enu("status_orcamento", ["RASCUNHO", "PENDENTE_ENVIO", "ENVIADO", "APROVADO", "PARCIAL", "RECUSADO", "ARQUIVADO"], {
      useNative: true,
      enumName: "status_orcamento_v2_enum",
    }).notNullable().defaultTo("RASCUNHO");
    table.text("observacoes").nullable();
    table.decimal("valor_total", 12, 2).notNullable().defaultTo(0);
    table.string("pdf_url", 255).nullable();
    table.dateTime("enviado_cliente_em").nullable();
    table.dateTime("arquivado_em").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.unique(["numero_externo"], { indexName: "uk_orcamentos_numero_externo" });
    table.unique(["ordem_servico_id", "versao_numero"], { indexName: "uk_orcamentos_ordem_versao" });
    table.index(["ordem_servico_id", "status_orcamento"], "idx_orcamentos_ordem_status");

    table
      .foreign("ordem_servico_id", "fk_orcamentos_ordem_servico_id")
      .references("ordens_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("orcamentista_usuario_id", "fk_orcamentos_orcamentista_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("orcamento_itens", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("orcamento_id").unsigned().notNullable();
    table.bigInteger("item_ordem_servico_id").unsigned().nullable();
    table.string("descricao", 255).notNullable();
    table.decimal("quantidade", 10, 2).notNullable().defaultTo(1);
    table.decimal("valor_peca", 12, 2).notNullable().defaultTo(0);
    table.decimal("valor_mao_obra", 12, 2).notNullable().defaultTo(0);
    table.decimal("valor_total", 12, 2).notNullable().defaultTo(0);
    table.text("observacao").nullable();
    table.string("origem", 80).nullable();
    table.enu("autorizacao_status", ["AGUARDANDO_RESPOSTA", "AUTORIZADO", "NAO_AUTORIZADO", "PARCIALMENTE_AUTORIZADO", "CANCELADO"], {
      useNative: true,
      enumName: "autorizacao_orcamento_item_enum",
    }).notNullable().defaultTo("AGUARDANDO_RESPOSTA");
    table.integer("ordem_exibicao").notNullable().defaultTo(0);
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["orcamento_id"], "idx_orcamento_itens_orcamento");
    table.index(["item_ordem_servico_id"], "idx_orcamento_itens_item");
    table.index(["autorizacao_status"], "idx_orcamento_itens_autorizacao");

    table
      .foreign("orcamento_id", "fk_orcamento_itens_orcamento_id")
      .references("orcamentos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("item_ordem_servico_id", "fk_orcamento_itens_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("autorizacoes", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("item_ordem_servico_id").unsigned().notNullable();
    table.bigInteger("orcamento_item_id").unsigned().nullable();
    table.enu("status_autorizacao", ["AGUARDANDO_RESPOSTA", "AUTORIZADO", "NAO_AUTORIZADO", "PARCIALMENTE_AUTORIZADO", "CANCELADO"], {
      useNative: true,
      enumName: "status_autorizacao_v2_enum",
    }).notNullable();
    table.bigInteger("decidido_por_usuario_id").unsigned().notNullable();
    table.dateTime("decidido_em").notNullable().defaultTo(knex.fn.now());
    table.string("origem_decisao", 60).nullable();
    table.text("observacao").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["item_ordem_servico_id", "decidido_em"], "idx_autorizacoes_item_decidido");
    table.index(["status_autorizacao"], "idx_autorizacoes_status");

    table
      .foreign("item_ordem_servico_id", "fk_autorizacoes_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("orcamento_item_id", "fk_autorizacoes_orcamento_item_id")
      .references("orcamento_itens.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("decidido_por_usuario_id", "fk_autorizacoes_decidido_por_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("pagamentos_itens", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("item_ordem_servico_id").unsigned().notNullable();
    table.enu("status_pagamento", ["PENDENTE", "PAGO"], {
      useNative: true,
      enumName: "status_pagamento_item_v2_enum",
    }).notNullable();
    table.bigInteger("alterado_por_usuario_id").unsigned().notNullable();
    table.dateTime("alterado_em").notNullable().defaultTo(knex.fn.now());
    table.text("observacao").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["item_ordem_servico_id", "alterado_em"], "idx_pagamentos_itens_item_alterado");
    table.index(["status_pagamento"], "idx_pagamentos_itens_status");

    table
      .foreign("item_ordem_servico_id", "fk_pagamentos_itens_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("alterado_por_usuario_id", "fk_pagamentos_itens_alterado_por_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("execucoes", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("item_ordem_servico_id").unsigned().notNullable();
    table.bigInteger("mecanico_principal_id").unsigned().nullable();
    table.enu("status_execucao", ["ABERTA", "EM_EXECUCAO", "CONCLUIDA", "CANCELADA"], {
      useNative: true,
      enumName: "status_execucao_v2_enum",
    }).notNullable().defaultTo("ABERTA");
    table.text("descricao_execucao").nullable();
    table.dateTime("iniciado_em").nullable();
    table.dateTime("finalizado_em").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["item_ordem_servico_id"], "idx_execucoes_item");
    table.index(["mecanico_principal_id"], "idx_execucoes_mecanico_principal");
    table.index(["status_execucao"], "idx_execucoes_status");

    table
      .foreign("item_ordem_servico_id", "fk_execucoes_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("mecanico_principal_id", "fk_execucoes_mecanico_principal_id")
      .references("mecanicos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("execucao_mecanicos", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("execucao_id").unsigned().notNullable();
    table.bigInteger("mecanico_id").unsigned().notNullable();
    table.enu("papel", ["PRINCIPAL", "AUXILIAR"], {
      useNative: true,
      enumName: "papel_execucao_mecanico_v2_enum",
    }).notNullable().defaultTo("AUXILIAR");
    table.enu("status_participacao", ["ATIVA", "CONCLUIDA", "CANCELADA"], {
      useNative: true,
      enumName: "status_participacao_execucao_v2_enum",
    }).notNullable().defaultTo("ATIVA");
    table.dateTime("iniciado_em").nullable();
    table.dateTime("finalizado_em").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table.unique(["execucao_id", "mecanico_id", "papel"], { indexName: "uk_execucao_mecanicos_execucao_mecanico_papel" });
    table.index(["mecanico_id"], "idx_execucao_mecanicos_mecanico");

    table
      .foreign("execucao_id", "fk_execucao_mecanicos_execucao_id")
      .references("execucoes.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("mecanico_id", "fk_execucao_mecanicos_mecanico_id")
      .references("mecanicos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("previsoes_pecas", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("item_ordem_servico_id").unsigned().notNullable();
    table.string("descricao_peca", 255).notNullable();
    table.dateTime("previsao_chegada").nullable();
    table.bigInteger("informado_por_usuario_id").unsigned().notNullable();
    table.dateTime("informado_em").notNullable().defaultTo(knex.fn.now());
    table.text("observacao").nullable();
    table.enu("status_previsao", ["ATIVA", "SUPERADA", "CONCLUIDA", "CANCELADA"], {
      useNative: true,
      enumName: "status_previsao_peca_v2_enum",
    }).notNullable().defaultTo("ATIVA");
    table.bigInteger("substitui_previsao_id").unsigned().nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["item_ordem_servico_id"], "idx_previsoes_pecas_item");
    table.index(["previsao_chegada"], "idx_previsoes_pecas_previsao_chegada");
    table.index(["status_previsao"], "idx_previsoes_pecas_status");

    table
      .foreign("item_ordem_servico_id", "fk_previsoes_pecas_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("informado_por_usuario_id", "fk_previsoes_pecas_informado_por_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("substitui_previsao_id", "fk_previsoes_pecas_substitui_previsao_id")
      .references("previsoes_pecas.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("prioridades", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("ordem_servico_id").unsigned().nullable();
    table.bigInteger("item_ordem_servico_id").unsigned().nullable();
    table.enu("nivel", ["NORMAL", "ALTA", "URGENTE"], {
      useNative: true,
      enumName: "nivel_prioridade_v2_enum",
    }).notNullable();
    table.text("motivo").nullable();
    table.bigInteger("definido_por_usuario_id").unsigned().notNullable();
    table.dateTime("definido_em").notNullable().defaultTo(knex.fn.now());
    table.string("origem_prioridade", 40).notNullable().defaultTo("MANUAL");

    table.index(["ordem_servico_id"], "idx_prioridades_ordem");
    table.index(["item_ordem_servico_id"], "idx_prioridades_item");
    table.index(["nivel"], "idx_prioridades_nivel");

    table
      .foreign("ordem_servico_id", "fk_prioridades_ordem_servico_id")
      .references("ordens_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("item_ordem_servico_id", "fk_prioridades_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("definido_por_usuario_id", "fk_prioridades_definido_por_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("garantias", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("item_ordem_servico_id").unsigned().notNullable();
    table.bigInteger("motocicleta_id").unsigned().notNullable();
    table.integer("dias_garantia").notNullable().defaultTo(90);
    table.dateTime("inicio_garantia_em").notNullable();
    table.dateTime("fim_garantia_em").notNullable();
    table.enu("status_garantia", ["ATIVA", "EXPIRADA", "ENCERRADA", "CANCELADA"], {
      useNative: true,
      enumName: "status_garantia_v2_enum",
    }).notNullable().defaultTo("ATIVA");
    table.string("origem_regra", 60).notNullable().defaultTo("PADRAO_90_DIAS");
    table.bigInteger("editado_por_usuario_id").unsigned().nullable();
    table.text("observacao").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["motocicleta_id"], "idx_garantias_motocicleta");
    table.index(["item_ordem_servico_id"], "idx_garantias_item");
    table.index(["fim_garantia_em"], "idx_garantias_fim");
    table.index(["status_garantia"], "idx_garantias_status");

    table
      .foreign("item_ordem_servico_id", "fk_garantias_item_ordem_servico_id")
      .references("itens_ordem_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("motocicleta_id", "fk_garantias_motocicleta_id")
      .references("motocicletas.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("editado_por_usuario_id", "fk_garantias_editado_por_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("fotos_entrada", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("ordem_servico_id").unsigned().notNullable();
    table.bigInteger("cliente_id").unsigned().notNullable();
    table.bigInteger("motocicleta_id").unsigned().notNullable();
    table.bigInteger("usuario_responsavel_id").unsigned().notNullable();
    table.string("arquivo_url", 255).notNullable();
    table.string("nome_arquivo", 255).notNullable();
    table.string("mime_type", 80).notNullable();
    table.bigInteger("tamanho_bytes").unsigned().notNullable();
    table.integer("ordem_exibicao").notNullable().defaultTo(0);
    table.string("hash_arquivo", 128).nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("excluido_em").nullable();
    table.bigInteger("excluido_por_usuario_id").unsigned().nullable();

    table.index(["ordem_servico_id", "ordem_exibicao"], "idx_fotos_entrada_ordem_exibicao");
    table.index(["motocicleta_id"], "idx_fotos_entrada_motocicleta");
    table.index(["criado_em"], "idx_fotos_entrada_criado");

    table
      .foreign("ordem_servico_id", "fk_fotos_entrada_ordem_servico_id")
      .references("ordens_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("cliente_id", "fk_fotos_entrada_cliente_id")
      .references("clientes.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("motocicleta_id", "fk_fotos_entrada_motocicleta_id")
      .references("motocicletas.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("usuario_responsavel_id", "fk_fotos_entrada_usuario_responsavel_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("excluido_por_usuario_id", "fk_fotos_entrada_excluido_por_usuario_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("comunicacoes_whatsapp", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("ordem_servico_id").unsigned().nullable();
    table.bigInteger("diagnostico_id").unsigned().nullable();
    table.bigInteger("orcamento_id").unsigned().nullable();
    table.enu("tipo_comunicacao", ["RECEPCAO_CLIENTE", "OFICINA_ORCAMENTISTA", "ORCAMENTISTA_CLIENTE", "SERVICO_FINALIZADO"], {
      useNative: true,
      enumName: "tipo_comunicacao_whatsapp_v2_enum",
    }).notNullable();
    table.string("destinatario", 40).notNullable();
    table.string("finalidade", 120).notNullable();
    table.bigInteger("usuario_responsavel_id").unsigned().notNullable();
    table.text("mensagem_preparada").nullable();
    table.enu("status_registro", ["PREPARADA", "WHATSAPP_ABERTO"], {
      useNative: true,
      enumName: "status_registro_whatsapp_v2_enum",
    }).notNullable().defaultTo("PREPARADA");
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["ordem_servico_id"], "idx_com_whatsapp_ordem");
    table.index(["diagnostico_id"], "idx_com_whatsapp_diagnostico");
    table.index(["orcamento_id"], "idx_com_whatsapp_orcamento");
    table.index(["tipo_comunicacao"], "idx_com_whatsapp_tipo");
    table.index(["destinatario"], "idx_com_whatsapp_destinatario");
    table.index(["criado_em"], "idx_com_whatsapp_criado");

    table
      .foreign("ordem_servico_id", "fk_com_whatsapp_ordem_servico_id")
      .references("ordens_servico.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("diagnostico_id", "fk_com_whatsapp_diagnostico_id")
      .references("diagnosticos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("orcamento_id", "fk_com_whatsapp_orcamento_id")
      .references("orcamentos.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .foreign("usuario_responsavel_id", "fk_com_whatsapp_usuario_responsavel_id")
      .references("usuarios.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("comunicacoes_whatsapp");
  await knex.schema.dropTableIfExists("fotos_entrada");
  await knex.schema.dropTableIfExists("garantias");
  await knex.schema.dropTableIfExists("prioridades");
  await knex.schema.dropTableIfExists("previsoes_pecas");
  await knex.schema.dropTableIfExists("execucao_mecanicos");
  await knex.schema.dropTableIfExists("execucoes");
  await knex.schema.dropTableIfExists("pagamentos_itens");
  await knex.schema.dropTableIfExists("autorizacoes");
  await knex.schema.dropTableIfExists("orcamento_itens");
  await knex.schema.dropTableIfExists("orcamentos");
  await knex.schema.dropTableIfExists("diagnostico_itens");
  await knex.schema.dropTableIfExists("diagnosticos");
  await knex.schema.dropTableIfExists("historico_item_ordem_servico");
  await knex.schema.dropTableIfExists("historico_ordem_servico");
  await knex.schema.dropTableIfExists("itens_ordem_servico");
  await knex.schema.dropTableIfExists("ordens_servico");
};
