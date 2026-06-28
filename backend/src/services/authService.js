const bcrypt = require("bcryptjs");
const { signAccessToken } = require("../config/jwt");
const { ApiError } = require("../utils/ApiError");
const { hashPassword } = require("../utils/hashPassword");
const usuarioRepository = require("../repositories/usuarioRepository");

const loginAliasMap = {
  admin: process.env.SEED_ADMIN_EMAIL || "admin@jebil.local",
  recepcao: process.env.SEED_RECEPCAO_EMAIL || "recepcao@jebil.local",
  oficina: process.env.SEED_OFICINA_EMAIL || "oficina@jebil.local",
  orcamentista: process.env.SEED_ORCAMENTISTA_EMAIL || "orcamentista@jebil.local",
};

function sanitizeUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    ativo: user.ativo,
    ultimo_login_em: user.ultimo_login_em,
    criado_em: user.criado_em,
    atualizado_em: user.atualizado_em,
  };
}

async function login(credentials) {
  const loginEmail = loginAliasMap[credentials.email] || credentials.email;
  const user = await usuarioRepository.findByEmail(loginEmail);

  if (!user) {
    throw new ApiError(401, "Email ou senha invalidos.");
  }

  if (!user.ativo) {
    throw new ApiError(403, "Usuario inativo nao pode acessar o sistema.");
  }

  const passwordMatches = await bcrypt.compare(credentials.senha, user.senha_hash);

  if (!passwordMatches) {
    throw new ApiError(401, "Email ou senha invalidos.");
  }

  await usuarioRepository.updateLastLogin(user.id);
  const freshUser = await usuarioRepository.findById(user.id);

  const token = signAccessToken({
    sub: freshUser.id,
    perfil: freshUser.perfil,
    email: freshUser.email,
  });

  return {
    accessToken: token,
    user: sanitizeUser(freshUser),
  };
}

async function getCurrentUser(userId) {
  const user = await usuarioRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, "Usuario nao encontrado.");
  }

  return sanitizeUser(user);
}

function logout() {
  return {
    message: "Logout realizado com sucesso.",
  };
}

async function updateOwnPassword(userId, senhaAtual, novaSenha) {
  const user = await usuarioRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, "Usuario nao encontrado.");
  }

  const currentPassword = String(senhaAtual || "");
  const nextPassword = String(novaSenha || "").trim();

  if (!currentPassword) {
    throw new ApiError(400, "Informe a senha atual.");
  }

  if (nextPassword.length < 4) {
    throw new ApiError(400, "A nova senha precisa ter pelo menos 4 caracteres.");
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.senha_hash);

  if (!passwordMatches) {
    throw new ApiError(400, "A senha atual esta incorreta.");
  }

  const senhaHash = await hashPassword(nextPassword);
  const updated = await usuarioRepository.updatePassword(user.id, senhaHash);

  return sanitizeUser(updated);
}

async function updateSystemPassword(targetPerfil, senha) {
  const allowedTargets = new Set(["RECEPCAO", "OFICINA", "ORCAMENTISTA"]);

  if (!allowedTargets.has(targetPerfil)) {
    throw new ApiError(400, "Perfil nao permitido para troca de senha.");
  }

  const normalizedPassword = String(senha || "").trim();

  if (normalizedPassword.length < 4) {
    throw new ApiError(400, "A nova senha precisa ter pelo menos 4 caracteres.");
  }

  const user = await usuarioRepository.findByPerfil(targetPerfil);

  if (!user) {
    throw new ApiError(404, "Usuario de acesso nao encontrado.");
  }

  const senhaHash = await hashPassword(normalizedPassword);
  const updated = await usuarioRepository.updatePassword(user.id, senhaHash);

  return sanitizeUser(updated);
}

module.exports = {
  login,
  getCurrentUser,
  logout,
  updateOwnPassword,
  updateSystemPassword,
};
