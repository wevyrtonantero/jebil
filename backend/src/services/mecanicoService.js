const fs = require("fs");
const path = require("path");
const { ApiError } = require("../utils/ApiError");
const { parseBoolean } = require("../utils/parseBoolean");
const { uploadBaseUrl } = require("../config/env");
const mecanicoRepository = require("../repositories/mecanicoRepository");
const { emitSocketEvent } = require("../sockets");

const defaultFotoUrl = `${uploadBaseUrl}/uploads/mecanicos/default-avatar.svg`;

function sanitizeMecanico(mecanico) {
  return {
    id: mecanico.id,
    nome: mecanico.nome,
    foto_url: mecanico.foto_url || defaultFotoUrl,
    ativo: Boolean(mecanico.ativo),
    disponivel_hoje: Boolean(mecanico.disponivel_hoje),
    ordem_exibicao: mecanico.ordem_exibicao,
    criado_em: mecanico.criado_em,
    atualizado_em: mecanico.atualizado_em,
  };
}

async function listMecanicos(query) {
  const ativo = query.ativo === undefined ? null : parseBoolean(query.ativo);
  const mecanicos = await mecanicoRepository.list({
    ativo,
  });

  return mecanicos.map(sanitizeMecanico);
}

async function getMecanicoById(id) {
  const mecanico = await mecanicoRepository.findById(id);

  if (!mecanico) {
    throw new ApiError(404, "Mecanico nao encontrado.");
  }

  return sanitizeMecanico(mecanico);
}

async function createMecanico(payload) {
  const mecanico = await mecanicoRepository.insert(payload);
  emitSocketEvent("mecanico:atualizado", { mecanicoId: mecanico.id, tipo: "criado" });
  return sanitizeMecanico(mecanico);
}

async function updateMecanico(id, payload) {
  const existing = await mecanicoRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Mecanico nao encontrado.");
  }

  const mecanico = await mecanicoRepository.update(id, payload);
  emitSocketEvent("mecanico:atualizado", { mecanicoId: mecanico.id, tipo: "atualizado" });
  return sanitizeMecanico(mecanico);
}

async function updateMecanicoStatus(id, ativo) {
  const existing = await mecanicoRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Mecanico nao encontrado.");
  }

  const mecanico = await mecanicoRepository.updateStatus(id, ativo);
  emitSocketEvent("mecanico:atualizado", { mecanicoId: mecanico.id, tipo: "status" });
  return sanitizeMecanico(mecanico);
}

async function updateMecanicoDisponibilidade(id, disponivelHoje) {
  const existing = await mecanicoRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Mecanico nao encontrado.");
  }

  if (!existing.ativo && disponivelHoje) {
    throw new ApiError(409, "Mecanico inativo nao pode ficar disponivel na oficina.");
  }

  const mecanico = await mecanicoRepository.updateDisponibilidade(id, disponivelHoje);
  emitSocketEvent("mecanico:atualizado", { mecanicoId: mecanico.id, tipo: "disponibilidade" });
  return sanitizeMecanico(mecanico);
}

async function updateMecanicoFoto(id, file) {
  const existing = await mecanicoRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Mecanico nao encontrado.");
  }

  if (!file) {
    throw new ApiError(400, "Arquivo de foto nao enviado.");
  }

  const fotoUrl = `${uploadBaseUrl}/uploads/mecanicos/${file.filename}`;
  const mecanico = await mecanicoRepository.updateFoto(id, fotoUrl);
  emitSocketEvent("mecanico:atualizado", { mecanicoId: mecanico.id, tipo: "foto" });
  return sanitizeMecanico(mecanico);
}

async function deleteMecanicoFoto(id) {
  const existing = await mecanicoRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Mecanico nao encontrado.");
  }

  if (existing.foto_url) {
    const fileName = existing.foto_url.split("/").pop();
    const filePath = path.resolve(process.cwd(), "uploads", "mecanicos", fileName);

    if (fs.existsSync(filePath) && fileName !== "default-avatar.svg") {
      fs.unlinkSync(filePath);
    }
  }

  const mecanico = await mecanicoRepository.updateFoto(id, null);
  emitSocketEvent("mecanico:atualizado", { mecanicoId: mecanico.id, tipo: "foto-removida" });
  return sanitizeMecanico(mecanico);
}

module.exports = {
  listMecanicos,
  getMecanicoById,
  createMecanico,
  updateMecanico,
  updateMecanicoStatus,
  updateMecanicoDisponibilidade,
  updateMecanicoFoto,
  deleteMecanicoFoto,
};
