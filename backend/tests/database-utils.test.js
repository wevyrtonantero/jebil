const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const knexConfig = require("../knexfile");
const { normalizeCpf } = require("../src/utils/normalizeCpf");
const { normalizePlate } = require("../src/utils/normalizePlate");
const { hashPassword } = require("../src/utils/hashPassword");
const { formatOsNumber } = require("../src/utils/formatOsNumber");

test("normalizeCpf removes non-digits", () => {
  assert.equal(normalizeCpf("123.456.789-09"), "12345678909");
  assert.equal(normalizeCpf(null), null);
});

test("normalizePlate removes separators and uppercases", () => {
  assert.equal(normalizePlate("abc-1d23"), "ABC1D23");
  assert.equal(normalizePlate(" abc 1234 "), "ABC1234");
  assert.equal(normalizePlate(""), null);
});

test("hashPassword returns a bcrypt hash", async () => {
  const password = "dev-admin-123";
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.equal(await bcrypt.compare(password, hash), true);
});

test("formatOsNumber creates the approved OS mask", () => {
  assert.equal(formatOsNumber(2026, 1), "OS-2026-000001");
  assert.equal(formatOsNumber(2026, 245), "OS-2026-000245");
});

test("knexfile points to mysql2 and expected directories", () => {
  assert.equal(knexConfig.development.client, "mysql2");
  assert.match(knexConfig.development.migrations.directory, /src[\\/]database[\\/]migrations$/);
  assert.match(knexConfig.development.seeds.directory, /src[\\/]database[\\/]seeds$/);
});
