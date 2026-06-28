const operationalTransitions = {
  EM_SERVICO: new Set(["AGUARDANDO_PECAS", "SAIDA_PARA_TESTE"]),
  AGUARDANDO_PECAS: new Set(["EM_SERVICO", "SAIDA_PARA_TESTE"]),
  SAIDA_PARA_TESTE: new Set(["EM_SERVICO", "AGUARDANDO_PECAS"]),
};

const activeServiceStatuses = new Set(["EM_SERVICO", "AGUARDANDO_PECAS", "SAIDA_PARA_TESTE"]);

function canTransitionOperationalStatus(fromStatus, toStatus) {
  return operationalTransitions[fromStatus]?.has(toStatus) || false;
}

module.exports = {
  activeServiceStatuses,
  canTransitionOperationalStatus,
};
