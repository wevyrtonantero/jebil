const test = require("node:test");
const assert = require("node:assert/strict");
const motocicletaService = require("../src/services/motocicletaService");
const motocicletaRepository = require("../src/repositories/motocicletaRepository");
const clienteRepository = require("../src/repositories/clienteRepository");

const originalMotocicletaRepository = {
  list: motocicletaRepository.list,
  findById: motocicletaRepository.findById,
  findByClienteId: motocicletaRepository.findByClienteId,
  findByPlacaNormalizada: motocicletaRepository.findByPlacaNormalizada,
  findActiveByPlacaNormalizada: motocicletaRepository.findActiveByPlacaNormalizada,
  insert: motocicletaRepository.insert,
  update: motocicletaRepository.update,
  updateStatus: motocicletaRepository.updateStatus,
};

const originalClienteRepository = {
  findById: clienteRepository.findById,
};

test.afterEach(() => {
  motocicletaRepository.list = originalMotocicletaRepository.list;
  motocicletaRepository.findById = originalMotocicletaRepository.findById;
  motocicletaRepository.findByClienteId = originalMotocicletaRepository.findByClienteId;
  motocicletaRepository.findByPlacaNormalizada = originalMotocicletaRepository.findByPlacaNormalizada;
  motocicletaRepository.findActiveByPlacaNormalizada = originalMotocicletaRepository.findActiveByPlacaNormalizada;
  motocicletaRepository.insert = originalMotocicletaRepository.insert;
  motocicletaRepository.update = originalMotocicletaRepository.update;
  motocicletaRepository.updateStatus = originalMotocicletaRepository.updateStatus;
  clienteRepository.findById = originalClienteRepository.findById;
});

test("motocicletaService.createMotocicleta suggests reactivation for inactive plate", async () => {
  clienteRepository.findById = async () => ({ id: 1, nome: "Cliente", ativo: true });
  motocicletaRepository.findByPlacaNormalizada = async () => ({
    id: 15,
    ativo: false,
  });

  await assert.rejects(
    motocicletaService.createMotocicleta({
      clienteId: 1,
      marca: "Honda",
      modelo: "CG 160",
      cor: "Preta",
      placa: "ABC-1234",
      placaNormalizada: "ABC1234",
      km: 1000,
      observacoes: null,
    }),
    (error) => error.statusCode === 409 && error.details.canReactivate === true,
  );
});

test("motocicletaService.listMotocicletasByClienteId requires existing client", async () => {
  clienteRepository.findById = async () => null;

  await assert.rejects(
    motocicletaService.listMotocicletasByClienteId(999),
    /cliente informado nao foi encontrado/i,
  );
});
