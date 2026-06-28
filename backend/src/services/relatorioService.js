const atendimentoRepository = require("../repositories/atendimentoRepository");
const { mapAtendimentoByPerfil } = require("../utils/atendimentoDtos");

function resolveDateRange(filters) {
  if (filters.dia) {
    return {
      startDate: filters.dia,
      endDate: filters.dia,
    };
  }

  if (filters.mes) {
    const [year, month] = filters.mes.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    };
  }

  return {
    startDate: filters.dataInicio,
    endDate: filters.dataFim,
  };
}

async function gerarRelatorio(filters, currentUser) {
  const dateRange = resolveDateRange(filters);
  const atendimentos = await atendimentoRepository.list({
    status: filters.status,
    mecanicoId: filters.mecanicoId,
    situacaoPagamento: filters.situacaoPagamento,
    numeroOs: filters.numeroOs,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  return atendimentos.map((item) => mapAtendimentoByPerfil(item, currentUser.perfil));
}

module.exports = {
  gerarRelatorio,
};
