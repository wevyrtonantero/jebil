const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const authService = require("../src/services/authService");
const usuarioRepository = require("../src/repositories/usuarioRepository");

const originalRepository = {
  findByEmail: usuarioRepository.findByEmail,
  findById: usuarioRepository.findById,
  updateLastLogin: usuarioRepository.updateLastLogin,
};

test.afterEach(() => {
  usuarioRepository.findByEmail = originalRepository.findByEmail;
  usuarioRepository.findById = originalRepository.findById;
  usuarioRepository.updateLastLogin = originalRepository.updateLastLogin;
});

test("authService.login returns token and sanitized user", async () => {
  const senhaHash = await bcrypt.hash("senha123", 10);
  const user = {
    id: 1,
    nome: "Admin",
    email: "admin@jebil.local",
    senha_hash: senhaHash,
    perfil: "ADMIN",
    ativo: true,
    ultimo_login_em: null,
    criado_em: new Date(),
    atualizado_em: new Date(),
  };

  usuarioRepository.findByEmail = async () => user;
  usuarioRepository.updateLastLogin = async () => {};
  usuarioRepository.findById = async () => user;

  const result = await authService.login({
    email: user.email,
    senha: "senha123",
  });

  assert.equal(typeof result.accessToken, "string");
  assert.equal(result.user.email, user.email);
  assert.equal(result.user.senha_hash, undefined);
});

test("authService.login blocks inactive users", async () => {
  const senhaHash = await bcrypt.hash("senha123", 10);

  usuarioRepository.findByEmail = async () => ({
    id: 2,
    nome: "Oficina",
    email: "oficina@jebil.local",
    senha_hash: senhaHash,
    perfil: "OFICINA",
    ativo: false,
  });

  await assert.rejects(
    authService.login({
      email: "oficina@jebil.local",
      senha: "senha123",
    }),
    /inativo/i,
  );
});
