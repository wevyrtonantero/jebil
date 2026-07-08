const bcrypt = require("bcryptjs");
const { signAccessToken } = require("../config/jwt");
const { ApiError } = require("../utils/ApiError");
const { hashPassword } = require("../utils/hashPassword");
const { buildRoleLookupCandidates, normalizeRole, perfisGerenciadosPorDiretoria } = require("../utils/roles");
const usuarioRepository = require("../repositories/usuarioRepository");

const loginAliasMap = {
  admin: [process.env.SEED_ADMIN_EMAIL, process.env.SEED_DIRETORIA_EMAIL, "admin@jebil.local", "diretoria@jebil.local"],
  diretoria: [process.env.SEED_DIRETORIA_EMAIL, process.env.SEED_ADMIN_EMAIL, "diretoria@jebil.local", "admin@jebil.local"],
  recepcao: [process.env.SEED_RECEPCAO_EMAIL, "recepcao@jebil.local"],
  oficina: [process.env.SEED_OFICINA_EMAIL, "oficina@jebil.local"],
  orcamentista: [process.env.SEED_ORCAMENTISTA_EMAIL, process.env.SEED_SUPERVISAO_EMAIL, "orcamentista@jebil.local", "supervisao@jebil.local"],
  supervisao: [process.env.SEED_SUPERVISAO_EMAIL, process.env.SEED_ORCAMENTISTA_EMAIL, "supervisao@jebil.local", "orcamentista@jebil.local"],
  operacao: [process.env.SEED_OPERACAO_EMAIL, "operacaoo"],
  operacaoo: [process.env.SEED_OPERACAO_EMAIL, "operacaoo"],
};

function resolveLoginCandidates(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const aliasCandidates = loginAliasMap[normalizedEmail];

  if (!aliasCandidates) {
    return [email];
  }

  return [...new Set(aliasCandidates.filter(Boolean))];
}

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
  const loginCandidates = resolveLoginCandidates(credentials.email);
  let user = null;

  for (const loginEmail of loginCandidates) {
    user = await usuarioRepository.findByEmail(loginEmail);

    if (user) {
      break;
    }
  }

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
  const normalizedTargetPerfil = normalizeRole(targetPerfil);
  const allowedTargets = new Set(perfisGerenciadosPorDiretoria);

  if (!allowedTargets.has(normalizedTargetPerfil)) {
    throw new ApiError(400, "Perfil nao permitido para troca de senha.");
  }

  const normalizedPassword = String(senha || "").trim();

  if (normalizedPassword.length < 4) {
    throw new ApiError(400, "A nova senha precisa ter pelo menos 4 caracteres.");
  }

  let user = null;

  for (const perfilCandidate of buildRoleLookupCandidates(normalizedTargetPerfil)) {
    user = await usuarioRepository.findByPerfil(perfilCandidate);

    if (user) {
      break;
    }
  }

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
