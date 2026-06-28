const db = require("../database/connection");

function baseSelect() {
  return db("atendimentos")
    .leftJoin("clientes", "clientes.id", "atendimentos.cliente_id")
    .leftJoin("motocicletas", "motocicletas.id", "atendimentos.motocicleta_id")
    .leftJoin("mecanicos", "mecanicos.id", "atendimentos.mecanico_id")
    .select(
      "atendimentos.id",
      "atendimentos.numero_os",
      "atendimentos.cliente_id",
      "atendimentos.motocicleta_id",
      "atendimentos.mecanico_id",
      "atendimentos.problema_servico",
      "atendimentos.observacoes",
      "atendimentos.observacoes_internas",
      "atendimentos.servico_executado",
      "atendimentos.status",
      "atendimentos.situacao_pagamento",
      "atendimentos.entrada_em",
      "atendimentos.assumido_em",
      "atendimentos.servico_concluido_em",
      "atendimentos.pagamento_confirmado_em",
      "atendimentos.pagamento_confirmado_por",
      "atendimentos.liberado_retirada_em",
      "atendimentos.retirada_confirmada_em",
      "atendimentos.finalizado_em",
      "atendimentos.cancelado_em",
      "atendimentos.ordem_fila",
      "atendimentos.criado_por",
      "atendimentos.criado_em",
      "atendimentos.atualizado_em",
      "clientes.nome as cliente_nome",
      "clientes.telefone as cliente_telefone",
      "clientes.cpf as cliente_cpf",
      "clientes.cpf_normalizado as cliente_cpf_normalizado",
      "motocicletas.marca as motocicleta_marca",
      "motocicletas.modelo as motocicleta_modelo",
      "motocicletas.placa as motocicleta_placa",
      "motocicletas.placa_normalizada as motocicleta_placa_normalizada",
      "motocicletas.cor as motocicleta_cor",
      "mecanicos.nome as mecanico_nome",
      "mecanicos.foto_url as mecanico_foto_url",
    );
}

function applyFilters(query, filters) {
  if (filters.status) {
    query.where("atendimentos.status", filters.status);
  }

  if (filters.statuses?.length) {
    query.whereIn("atendimentos.status", filters.statuses);
  }

  if (filters.mecanicoId) {
    query.where("atendimentos.mecanico_id", filters.mecanicoId);
  }

  if (filters.situacaoPagamento) {
    query.where("atendimentos.situacao_pagamento", filters.situacaoPagamento);
  }

  if (filters.numeroOs) {
    query.where("atendimentos.numero_os", "like", `%${filters.numeroOs}%`);
  }

  if (filters.clienteNome) {
    query.where("clientes.nome", "like", `%${filters.clienteNome}%`);
  }

  if (filters.clienteCpf) {
    query.where("clientes.cpf_normalizado", filters.clienteCpf);
  }

  if (filters.placa) {
    query.where("motocicletas.placa_normalizada", filters.placa);
  }

  if (filters.startDate) {
    query.whereRaw("DATE(atendimentos.entrada_em) >= ?", [filters.startDate]);
  }

  if (filters.endDate) {
    query.whereRaw("DATE(atendimentos.entrada_em) <= ?", [filters.endDate]);
  }
}

async function list(filters = {}) {
  const query = baseSelect().modify((builder) => applyFilters(builder, filters));

  query.orderBy("atendimentos.entrada_em", "asc").orderBy("atendimentos.id", "asc");

  return query;
}

async function listFila() {
  return baseSelect()
    .where("atendimentos.status", "AGUARDANDO")
    .orderBy("atendimentos.entrada_em", "asc")
    .orderBy("atendimentos.id", "asc");
}

async function listRecentFinalizados(limit = 5) {
  return baseSelect()
    .where("atendimentos.status", "FINALIZADO")
    .orderBy("atendimentos.finalizado_em", "desc")
    .orderBy("atendimentos.id", "desc")
    .limit(limit);
}

async function findById(id, trx = db) {
  return trx("atendimentos")
    .leftJoin("clientes", "clientes.id", "atendimentos.cliente_id")
    .leftJoin("motocicletas", "motocicletas.id", "atendimentos.motocicleta_id")
    .leftJoin("mecanicos", "mecanicos.id", "atendimentos.mecanico_id")
    .select(
      "atendimentos.*",
      "clientes.nome as cliente_nome",
      "clientes.telefone as cliente_telefone",
      "clientes.cpf as cliente_cpf",
      "motocicletas.marca as motocicleta_marca",
      "motocicletas.modelo as motocicleta_modelo",
      "motocicletas.placa as motocicleta_placa",
      "motocicletas.cor as motocicleta_cor",
      "mecanicos.nome as mecanico_nome",
      "mecanicos.foto_url as mecanico_foto_url",
      "atendimentos.servico_executado",
    )
    .where("atendimentos.id", id)
    .first();
}

async function insert(trx, payload) {
  const [id] = await trx("atendimentos").insert({
    numero_os: payload.numeroOs,
    cliente_id: payload.clienteId,
    motocicleta_id: payload.motocicletaId,
    mecanico_id: null,
    problema_servico: payload.problemaServico,
    observacoes: payload.observacoes,
    observacoes_internas: payload.observacoesInternas,
    servico_executado: payload.servicoExecutado || null,
    status: payload.status,
    situacao_pagamento: payload.situacaoPagamento,
    entrada_em: payload.entradaEm,
    criado_por: payload.criadoPor,
    criado_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });

  return findById(id, trx);
}

async function updateFields(trx, id, fields) {
  await trx("atendimentos").where({ id }).update({
    ...fields,
    atualizado_em: db.fn.now(),
  });

  return findById(id, trx);
}

async function getSequenceRowForYear(trx, year) {
  return trx("controle_sequencias_os").where({ ano: year }).forUpdate().first();
}

async function insertSequenceRow(trx, year, ultimoNumero) {
  await trx("controle_sequencias_os").insert({
    ano: year,
    ultimo_numero: ultimoNumero,
    criado_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });
}

async function updateSequenceRow(trx, year, ultimoNumero) {
  await trx("controle_sequencias_os").where({ ano: year }).update({
    ultimo_numero: ultimoNumero,
    atualizado_em: db.fn.now(),
  });
}

module.exports = {
  list,
  listFila,
  listRecentFinalizados,
  findById,
  insert,
  updateFields,
  getSequenceRowForYear,
  insertSequenceRow,
  updateSequenceRow,
};
