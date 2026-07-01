const db = require("../../database/connection");

function baseSelect(trx = db) {
  return trx("ordens_servico")
    .leftJoin("clientes", "clientes.id", "ordens_servico.cliente_id")
    .leftJoin("motocicletas", "motocicletas.id", "ordens_servico.motocicleta_id")
    .leftJoin("usuarios", "usuarios.id", "ordens_servico.usuario_abertura_id")
    .select(
      "ordens_servico.*",
      "clientes.nome as cliente_nome",
      "clientes.cpf as cliente_cpf",
      "clientes.telefone as cliente_telefone",
      "motocicletas.marca as motocicleta_marca",
      "motocicletas.modelo as motocicleta_modelo",
      "motocicletas.ano as motocicleta_ano",
      "motocicletas.cor as motocicleta_cor",
      "motocicletas.placa as motocicleta_placa",
      "usuarios.nome as usuario_abertura_nome",
      trx.raw(`(
        SELECT COUNT(*)
        FROM fotos_entrada
        WHERE fotos_entrada.ordem_servico_id = ordens_servico.id
          AND fotos_entrada.excluido_em IS NULL
      ) as fotos_entrada_count`),
    );
}

function applyOperationalOrdering(query) {
  query
    .orderByRaw(`
      CASE ordens_servico.prioridade_agregada
        WHEN 'URGENTE' THEN 0
        WHEN 'ALTA' THEN 1
        ELSE 2
      END ASC
    `)
    .orderByRaw("CASE WHEN ordens_servico.data_prometida IS NULL THEN 1 ELSE 0 END ASC")
    .orderBy("ordens_servico.data_prometida", "asc")
    .orderBy("ordens_servico.aberta_em", "desc")
    .orderBy("ordens_servico.id", "desc");
}

async function findById(id, trx = db) {
  return baseSelect(trx).where("ordens_servico.id", id).first();
}

async function list(filters = {}, trx = db) {
  const query = baseSelect(trx);

  if (filters.clienteId) {
    query.where("ordens_servico.cliente_id", filters.clienteId);
  }

  if (filters.motocicletaId) {
    query.where("ordens_servico.motocicleta_id", filters.motocicletaId);
  }

  if (filters.numeroOs) {
    query.where("ordens_servico.numero_os", "like", `%${filters.numeroOs}%`);
  }

  if (filters.statusGeral) {
    query.where("ordens_servico.status_geral", filters.statusGeral);
  }

  applyOperationalOrdering(query);

  return query;
}

async function listRecent(limit = 30, trx = db) {
  const query = baseSelect(trx)
    .whereNotIn("ordens_servico.status_geral", ["PRONTA_PARA_RETIRADA", "FINALIZADA", "ARQUIVADA", "CANCELADA"])
    .limit(limit);
  applyOperationalOrdering(query);
  return query;
}

async function listByMotocicletaId(motocicletaId, trx = db) {
  return baseSelect(trx)
    .where("ordens_servico.motocicleta_id", motocicletaId)
    .orderBy("ordens_servico.aberta_em", "desc")
    .orderBy("ordens_servico.id", "desc");
}

async function findActiveByMotocicletaId(motocicletaId, trx = db) {
  return baseSelect(trx)
    .where("ordens_servico.motocicleta_id", motocicletaId)
    .whereNotIn("ordens_servico.status_geral", ["PRONTA_PARA_RETIRADA", "FINALIZADA", "ARQUIVADA", "CANCELADA"])
    .orderBy("ordens_servico.aberta_em", "desc")
    .orderBy("ordens_servico.id", "desc")
    .first();
}

async function insert(trx, payload) {
  const [id] = await trx("ordens_servico").insert({
    numero_os: payload.numeroOs,
    cliente_id: payload.clienteId,
    motocicleta_id: payload.motocicletaId,
    usuario_abertura_id: payload.usuarioAberturaId,
    queixa_principal: payload.queixaPrincipal,
    observacoes_entrada: payload.observacoesEntrada,
    observacoes_internas: payload.observacoesInternas,
    data_prometida: payload.dataPrometida,
    prioridade_agregada: payload.prioridadeAgregada,
    status_geral: payload.statusGeral,
    km_entrada: payload.kmEntrada,
    buscar_moto: payload.buscarMoto,
    endereco_retirada: payload.enderecoRetirada,
    cadastro_fotos_finalizado: payload.cadastroFotosFinalizado ?? false,
    legado_atendimento_id: payload.legadoAtendimentoId || null,
    aberta_em: payload.abertaEm || db.fn.now(),
    criado_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });

  return findById(id, trx);
}

async function updateFields(trx, id, fields) {
  await trx("ordens_servico")
    .where({ id })
    .update({
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
  await trx("controle_sequencias_os")
    .where({ ano: year })
    .update({
      ultimo_numero: ultimoNumero,
      atualizado_em: db.fn.now(),
    });
}

module.exports = {
  findById,
  list,
  listByMotocicletaId,
  findActiveByMotocicletaId,
  listRecent,
  insert,
  updateFields,
  getSequenceRowForYear,
  insertSequenceRow,
  updateSequenceRow,
};
