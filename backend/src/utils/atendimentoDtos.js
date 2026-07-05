const publicStatusMap = {
  AGUARDANDO: "Na fila",
  EM_SERVICO: "Em servico",
  AGUARDANDO_PECAS: "Aguardando pecas",
  SAIDA_PARA_TESTE: "Saida para teste",
  SERVICO_CONCLUIDO: "Servico concluido",
  PODE_RETIRAR: "Pode retirar",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

function buildBaseDto(atendimento) {
  return {
    id: atendimento.id,
    numero_os: atendimento.numero_os,
    cliente_id: atendimento.cliente_id,
    cliente_nome: atendimento.cliente_nome,
    motocicleta_id: atendimento.motocicleta_id,
    motocicleta_marca: atendimento.motocicleta_marca,
    motocicleta_modelo: atendimento.motocicleta_modelo,
    motocicleta_placa: atendimento.motocicleta_placa,
    motocicleta_cor: atendimento.motocicleta_cor,
    mecanico_id: atendimento.mecanico_id,
    mecanico_nome: atendimento.mecanico_nome,
    mecanico_foto_url: atendimento.mecanico_foto_url,
    problema_servico: atendimento.problema_servico,
    servico_executado: atendimento.servico_executado,
    observacoes: atendimento.observacoes,
    status: atendimento.status,
    situacao_pagamento: atendimento.situacao_pagamento,
    entrada_em: atendimento.entrada_em,
    assumido_em: atendimento.assumido_em,
    servico_concluido_em: atendimento.servico_concluido_em,
    liberado_retirada_em: atendimento.liberado_retirada_em,
    retirada_confirmada_em: atendimento.retirada_confirmada_em,
    finalizado_em: atendimento.finalizado_em,
    cancelado_em: atendimento.cancelado_em,
    criado_em: atendimento.criado_em,
    atualizado_em: atendimento.atualizado_em,
  };
}

function toAtendimentoAdminDto(atendimento) {
  return {
    ...buildBaseDto(atendimento),
    cliente_telefone: atendimento.cliente_telefone,
    cliente_cpf: atendimento.cliente_cpf,
    observacoes_internas: atendimento.observacoes_internas,
    pagamento_confirmado_em: atendimento.pagamento_confirmado_em,
    pagamento_confirmado_por: atendimento.pagamento_confirmado_por,
    ordem_fila: atendimento.ordem_fila,
    criado_por: atendimento.criado_por,
  };
}

function toAtendimentoOficinaDto(atendimento) {
  return {
    ...buildBaseDto(atendimento),
    observacoes_internas: atendimento.observacoes_internas,
  };
}

function toPainelOficinaDto(atendimento) {
  return {
    id: atendimento.id,
    numero_os: atendimento.numero_os,
    cliente_nome: atendimento.cliente_nome,
    motocicleta_modelo: atendimento.motocicleta_modelo,
    motocicleta_placa: atendimento.motocicleta_placa,
    mecanico_nome: atendimento.mecanico_nome,
    mecanico_foto_url: atendimento.mecanico_foto_url,
    problema_servico: atendimento.problema_servico,
    status: atendimento.status,
    situacao_pagamento:
      atendimento.status === "SERVICO_CONCLUIDO" || atendimento.status === "PODE_RETIRAR"
        ? atendimento.situacao_pagamento
        : undefined,
    entrada_em: atendimento.entrada_em,
    finalizado_em: atendimento.finalizado_em,
  };
}

function toPainelClientesDto(atendimento) {
  return {
    id: atendimento.id,
    numero_os: atendimento.numero_os,
    cliente_nome: atendimento.cliente_nome,
    motocicleta_modelo: atendimento.motocicleta_modelo,
    mecanico_nome: atendimento.mecanico_nome,
    mecanico_foto_url: atendimento.mecanico_foto_url,
    status: atendimento.status,
    status_publico: publicStatusMap[atendimento.status] || atendimento.status,
    entrada_em: atendimento.entrada_em,
    liberado_retirada_em: atendimento.liberado_retirada_em,
    finalizado_em: atendimento.finalizado_em,
  };
}

function mapAtendimentoByPerfil(atendimento, perfil) {
  if (normalizeRole(perfil) === "OFICINA") {
    return toAtendimentoOficinaDto(atendimento);
  }

  return toAtendimentoAdminDto(atendimento);
}

module.exports = {
  mapAtendimentoByPerfil,
  toPainelOficinaDto,
  toPainelClientesDto,
};
const { normalizeRole } = require("./roles");
