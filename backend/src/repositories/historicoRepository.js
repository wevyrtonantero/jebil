const db = require("../database/connection");

async function listByAtendimentoId(atendimentoId) {
  return db("historico_atendimentos")
    .leftJoin("usuarios", "usuarios.id", "historico_atendimentos.usuario_id")
    .leftJoin("mecanicos", "mecanicos.id", "historico_atendimentos.mecanico_id")
    .select(
      "historico_atendimentos.id",
      "historico_atendimentos.atendimento_id",
      "historico_atendimentos.acao",
      "historico_atendimentos.status_anterior",
      "historico_atendimentos.status_novo",
      "historico_atendimentos.observacao",
      "historico_atendimentos.criado_em",
      "usuarios.id as usuario_id",
      "usuarios.nome as usuario_nome",
      "mecanicos.id as mecanico_id",
      "mecanicos.nome as mecanico_nome",
    )
    .where("historico_atendimentos.atendimento_id", atendimentoId)
    .orderBy("historico_atendimentos.criado_em", "asc")
    .orderBy("historico_atendimentos.id", "asc");
}

module.exports = {
  listByAtendimentoId,
};
