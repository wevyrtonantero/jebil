exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE usuarios
    MODIFY COLUMN perfil ENUM('ADMIN', 'RECEPCAO', 'OFICINA', 'ORCAMENTISTA') NOT NULL
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE usuarios
    MODIFY COLUMN perfil ENUM('ADMIN', 'RECEPCAO', 'OFICINA') NOT NULL
  `);
};
