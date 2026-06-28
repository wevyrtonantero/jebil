const test = require("node:test");
const assert = require("node:assert/strict");
const relatorioService = require("../src/services/relatorioService");
const atendimentoRepository = require("../src/repositories/atendimentoRepository");

const originalList = atendimentoRepository.list;

test.afterEach(() => {
  atendimentoRepository.list = originalList;
});

test("relatorioService.gerarRelatorio resolves monthly range and preserves admin fields", async () => {
  let receivedFilters = null;
  atendimentoRepository.list = async (filters) => {
    receivedFilters = filters;
    return [
      {
        id: 3,
        numero_os: "OS-2026-000003",
        cliente_id: 1,
        cliente_nome: "Diego",
        cliente_telefone: "11999999999",
        cliente_cpf: "12345678909",
        motocicleta_id: 1,
        motocicleta_marca: "Honda",
        motocicleta_modelo: "Biz",
        motocicleta_placa: "AAA1111",
        motocicleta_cor: "Preta",
        mecanico_id: 5,
        mecanico_nome: "Carlos",
        mecanico_foto_url: null,
        problema_servico: "Freio",
        observacoes: null,
        observacoes_internas: "Cliente aguarda",
        status: "EM_SERVICO",
        situacao_pagamento: "PENDENTE",
        entrada_em: new Date(),
        criado_em: new Date(),
        atualizado_em: new Date(),
      },
    ];
  };

  const result = await relatorioService.gerarRelatorio({ mes: "2026-06" }, { perfil: "ADMIN" });

  assert.equal(receivedFilters.startDate, "2026-06-01");
  assert.equal(receivedFilters.endDate, "2026-06-30");
  assert.equal(result[0].cliente_cpf, "12345678909");
  assert.equal(result[0].observacoes_internas, "Cliente aguarda");
});

test("relatorioService.gerarRelatorio hides sensitive fields for oficina profile", async () => {
  atendimentoRepository.list = async () => [
    {
      id: 4,
      numero_os: "OS-2026-000004",
      cliente_id: 1,
      cliente_nome: "Aline",
      cliente_telefone: "11888888888",
      cliente_cpf: "98765432100",
      motocicleta_id: 1,
      motocicleta_marca: "Yamaha",
      motocicleta_modelo: "Lander",
      motocicleta_placa: "BBB2222",
      motocicleta_cor: "Azul",
      mecanico_id: 8,
      mecanico_nome: "Tiago",
      mecanico_foto_url: null,
      problema_servico: "Suspensao",
      observacoes: null,
      observacoes_internas: "Uso interno",
      status: "EM_SERVICO",
      situacao_pagamento: "PAGO",
      entrada_em: new Date(),
      criado_em: new Date(),
      atualizado_em: new Date(),
    },
  ];

  const result = await relatorioService.gerarRelatorio({ dia: "2026-06-20" }, { perfil: "OFICINA" });

  assert.equal(result[0].cliente_cpf, undefined);
  assert.equal(result[0].cliente_telefone, undefined);
  assert.equal(result[0].observacoes_internas, "Uso interno");
});
