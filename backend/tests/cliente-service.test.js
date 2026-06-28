const test = require("node:test");
const assert = require("node:assert/strict");
const clienteService = require("../src/services/clienteService");
const clienteRepository = require("../src/repositories/clienteRepository");

const originalRepository = {
  list: clienteRepository.list,
  findById: clienteRepository.findById,
  findByCpfNormalizado: clienteRepository.findByCpfNormalizado,
  insert: clienteRepository.insert,
  update: clienteRepository.update,
  updateStatus: clienteRepository.updateStatus,
};

test.afterEach(() => {
  clienteRepository.list = originalRepository.list;
  clienteRepository.findById = originalRepository.findById;
  clienteRepository.findByCpfNormalizado = originalRepository.findByCpfNormalizado;
  clienteRepository.insert = originalRepository.insert;
  clienteRepository.update = originalRepository.update;
  clienteRepository.updateStatus = originalRepository.updateStatus;
});

test("clienteService.createCliente suggests reactivation for inactive CPF", async () => {
  clienteRepository.findByCpfNormalizado = async () => ({
    id: 9,
    ativo: false,
  });

  await assert.rejects(
    clienteService.createCliente({
      nome: "Jose",
      telefone: "11999999999",
      cpf: "123.456.789-09",
      cpfNormalizado: "12345678909",
      observacoes: null,
    }),
    (error) => error.statusCode === 409 && error.details.canReactivate === true,
  );
});

test("clienteService.listClientes returns pagination meta", async () => {
  clienteRepository.list = async () => ({
    rows: [
      {
        id: 1,
        nome: "Ana",
        telefone: "11999999999",
        cpf: "123.456.789-09",
        observacoes: null,
        ativo: 1,
        criado_em: new Date(),
        atualizado_em: new Date(),
      },
    ],
    total: 1,
  });

  const result = await clienteService.listClientes({ page: "1", limit: "10" });

  assert.equal(result.rows.length, 1);
  assert.equal(result.meta.total, 1);
});
