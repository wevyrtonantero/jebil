exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE usuarios
    MODIFY COLUMN perfil ENUM('ADMIN', 'RECEPCAO', 'OFICINA', 'ORCAMENTISTA', 'DIRETORIA', 'SUPERVISAO') NOT NULL
  `);

  await knex("usuarios").where({ perfil: "ADMIN" }).update({ perfil: "DIRETORIA" });
  await knex("usuarios").where({ perfil: "ORCAMENTISTA" }).update({ perfil: "SUPERVISAO" });

  await knex.raw(`
    ALTER TABLE usuarios
    MODIFY COLUMN perfil ENUM('DIRETORIA', 'RECEPCAO', 'OFICINA', 'SUPERVISAO') NOT NULL
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE usuarios
    MODIFY COLUMN perfil ENUM('ADMIN', 'RECEPCAO', 'OFICINA', 'ORCAMENTISTA', 'DIRETORIA', 'SUPERVISAO') NOT NULL
  `);

  await knex("usuarios").where({ perfil: "DIRETORIA" }).update({ perfil: "ADMIN" });
  await knex("usuarios").where({ perfil: "SUPERVISAO" }).update({ perfil: "ORCAMENTISTA" });

  await knex.raw(`
    ALTER TABLE usuarios
    MODIFY COLUMN perfil ENUM('ADMIN', 'RECEPCAO', 'OFICINA', 'ORCAMENTISTA') NOT NULL
  `);
};
