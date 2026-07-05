const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const sharedConfig = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "jebil",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    charset: "utf8mb4",
    timezone: "Z",
  },
  pool: {
    min: Number(process.env.DB_POOL_MIN || 0),
    max: Number(process.env.DB_POOL_MAX || 10),
    afterCreate(connection, done) {
      connection.query("SET time_zone = '+00:00'", (error) => {
        done(error, connection);
      });
    },
  },
  migrations: {
    directory: path.resolve(__dirname, "src/database/migrations"),
    tableName: "knex_migrations",
    extension: "js",
  },
  seeds: {
    directory: path.resolve(__dirname, "src/database/seeds"),
    extension: "js",
  },
};

module.exports = {
  development: sharedConfig,
  production: sharedConfig,
};
