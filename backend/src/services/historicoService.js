const db = require("../database/connection");

async function registrarHistorico(trx, payload) {
  await trx("historico_atendimentos").insert({
    atendimento_id: payload.atendimentoId,
    usuario_id: payload.usuarioId || null,
    mecanico_id: payload.mecanicoId || null,
    acao: payload.acao,
    status_anterior: payload.statusAnterior || null,
    status_novo: payload.statusNovo || null,
    observacao: payload.observacao || null,
    criado_em: db.fn.now(),
  });
}

module.exports = {
  registrarHistorico,
};
