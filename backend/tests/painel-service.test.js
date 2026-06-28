const test = require("node:test");
const assert = require("node:assert/strict");
const painelService = require("../src/services/painelService");
const atendimentoRepository = require("../src/repositories/atendimentoRepository");

const originalRepository = {
  list: atendimentoRepository.list,
  listFila: atendimentoRepository.listFila,
  listRecentFinalizados: atendimentoRepository.listRecentFinalizados,
};

test.afterEach(() => {
  atendimentoRepository.list = originalRepository.list;
  atendimentoRepository.listFila = originalRepository.listFila;
  atendimentoRepository.listRecentFinalizados = originalRepository.listRecentFinalizados;
});

test("painelService.getPainelClientes returns sanitized public data", async () => {
  atendimentoRepository.list = async () => [
    {
      id: 1,
      numero_os: "OS-2026-000001",
      cliente_nome: "Marcia",
      cliente_cpf: "12345678909",
      cliente_telefone: "11999999999",
      motocicleta_modelo: "CG 160",
      mecanico_nome: "Rafael",
      mecanico_foto_url: "/uploads/mecanicos/rafael.webp",
      status: "PODE_RETIRAR",
      situacao_pagamento: "PAGO",
      observacoes_internas: "Nao expor",
      entrada_em: new Date(),
    },
  ];
  atendimentoRepository.listRecentFinalizados = async () => [];

  const result = await painelService.getPainelClientes();

  assert.equal(result.pode_retirar.length, 1);
  assert.equal(result.pode_retirar[0].cliente_cpf, undefined);
  assert.equal(result.pode_retirar[0].situacao_pagamento, undefined);
  assert.equal(result.pode_retirar[0].status_publico, "Pode retirar");
});

test("painelService.getPainelOficina highlights payment only when needed", async () => {
  atendimentoRepository.listFila = async () => [];
  atendimentoRepository.list = async () => [
    {
      id: 2,
      numero_os: "OS-2026-000002",
      cliente_nome: "Bruno",
      motocicleta_modelo: "Fazer 250",
      motocicleta_placa: "ABC1234",
      mecanico_nome: "Joao",
      mecanico_foto_url: "/uploads/mecanicos/joao.webp",
      problema_servico: "Revisao",
      status: "SERVICO_CONCLUIDO",
      situacao_pagamento: "PENDENTE",
      entrada_em: new Date(),
    },
  ];
  atendimentoRepository.listRecentFinalizados = async () => [];

  const result = await painelService.getPainelOficina();

  assert.equal(result.em_servico.length, 1);
  assert.equal(result.em_servico[0].situacao_pagamento, "PENDENTE");
});
