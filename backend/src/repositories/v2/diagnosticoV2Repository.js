const db = require("../../database/connection");

async function findById(id, trx = db) {
  return trx("diagnosticos")
    .leftJoin("mecanicos", "mecanicos.id", "diagnosticos.mecanico_principal_id")
    .select(
      "diagnosticos.*",
      "mecanicos.nome as mecanico_principal_nome",
    )
    .where("diagnosticos.id", id)
    .first();
}

async function listByOrdemServicoId(ordemServicoId, trx = db) {
  return trx("diagnosticos")
    .leftJoin("mecanicos", "mecanicos.id", "diagnosticos.mecanico_principal_id")
    .select(
      "diagnosticos.*",
      "mecanicos.nome as mecanico_principal_nome",
    )
    .where("diagnosticos.ordem_servico_id", ordemServicoId)
    .orderBy("diagnosticos.id", "asc");
}

async function insert(trx, payload) {
  const [id] = await trx("diagnosticos").insert({
    ordem_servico_id: payload.ordemServicoId,
    item_diagnostico_id: payload.itemDiagnosticoId || null,
    mecanico_principal_id: payload.mecanicoPrincipalId || null,
    queixa_avaliada: payload.queixaAvaliada,
    causa_identificada: payload.causaIdentificada || null,
    descricao_tecnica: payload.descricaoTecnica || null,
    servicos_sugeridos_resumo: payload.servicosSugeridosResumo || null,
    pecas_sugeridas_resumo: payload.pecasSugeridasResumo || null,
    observacoes: payload.observacoes || null,
    status_diagnostico: payload.statusDiagnostico || "ABERTO",
    iniciado_em: payload.iniciadoEm || null,
    concluido_em: payload.concluidoEm || null,
    enviado_orcamentista_em: payload.enviadoOrcamentistaEm || null,
    criado_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });

  return findById(id, trx);
}

async function updateFields(trx, id, fields) {
  await trx("diagnosticos")
    .where({ id })
    .update({
      ...fields,
      atualizado_em: db.fn.now(),
    });

  return findById(id, trx);
}

module.exports = {
  findById,
  listByOrdemServicoId,
  insert,
  updateFields,
};
