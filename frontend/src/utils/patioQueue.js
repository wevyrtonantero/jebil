function parseQueueDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function isQuickServiceOrder(ordem) {
  if (ordem?.legado_atendimento_id) {
    return true;
  }

  const validItems = (ordem?.items || []).filter((item) => item.status_item !== "CANCELADO");
  return (
    !String(ordem?.queixa_principal || "").trim() &&
    validItems.length > 0 &&
    validItems.every((item) => item.execucao_direta && !item.exige_diagnostico)
  );
}

function isAwaitingAuthorization(ordem) {
  const latestBudget = [...(ordem.orcamentos || [])].sort((left, right) => Number(right.id) - Number(left.id))[0] || null;
  const hasWaitingItem = (ordem.items || []).some((item) =>
    ["AGUARDANDO_AUTORIZACAO", "AGUARDANDO_ORCAMENTO"].includes(item.status_item),
  );

  return hasWaitingItem && ["RASCUNHO", "PENDENTE_ENVIO", "ENVIADO", "PARCIAL"].includes(latestBudget?.status_orcamento || "RASCUNHO");
}

function selectPatioQueue(ordens = []) {
  return ordens.filter((ordem) => {
    const items = ordem.items || [];

    return (
      !isQuickServiceOrder(ordem) &&
      Boolean(ordem.cadastro_fotos_finalizado) &&
      !items.some((item) => ["AGUARDANDO_DIAGNOSTICO", "EM_DIAGNOSTICO"].includes(item.status_item)) &&
      !items.some((item) => item.status_item === "AGUARDANDO_PECA") &&
      !isAwaitingAuthorization(ordem) &&
      items.some((item) => item.status_item === "PRONTO_PARA_EXECUTAR")
    );
  });
}

function sortPatioQueue(ordens = []) {
  return [...ordens].sort((left, right) => {
    const leftPosition = left.ordem_patio == null ? Number.MAX_SAFE_INTEGER : Number(left.ordem_patio);
    const rightPosition = right.ordem_patio == null ? Number.MAX_SAFE_INTEGER : Number(right.ordem_patio);

    return (
      leftPosition - rightPosition ||
      parseQueueDate(left.aberta_em) - parseQueueDate(right.aberta_em) ||
      Number(left.id) - Number(right.id)
    );
  });
}

export { selectPatioQueue, sortPatioQueue };
