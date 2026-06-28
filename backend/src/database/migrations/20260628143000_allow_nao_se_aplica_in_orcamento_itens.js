exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE orcamento_itens
    MODIFY COLUMN autorizacao_status ENUM(
      'NAO_SE_APLICA',
      'AGUARDANDO_RESPOSTA',
      'AUTORIZADO',
      'NAO_AUTORIZADO',
      'PARCIALMENTE_AUTORIZADO',
      'CANCELADO'
    ) NOT NULL DEFAULT 'AGUARDANDO_RESPOSTA'
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    UPDATE orcamento_itens
    SET autorizacao_status = 'AGUARDANDO_RESPOSTA'
    WHERE autorizacao_status = 'NAO_SE_APLICA'
  `);

  await knex.raw(`
    ALTER TABLE orcamento_itens
    MODIFY COLUMN autorizacao_status ENUM(
      'AGUARDANDO_RESPOSTA',
      'AUTORIZADO',
      'NAO_AUTORIZADO',
      'PARCIALMENTE_AUTORIZADO',
      'CANCELADO'
    ) NOT NULL DEFAULT 'AGUARDANDO_RESPOSTA'
  `);
};
