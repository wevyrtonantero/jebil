const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const usuarioRepository = require("../src/repositories/usuarioRepository");
const clienteRepository = require("../src/repositories/clienteRepository");
const atendimentoRepository = require("../src/repositories/atendimentoRepository");
const ordemServicoV2Service = require("../src/services/v2/ordemServicoV2Service");
const bcrypt = require("bcryptjs");
const { signAccessToken } = require("../src/config/jwt");
const { ApiError } = require("../src/utils/ApiError");

const originalUsuarioRepository = {
  findByEmail: usuarioRepository.findByEmail,
  findById: usuarioRepository.findById,
  updateLastLogin: usuarioRepository.updateLastLogin,
};

const originalClienteRepository = {
  list: clienteRepository.list,
};

const originalAtendimentoRepository = {
  list: atendimentoRepository.list,
  listFila: atendimentoRepository.listFila,
  listRecentFinalizados: atendimentoRepository.listRecentFinalizados,
};

const originalOrdemServicoV2Service = {
  listOrdensServico: ordemServicoV2Service.listOrdensServico,
  getOrdemServicoById: ordemServicoV2Service.getOrdemServicoById,
  createOrdemServicoDraft: ordemServicoV2Service.createOrdemServicoDraft,
  addFotosEntrada: ordemServicoV2Service.addFotosEntrada,
  registrarAssinaturaRecebimento: ordemServicoV2Service.registrarAssinaturaRecebimento,
  generateAssinaturaRecebimentoPdf: ordemServicoV2Service.generateAssinaturaRecebimentoPdf,
  registrarComunicacaoWhatsApp: ordemServicoV2Service.registrarComunicacaoWhatsApp,
  createOrcamento: ordemServicoV2Service.createOrcamento,
  updateOrcamentoStatus: ordemServicoV2Service.updateOrcamentoStatus,
  uploadOrcamentoPdf: ordemServicoV2Service.uploadOrcamentoPdf,
  registrarPrevisaoPeca: ordemServicoV2Service.registrarPrevisaoPeca,
  retomarItemDaPeca: ordemServicoV2Service.retomarItemDaPeca,
  atribuirExecucao: ordemServicoV2Service.atribuirExecucao,
  updateItemStatus: ordemServicoV2Service.updateItemStatus,
  updateItemAutorizacao: ordemServicoV2Service.updateItemAutorizacao,
  updateItemPagamento: ordemServicoV2Service.updateItemPagamento,
  createDiagnostico: ordemServicoV2Service.createDiagnostico,
  concluirDiagnostico: ordemServicoV2Service.concluirDiagnostico,
  adicionarItensSugeridosDiagnostico: ordemServicoV2Service.adicionarItensSugeridosDiagnostico,
  getProntuarioByMotocicletaId: ordemServicoV2Service.getProntuarioByMotocicletaId,
  listOperacional: ordemServicoV2Service.listOperacional,
  reordenarControlePatio: ordemServicoV2Service.reordenarControlePatio,
};

test.afterEach(() => {
  usuarioRepository.findByEmail = originalUsuarioRepository.findByEmail;
  usuarioRepository.findById = originalUsuarioRepository.findById;
  usuarioRepository.updateLastLogin = originalUsuarioRepository.updateLastLogin;
  clienteRepository.list = originalClienteRepository.list;
  atendimentoRepository.list = originalAtendimentoRepository.list;
  atendimentoRepository.listFila = originalAtendimentoRepository.listFila;
  atendimentoRepository.listRecentFinalizados = originalAtendimentoRepository.listRecentFinalizados;
  ordemServicoV2Service.listOrdensServico = originalOrdemServicoV2Service.listOrdensServico;
  ordemServicoV2Service.getOrdemServicoById = originalOrdemServicoV2Service.getOrdemServicoById;
  ordemServicoV2Service.createOrdemServicoDraft = originalOrdemServicoV2Service.createOrdemServicoDraft;
  ordemServicoV2Service.addFotosEntrada = originalOrdemServicoV2Service.addFotosEntrada;
  ordemServicoV2Service.registrarAssinaturaRecebimento = originalOrdemServicoV2Service.registrarAssinaturaRecebimento;
  ordemServicoV2Service.generateAssinaturaRecebimentoPdf = originalOrdemServicoV2Service.generateAssinaturaRecebimentoPdf;
  ordemServicoV2Service.registrarComunicacaoWhatsApp = originalOrdemServicoV2Service.registrarComunicacaoWhatsApp;
  ordemServicoV2Service.createOrcamento = originalOrdemServicoV2Service.createOrcamento;
  ordemServicoV2Service.updateOrcamentoStatus = originalOrdemServicoV2Service.updateOrcamentoStatus;
  ordemServicoV2Service.uploadOrcamentoPdf = originalOrdemServicoV2Service.uploadOrcamentoPdf;
  ordemServicoV2Service.registrarPrevisaoPeca = originalOrdemServicoV2Service.registrarPrevisaoPeca;
  ordemServicoV2Service.retomarItemDaPeca = originalOrdemServicoV2Service.retomarItemDaPeca;
  ordemServicoV2Service.atribuirExecucao = originalOrdemServicoV2Service.atribuirExecucao;
  ordemServicoV2Service.updateItemStatus = originalOrdemServicoV2Service.updateItemStatus;
  ordemServicoV2Service.updateItemAutorizacao = originalOrdemServicoV2Service.updateItemAutorizacao;
  ordemServicoV2Service.updateItemPagamento = originalOrdemServicoV2Service.updateItemPagamento;
  ordemServicoV2Service.createDiagnostico = originalOrdemServicoV2Service.createDiagnostico;
  ordemServicoV2Service.concluirDiagnostico = originalOrdemServicoV2Service.concluirDiagnostico;
  ordemServicoV2Service.adicionarItensSugeridosDiagnostico = originalOrdemServicoV2Service.adicionarItensSugeridosDiagnostico;
  ordemServicoV2Service.getProntuarioByMotocicletaId = originalOrdemServicoV2Service.getProntuarioByMotocicletaId;
  ordemServicoV2Service.listOperacional = originalOrdemServicoV2Service.listOperacional;
  ordemServicoV2Service.reordenarControlePatio = originalOrdemServicoV2Service.reordenarControlePatio;
});

test("GET /api/health returns expected payload", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    service: "jebil-backend",
  });
});

test("POST /api/auth/login returns token on valid credentials", async () => {
  const senhaHash = await bcrypt.hash("senha123", 10);
  const user = {
    id: 1,
    nome: "Admin",
    email: "admin@jebil.local",
    senha_hash: senhaHash,
    perfil: "ADMIN",
    ativo: true,
    ultimo_login_em: null,
    criado_em: new Date(),
    atualizado_em: new Date(),
  };

  usuarioRepository.findByEmail = async () => user;
  usuarioRepository.updateLastLogin = async () => {};
  usuarioRepository.findById = async () => user;

  const response = await request(app).post("/api/auth/login").send({
    email: "admin@jebil.local",
    senha: "senha123",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(typeof response.body.data.accessToken, "string");
});

test("GET /api/clientes allows OFICINA profile", async () => {
  const token = signAccessToken({
    sub: 7,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 7,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  clienteRepository.list = async () => ({
    rows: [],
    total: 0,
  });

  const response = await request(app)
    .get("/api/clientes")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("GET /api/clientes returns paginated payload for recepcao", async () => {
  const token = signAccessToken({
    sub: 8,
    perfil: "RECEPCAO",
    email: "recepcao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 8,
    nome: "Recepcao",
    email: "recepcao@jebil.local",
    perfil: "RECEPCAO",
    ativo: true,
  });

  clienteRepository.list = async () => ({
    rows: [
      {
        id: 1,
        nome: "Carlos",
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

  const response = await request(app)
    .get("/api/clientes")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.total, 1);
});

test("GET /api/clientes denies OPERACAO profile", async () => {
  const token = signAccessToken({
    sub: 18,
    perfil: "OPERACAO",
    email: "operacaoo",
  });

  usuarioRepository.findById = async () => ({
    id: 18,
    nome: "Operacao",
    email: "operacaoo",
    perfil: "OPERACAO",
    ativo: true,
  });

  const response = await request(app)
    .get("/api/clientes")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 403);
});

test("GET /api/paineis/clientes omits sensitive data", async () => {
  atendimentoRepository.list = async () => [
    {
      id: 1,
      numero_os: "OS-2026-000001",
      cliente_nome: "Carlos",
      cliente_cpf: "12345678909",
      cliente_telefone: "11999999999",
      motocicleta_modelo: "CG 160",
      mecanico_nome: "Breno",
      mecanico_foto_url: "/uploads/mecanicos/breno.webp",
      status: "PODE_RETIRAR",
      situacao_pagamento: "PAGO",
      entrada_em: new Date(),
    },
  ];
  atendimentoRepository.listRecentFinalizados = async () => [];

  const response = await request(app).get("/api/paineis/clientes");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.pode_retirar[0].cliente_cpf, undefined);
  assert.equal(response.body.data.pode_retirar[0].situacao_pagamento, undefined);
});

test("GET /api/relatorios/atendimentos denies OFICINA profile", async () => {
  const token = signAccessToken({
    sub: 9,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 9,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  const response = await request(app)
    .get("/api/relatorios/atendimentos")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 403);
});

test("GET /api/v2/ordens-servico allows SUPERVISAO profile", async () => {
  const token = signAccessToken({
    sub: 10,
    perfil: "SUPERVISAO",
    email: "supervisao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 10,
    nome: "Supervisao",
    email: "supervisao@jebil.local",
    perfil: "SUPERVISAO",
    ativo: true,
  });

  ordemServicoV2Service.listOrdensServico = async () => [];

  const response = await request(app)
    .get("/api/v2/ordens-servico")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("GET /api/v2/ordens-servico/operacional/lista allows OPERACAO profile", async () => {
  const token = signAccessToken({
    sub: 1010,
    perfil: "OPERACAO",
    email: "operacaoo",
  });

  usuarioRepository.findById = async () => ({
    id: 1010,
    nome: "Operacao",
    email: "operacaoo",
    perfil: "OPERACAO",
    ativo: true,
  });

  ordemServicoV2Service.listOperacional = async () => [];

  const response = await request(app)
    .get("/api/v2/ordens-servico/operacional/lista")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("PATCH /api/v2/ordens-servico/operacional/controle-patio updates queue order", async () => {
  const token = signAccessToken({
    sub: 12,
    perfil: "RECEPCAO",
    email: "recepcao",
  });

  usuarioRepository.findById = async () => ({
    id: 12,
    nome: "Recepcao",
    email: "recepcao",
    perfil: "RECEPCAO",
    ativo: true,
  });

  ordemServicoV2Service.reordenarControlePatio = async (ordemIds) => ({
    ordem_ids: ordemIds,
    total: ordemIds.length,
  });

  const response = await request(app)
    .patch("/api/v2/ordens-servico/operacional/controle-patio")
    .set("Authorization", `Bearer ${token}`)
    .send({ ordem_ids: [18, 7, 22] });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data.ordem_ids, [18, 7, 22]);
  assert.equal(response.body.data.total, 3);
});

test("PATCH /api/v2/ordens-servico/operacional/controle-patio rejects OPERACAO profile", async () => {
  const token = signAccessToken({
    sub: 1010,
    perfil: "OPERACAO",
    email: "operacaoo",
  });

  usuarioRepository.findById = async () => ({
    id: 1010,
    nome: "Operacao",
    email: "operacaoo",
    perfil: "OPERACAO",
    ativo: true,
  });

  const response = await request(app)
    .patch("/api/v2/ordens-servico/operacional/controle-patio")
    .set("Authorization", `Bearer ${token}`)
    .send({ ordem_ids: [18, 7] });

  assert.equal(response.statusCode, 403);
});

test("POST /api/v2/ordens-servico allows OFICINA profile", async () => {
  const token = signAccessToken({
    sub: 11,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 11,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  ordemServicoV2Service.createOrdemServicoDraft = async (payload, currentUser) => ({
    ordemServico: {
      id: 11,
      numero_os: "OS-2026-000811",
      status_geral: "EM_DIAGNOSTICO",
      cliente_id: payload.clienteId,
      motocicleta_id: payload.motocicletaId,
      criado_por: currentUser.id,
    },
    items: [
      {
        id: 110,
        descricao: payload.items[0].descricao,
        status_item: "AGUARDANDO_DIAGNOSTICO",
      },
    ],
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico")
    .set("Authorization", `Bearer ${token}`)
    .send({
      cliente_id: 1,
      motocicleta_id: 1,
      queixa_principal: "Moto falhando",
      items: [{ descricao: "Diagnostico da falha", exige_diagnostico: true }],
    });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
});

test("POST /api/v2/ordens-servico accepts RECEPCAO payload and returns created order", async () => {
  const token = signAccessToken({
    sub: 12,
    perfil: "RECEPCAO",
    email: "recepcao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 12,
    nome: "Recepcao",
    email: "recepcao@jebil.local",
    perfil: "RECEPCAO",
    ativo: true,
  });

  ordemServicoV2Service.createOrdemServicoDraft = async (payload, currentUser) => ({
    ordemServico: {
      id: 7,
      numero_os: "OS-2026-000777",
      status_geral: "EM_DIAGNOSTICO",
      cliente_id: payload.clienteId,
      motocicleta_id: payload.motocicletaId,
    },
    items: [
      {
        id: 70,
        descricao: payload.items[0].descricao,
        status_item: "AGUARDANDO_DIAGNOSTICO",
        criado_por: currentUser.id,
      },
    ],
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico")
    .set("Authorization", `Bearer ${token}`)
    .send({
      cliente_id: 1,
      motocicleta_id: 2,
      queixa_principal: "Moto falhando",
      observacoes_entrada: "Cliente relatou falha ao acelerar.",
      items: [
        {
          descricao: "Diagnostico da falha",
          exige_diagnostico: true,
          prioridade: "ALTA",
        },
      ],
    });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.ordemServico.numero_os, "OS-2026-000777");
});

test("POST /api/v2/ordens-servico/:ordemId/comunicacoes-whatsapp allows SUPERVISAO", async () => {
  const token = signAccessToken({
    sub: 121,
    perfil: "SUPERVISAO",
    email: "supervisao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 121,
    nome: "Supervisao",
    email: "supervisao@jebil.local",
    perfil: "SUPERVISAO",
    ativo: true,
  });

  ordemServicoV2Service.registrarComunicacaoWhatsApp = async () => ({
    id: 9,
    numero_os: "OS-2026-000903",
    comunicacoes_whatsapp: [{ id: 1, tipo_comunicacao: "ORCAMENTISTA_CLIENTE" }],
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico/9/comunicacoes-whatsapp")
    .set("Authorization", `Bearer ${token}`)
    .send({
      tipo_comunicacao: "ORCAMENTISTA_CLIENTE",
      destinatario: "11999999999",
      finalidade: "Aviso de orcamento pronto",
      mensagem_preparada: "Seu orcamento esta pronto.",
      status_registro: "WHATSAPP_ABERTO",
    });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
});

test("POST /api/v2/ordens-servico/:ordemId/assinatura-recebimento allows RECEPCAO", async () => {
  const token = signAccessToken({
    sub: 221,
    perfil: "RECEPCAO",
    email: "recepcao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 221,
    nome: "Recepcao",
    email: "recepcao@jebil.local",
    perfil: "RECEPCAO",
    ativo: true,
  });

  ordemServicoV2Service.registrarAssinaturaRecebimento = async () => ({
    id: 9,
    numero_os: "OS-2026-000950",
    assinatura_recebimento: {
      id: 1,
      numero_os: "OS-2026-000950",
    },
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico/9/assinatura-recebimento")
    .set("Authorization", `Bearer ${token}`)
    .send({
      assinatura_data_url: "data:image/png;base64,ZmFrZQ==",
      recebeu_fotos_whatsapp: true,
      ciente_possivel_cobranca: true,
    });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
});

test("POST /api/v2/ordens-servico/:ordemId/assinatura-recebimento blocks overwrite when signature already exists", async () => {
  const token = signAccessToken({
    sub: 222,
    perfil: "RECEPCAO",
    email: "recepcao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 222,
    nome: "Recepcao",
    email: "recepcao@jebil.local",
    perfil: "RECEPCAO",
    ativo: true,
  });

  ordemServicoV2Service.registrarAssinaturaRecebimento = async () => {
    throw new ApiError(409, "Esta OS ja possui uma assinatura registrada e nao pode ser alterada.");
  };

  const response = await request(app)
    .post("/api/v2/ordens-servico/9/assinatura-recebimento")
    .set("Authorization", `Bearer ${token}`)
    .send({
      assinatura_data_url: "data:image/png;base64,ZmFrZQ==",
      recebeu_fotos_whatsapp: true,
      ciente_possivel_cobranca: true,
    });

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.success, false);
});

test("POST /api/v2/ordens-servico/:ordemId/assinatura-recebimento/pdf allows RECEPCAO", async () => {
  const token = signAccessToken({
    sub: 223,
    perfil: "RECEPCAO",
    email: "recepcao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 223,
    nome: "Recepcao",
    email: "recepcao@jebil.local",
    perfil: "RECEPCAO",
    ativo: true,
  });

  ordemServicoV2Service.generateAssinaturaRecebimentoPdf = async () => ({
    id: 9,
    numero_os: "OS-2026-000950",
    assinatura_recebimento: {
      id: 1,
      pdf_url: "/uploads/assinaturas-pdf/contrato.pdf",
    },
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico/9/assinatura-recebimento/pdf")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("POST /api/v2/ordens-servico/:ordemId/orcamentos allows SUPERVISAO", async () => {
  const token = signAccessToken({
    sub: 122,
    perfil: "SUPERVISAO",
    email: "supervisao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 122,
    nome: "Supervisao",
    email: "supervisao@jebil.local",
    perfil: "SUPERVISAO",
    ativo: true,
  });

  ordemServicoV2Service.createOrcamento = async () => ({
    orcamento: { id: 3, numero_externo: "#12345", status_orcamento: "RASCUNHO" },
    ordemServico: { id: 9, numero_os: "OS-2026-000904" },
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico/9/orcamentos")
    .set("Authorization", `Bearer ${token}`)
    .send({
      numero_externo: "#12345",
      status_orcamento: "RASCUNHO",
      items: [
        {
          descricao: "Troca de oleo",
          quantidade: 1,
          valor_peca: 50,
          valor_mao_obra: 30,
          valor_total: 80,
          autorizacao_status: "AGUARDANDO_RESPOSTA",
        },
      ],
    });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
});

test("PATCH /api/v2/ordens-servico/orcamentos/:id/status allows SUPERVISAO", async () => {
  const token = signAccessToken({
    sub: 123,
    perfil: "SUPERVISAO",
    email: "supervisao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 123,
    nome: "Supervisao",
    email: "supervisao@jebil.local",
    perfil: "SUPERVISAO",
    ativo: true,
  });

  ordemServicoV2Service.updateOrcamentoStatus = async () => ({
    orcamento: { id: 3, numero_externo: "#12345", status_orcamento: "ENVIADO" },
    ordemServico: { id: 9, numero_os: "OS-2026-000904" },
  });

  const response = await request(app)
    .patch("/api/v2/ordens-servico/orcamentos/3/status")
    .set("Authorization", `Bearer ${token}`)
    .send({
      status_orcamento: "ENVIADO",
    });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("POST /api/v2/ordens-servico/orcamentos/:id/pdf allows SUPERVISAO", async () => {
  const token = signAccessToken({
    sub: 223,
    perfil: "SUPERVISAO",
    email: "supervisao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 223,
    nome: "Supervisao",
    email: "supervisao@jebil.local",
    perfil: "SUPERVISAO",
    ativo: true,
  });

  ordemServicoV2Service.uploadOrcamentoPdf = async () => ({
    orcamento: { id: 3, numero_externo: "#12345", pdf_url: "/uploads/orcamentos-pdf/teste.pdf" },
    ordemServico: { id: 9, numero_os: "OS-2026-000904" },
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico/orcamentos/3/pdf")
    .set("Authorization", `Bearer ${token}`)
    .attach("arquivo", Buffer.from("%PDF-1.4 teste"), "orcamento.pdf");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("POST /api/v2/ordens-servico/:ordemId/items/:itemId/previsoes-pecas allows OFICINA", async () => {
  const token = signAccessToken({
    sub: 124,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 124,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  ordemServicoV2Service.registrarPrevisaoPeca = async () => ({
    id: 9,
    numero_os: "OS-2026-000905",
    previsoes_pecas: [{ id: 1, descricao_peca: "Kit relacao" }],
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico/9/items/92/previsoes-pecas")
    .set("Authorization", `Bearer ${token}`)
    .send({
      descricao_peca: "Kit relacao",
      previsao_chegada: "2026-06-28T10:00:00",
      observacao: "Fornecedor informou 5 dias.",
    });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
});

test("PATCH /api/v2/ordens-servico/:ordemId/items/:itemId/retomar-peca allows OFICINA", async () => {
  const token = signAccessToken({
    sub: 125,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 125,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  ordemServicoV2Service.retomarItemDaPeca = async () => ({
    id: 9,
    numero_os: "OS-2026-000906",
    items: [{ id: 92, status_item: "PRONTO_PARA_EXECUTAR" }],
  });

  const response = await request(app)
    .patch("/api/v2/ordens-servico/9/items/92/retomar-peca")
    .set("Authorization", `Bearer ${token}`)
    .send({
      status_destino: "PRONTO_PARA_EXECUTAR",
    });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("POST /api/v2/ordens-servico/:ordemId/items/:itemId/execucao allows OFICINA", async () => {
  const token = signAccessToken({
    sub: 126,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 126,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  ordemServicoV2Service.atribuirExecucao = async () => ({
    id: 9,
    numero_os: "OS-2026-000907",
    execucoes: [{ id: 5, item_ordem_servico_id: 92 }],
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico/9/items/92/execucao")
    .set("Authorization", `Bearer ${token}`)
    .send({
      mecanico_principal_id: 1,
      mecanicos_auxiliares_ids: [2, 3],
      descricao_execucao: "Separar dupla para servico pesado.",
    });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("PATCH /api/v2/ordens-servico/:ordemId/items/:itemId/status allows OFICINA", async () => {
  const token = signAccessToken({
    sub: 13,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 13,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  ordemServicoV2Service.updateItemStatus = async () => ({
    id: 9,
    numero_os: "OS-2026-000900",
    status_geral: "EM_EXECUCAO",
    items: [{ id: 91, status_item: "EM_EXECUCAO" }],
  });

  const response = await request(app)
    .patch("/api/v2/ordens-servico/9/items/91/status")
    .set("Authorization", `Bearer ${token}`)
    .send({ status_item: "EM_EXECUCAO" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("PATCH /api/v2/ordens-servico/:ordemId/items/:itemId/autorizacao allows SUPERVISAO", async () => {
  const token = signAccessToken({
    sub: 14,
    perfil: "SUPERVISAO",
    email: "supervisao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 14,
    nome: "Supervisao",
    email: "supervisao@jebil.local",
    perfil: "SUPERVISAO",
    ativo: true,
  });

  ordemServicoV2Service.updateItemAutorizacao = async () => ({
    id: 9,
    numero_os: "OS-2026-000901",
    items: [{ id: 92, autorizacao_status: "AUTORIZADO" }],
  });

  const response = await request(app)
    .patch("/api/v2/ordens-servico/9/items/92/autorizacao")
    .set("Authorization", `Bearer ${token}`)
    .send({ autorizacao_status: "AUTORIZADO" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("PATCH /api/v2/ordens-servico/:ordemId/items/:itemId/pagamento allows OFICINA", async () => {
  const token = signAccessToken({
    sub: 15,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 15,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  ordemServicoV2Service.updateItemPagamento = async () => ({
    id: 9,
    numero_os: "OS-2026-000915",
    items: [{ id: 92, pagamento_status: "PAGO" }],
  });

  const response = await request(app)
    .patch("/api/v2/ordens-servico/9/items/92/pagamento")
    .set("Authorization", `Bearer ${token}`)
    .send({ pagamento_status: "PAGO" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("POST /api/v2/ordens-servico/:ordemId/diagnosticos allows OFICINA", async () => {
  const token = signAccessToken({
    sub: 16,
    perfil: "OFICINA",
    email: "oficina@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 16,
    nome: "Oficina",
    email: "oficina@jebil.local",
    perfil: "OFICINA",
    ativo: true,
  });

  ordemServicoV2Service.createDiagnostico = async () => ({
    diagnostico: { id: 3, status_diagnostico: "EM_ANDAMENTO" },
    ordemServico: { id: 9, numero_os: "OS-2026-000902" },
  });

  const response = await request(app)
    .post("/api/v2/ordens-servico/9/diagnosticos")
    .set("Authorization", `Bearer ${token}`)
    .send({
      item_diagnostico_id: 92,
      queixa_avaliada: "Moto falhando em alta rotacao",
    });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
});

test("GET /api/v2/ordens-servico/prontuario/motocicletas/:motocicletaId returns prontuario payload", async () => {
  const token = signAccessToken({
    sub: 17,
    perfil: "RECEPCAO",
    email: "recepcao@jebil.local",
  });

  usuarioRepository.findById = async () => ({
    id: 17,
    nome: "Recepcao",
    email: "recepcao@jebil.local",
    perfil: "RECEPCAO",
    ativo: true,
  });

  ordemServicoV2Service.getProntuarioByMotocicletaId = async () => ({
    motocicleta_id: 22,
    motocicleta_placa: "ABC1D23",
    ordens_servico: [],
  });

  const response = await request(app)
    .get("/api/v2/ordens-servico/prontuario/motocicletas/22")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.motocicleta_placa, "ABC1D23");
});
