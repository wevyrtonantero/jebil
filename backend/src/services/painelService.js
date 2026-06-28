const atendimentoRepository = require("../repositories/atendimentoRepository");
const { toPainelClientesDto, toPainelOficinaDto } = require("../utils/atendimentoDtos");

async function getPainelOficina() {
  const [fila, ativos, finalizados] = await Promise.all([
    atendimentoRepository.listFila(),
    atendimentoRepository.list({
      statuses: ["EM_SERVICO", "AGUARDANDO_PECAS", "SAIDA_PARA_TESTE", "PODE_RETIRAR"],
    }),
    atendimentoRepository.listRecentFinalizados(5),
  ]);

  return {
    fila: fila.map(toPainelOficinaDto),
    em_servico: ativos.filter((item) => item.status !== "PODE_RETIRAR").map(toPainelOficinaDto),
    pode_retirar: ativos.filter((item) => item.status === "PODE_RETIRAR").map(toPainelOficinaDto),
    ultimos_finalizados: finalizados.map(toPainelOficinaDto),
    atualizado_em: new Date().toISOString(),
  };
}

async function getPainelClientes() {
  const [ativos, finalizados] = await Promise.all([
    atendimentoRepository.list({
      statuses: ["AGUARDANDO", "EM_SERVICO", "AGUARDANDO_PECAS", "SAIDA_PARA_TESTE", "PODE_RETIRAR"],
    }),
    atendimentoRepository.listRecentFinalizados(3),
  ]);

  return {
    fila: ativos.filter((item) => item.status === "AGUARDANDO").map(toPainelClientesDto),
    em_andamento: ativos.filter((item) => ["EM_SERVICO", "AGUARDANDO_PECAS", "SAIDA_PARA_TESTE"].includes(item.status)).map(toPainelClientesDto),
    pode_retirar: ativos.filter((item) => item.status === "PODE_RETIRAR").map(toPainelClientesDto),
    ultimos_finalizados: finalizados.map(toPainelClientesDto),
    atualizado_em: new Date().toISOString(),
  };
}

module.exports = {
  getPainelOficina,
  getPainelClientes,
};
