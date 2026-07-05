const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canTransitionItemStatus,
  deriveOrdemServicoStatus,
  derivePrioridadeAgregada,
  perfisUsuarioV2,
  resolveInitialItemStatus,
} = require("../src/utils/ordemServicoV2Rules");

test("ordemServicoV2Rules exposes SUPERVISAO among valid profiles", () => {
  assert.equal(perfisUsuarioV2.includes("SUPERVISAO"), true);
});

test("resolveInitialItemStatus sends authorized direct execution items straight to execution queue", () => {
  const status = resolveInitialItemStatus({
    execucaoDireta: true,
    exigeDiagnostico: false,
    autorizacaoStatus: "AUTORIZADO",
  });

  assert.equal(status, "PRONTO_PARA_EXECUTAR");
});

test("resolveInitialItemStatus keeps unauthorized direct execution items awaiting approval", () => {
  const status = resolveInitialItemStatus({
    execucaoDireta: true,
    exigeDiagnostico: false,
    autorizacaoStatus: "AGUARDANDO_RESPOSTA",
  });

  assert.equal(status, "AGUARDANDO_AUTORIZACAO");
});

test("resolveInitialItemStatus sends diagnostic items to diagnostic queue", () => {
  const status = resolveInitialItemStatus({
    execucaoDireta: false,
    exigeDiagnostico: true,
    autorizacaoStatus: "AGUARDANDO_RESPOSTA",
  });

  assert.equal(status, "AGUARDANDO_DIAGNOSTICO");
});

test("canTransitionItemStatus enforces execution flow transitions", () => {
  assert.equal(canTransitionItemStatus("PRONTO_PARA_EXECUTAR", "EM_EXECUCAO"), true);
  assert.equal(canTransitionItemStatus("PRONTO_PARA_EXECUTAR", "CONCLUIDO"), false);
  assert.equal(canTransitionItemStatus("CANCELADO", "SOLICITADO"), false);
});

test("derivePrioridadeAgregada returns the highest active priority", () => {
  const prioridade = derivePrioridadeAgregada([
    { prioridade: "NORMAL" },
    { prioridade: "URGENTE" },
    { prioridade: "ALTA" },
  ]);

  assert.equal(prioridade, "URGENTE");
});

test("deriveOrdemServicoStatus prefers execution over lower-precedence states", () => {
  const status = deriveOrdemServicoStatus([
    { statusItem: "AGUARDANDO_PECA" },
    { statusItem: "EM_EXECUCAO" },
    { statusItem: "AGUARDANDO_AUTORIZACAO" },
  ]);

  assert.equal(status, "EM_EXECUCAO");
});

test("deriveOrdemServicoStatus marks partially completed orders when there is mixed completion", () => {
  const status = deriveOrdemServicoStatus([
    { statusItem: "CONCLUIDO" },
    { statusItem: "PRONTO_PARA_EXECUTAR" },
  ]);

  assert.equal(status, "PARCIALMENTE_CONCLUIDA");
});

test("deriveOrdemServicoStatus marks completed active orders as ready for pickup", () => {
  const status = deriveOrdemServicoStatus([
    { statusItem: "CONCLUIDO" },
    { statusItem: "CONCLUIDO" },
  ]);

  assert.equal(status, "PRONTA_PARA_RETIRADA");
});
