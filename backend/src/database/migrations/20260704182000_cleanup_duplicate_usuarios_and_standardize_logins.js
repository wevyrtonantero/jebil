const officialUsers = [
  {
    perfil: "DIRETORIA",
    nome: "Diretoria",
    email: process.env.SEED_DIRETORIA_EMAIL || process.env.SEED_ADMIN_EMAIL || "diretoria",
    candidateEmails: [
      process.env.SEED_DIRETORIA_EMAIL,
      process.env.SEED_ADMIN_EMAIL,
      "diretoria",
      "admin",
      "diretoria@jebil.local",
      "admin@jebil.local",
    ],
  },
  {
    perfil: "RECEPCAO",
    nome: "Recepcao",
    email: process.env.SEED_RECEPCAO_EMAIL || "recepcao",
    candidateEmails: [process.env.SEED_RECEPCAO_EMAIL, "recepcao", "recepcao@jebil.local"],
  },
  {
    perfil: "OFICINA",
    nome: "Oficina",
    email: process.env.SEED_OFICINA_EMAIL || "oficina",
    candidateEmails: [process.env.SEED_OFICINA_EMAIL, "oficina", "oficina@jebil.local"],
  },
  {
    perfil: "SUPERVISAO",
    nome: "Supervisao",
    email: process.env.SEED_SUPERVISAO_EMAIL || process.env.SEED_ORCAMENTISTA_EMAIL || "supervisao",
    candidateEmails: [
      process.env.SEED_SUPERVISAO_EMAIL,
      process.env.SEED_ORCAMENTISTA_EMAIL,
      "supervisao",
      "orcamentista",
      "supervisao@jebil.local",
      "orcamentista@jebil.local",
    ],
  },
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function chooseCanonicalUser(users, candidateEmails) {
  const normalizedCandidates = candidateEmails.map(normalizeEmail).filter(Boolean);

  for (const candidateEmail of normalizedCandidates) {
    const matchedUser = users.find((user) => normalizeEmail(user.email) === candidateEmail);

    if (matchedUser) {
      return matchedUser;
    }
  }

  return [...users].sort((first, second) => Number(second.id) - Number(first.id))[0] || null;
}

async function listUsuarioReferences(knex) {
  const result = await knex.raw(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME = 'usuarios'
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);

  return result[0] || result;
}

exports.up = async function up(knex) {
  const usuarioReferences = await listUsuarioReferences(knex);

  for (const officialUser of officialUsers) {
    const usersByProfile = await knex("usuarios")
      .select("id", "nome", "email", "perfil", "ativo", "senha_hash")
      .where({ perfil: officialUser.perfil })
      .orderBy("id", "asc");

    if (!usersByProfile.length) {
      continue;
    }

    const canonicalUser = chooseCanonicalUser(usersByProfile, officialUser.candidateEmails);
    const duplicateUsers = usersByProfile.filter((user) => Number(user.id) !== Number(canonicalUser.id));

    for (const duplicateUser of duplicateUsers) {
      for (const reference of usuarioReferences) {
        await knex(reference.TABLE_NAME)
          .where(reference.COLUMN_NAME, duplicateUser.id)
          .update({ [reference.COLUMN_NAME]: canonicalUser.id });
      }

      await knex("usuarios").where({ id: duplicateUser.id }).del();
    }

    await knex("usuarios").where({ id: canonicalUser.id }).update({
      nome: officialUser.nome,
      email: officialUser.email,
      ativo: true,
      atualizado_em: knex.fn.now(),
    });
  }
};

exports.down = async function down() {
  // Cleanup migration intentionally does not recreate removed duplicate users.
};
