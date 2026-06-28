const mysql = require("mysql2/promise");
const { nodeEnv } = require("../config/env");
const knexConfig = require("../../knexfile");

async function main() {
  const config = knexConfig[nodeEnv] || knexConfig.development;
  const { host, port, user, password, database, charset } = config.connection;

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    charset,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );

  await connection.end();

  console.log(`Banco '${database}' verificado/criado com sucesso.`);
}

main().catch((error) => {
  console.error("Falha ao criar/verificar o banco:", error.message);
  process.exit(1);
});
