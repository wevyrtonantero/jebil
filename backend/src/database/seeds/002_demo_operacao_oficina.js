const mecanicosDemo = [
  { nome: "Juliete Martins", ordem: 1, disponivel: true },
  { nome: "Pedro Thiago", ordem: 2, disponivel: true },
  { nome: "Rafael Souza", ordem: 3, disponivel: true },
  { nome: "Lucas Pereira", ordem: 4, disponivel: true },
  { nome: "Marina Torres", ordem: 5, disponivel: true },
  { nome: "Caio Batista", ordem: 6, disponivel: false },
  { nome: "Bruna Nogueira", ordem: 7, disponivel: true },
];

const motosDemo = [
  ["Carlos Eduardo", "11990000001", "11111111101", "Honda CG 160", "JBL1A01", "Motor falhando em baixa", "EM_SERVICO", "PAGO", "Limpeza do sistema de alimentacao e regulagem."],
  ["Mariana Silva", "11990000002", "11111111102", "Yamaha Fazer 250", "JBL1A02", "Ruido na dianteira", "AGUARDANDO_PECAS", "PENDENTE", null],
  ["Joao Pedro", "11990000003", "11111111103", "Titan 160", "JBL1A03", "Revisao completa", "SAIDA_PARA_TESTE", "PAGO", null],
  ["Fernanda Lima", "11990000004", "11111111104", "Biz 125", "JBL1A04", "Freio traseiro baixo", "AGUARDANDO", "PENDENTE", null],
  ["Ricardo Alves", "11990000005", "11111111105", "XRE 300", "JBL1A05", "Vazamento de oleo", "AGUARDANDO", "PAGO", null],
  ["Patricia Souza", "11990000006", "11111111106", "PCX 160", "JBL1A06", "Nao pega na partida", "AGUARDANDO", "PENDENTE", null],
  ["Diego Ferreira", "11990000007", "11111111107", "MT-03", "JBL1A07", "Troca de relacao", "AGUARDANDO", "PAGO", null],
  ["Ana Paula", "11990000008", "11111111108", "CG 160 Fan", "JBL1A08", "Barulho no escapamento", "AGUARDANDO", "PAGO", null],
  ["Lucas Andrade", "11990000009", "11111111109", "Fazer 150", "JBL1A09", "Pneu traseiro furando", "AGUARDANDO", "PENDENTE", null],
  ["Gabriel Lima", "11990000010", "11111111110", "NXR 160 Bros", "JBL1A10", "Troca de oleo", "AGUARDANDO", "PAGO", null],
  ["Rafael Santos", "11990000011", "11111111111", "Titan 150", "JBL1A11", "Corrente folgada", "SERVICO_CONCLUIDO", "PENDENTE", "Ajuste e lubrificacao da transmissao."],
  ["Bruno Costa", "11990000012", "11111111112", "CG 160 Start", "JBL1A12", "Luz de injecao acesa", "PODE_RETIRAR", "PAGO", "Leitura de falhas e substituicao de sensor."],
  ["Helena Rocha", "11990000013", "11111111113", "Neo 125", "JBL1A13", "Nao segura lenta", "FINALIZADO", "PAGO", "Limpeza de bico e ajuste de lenta."],
  ["Mateus Barros", "11990000014", "11111111114", "Pop 110", "JBL1A14", "Troca de pneu", "FINALIZADO", "PAGO", "Substituicao do pneu traseiro."],
  ["Carla Mendes", "11990000015", "11111111115", "CB 300F", "JBL1A15", "Revisao eletrica", "AGUARDANDO", "PENDENTE", null],
  ["Sergio Pires", "11990000016", "11111111116", "Lander 250", "JBL1A16", "Suspensao dianteira batendo", "AGUARDANDO", "PAGO", null],
  ["Fabiana Melo", "11990000017", "11111111117", "Factor 150", "JBL1A17", "Falha ao acelerar", "AGUARDANDO", "PENDENTE", null],
  ["Thiago Ramos", "11990000018", "11111111118", "Dominar 200", "JBL1A18", "Revisao de freios", "AGUARDANDO", "PAGO", null],
  ["Vanessa Prado", "11990000019", "11111111119", "Biz 110i", "JBL1A19", "Bateria descarregando", "AGUARDANDO", "PENDENTE", null],
  ["Eduardo Nunes", "11990000020", "11111111120", "XTZ 250", "JBL1A20", "Ajuste de valvulas", "AGUARDANDO", "PAGO", null],
];

exports.seed = async function seed(knex) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@jebil.local";
  const admin = await knex("usuarios").where({ email: adminEmail }).first();

  if (!admin) {
    throw new Error("Usuario admin de desenvolvimento nao encontrado para seed de demonstracao.");
  }

  const placas = motosDemo.map((item) => item[4]);
  const cpfs = motosDemo.map((item) => item[2]);
  const nomesMecanicos = mecanicosDemo.map((item) => item.nome);

  const motosExistentes = await knex("motocicletas").select("id").whereIn("placa", placas);
  const clientesExistentes = await knex("clientes").select("id").whereIn("cpf", cpfs);
  const mecanicosExistentes = await knex("mecanicos")
    .select("id", "nome")
    .where((query) => {
      mecanicosDemo.forEach((item, index) => {
        const method = index === 0 ? "whereRaw" : "orWhereRaw";
        query[method]("LOWER(nome) = LOWER(?)", [item.nome]);
      });
    });

  const motoIds = motosExistentes.map((item) => item.id);
  const clienteIds = clientesExistentes.map((item) => item.id);
  const atendimentosExistentes = await knex("atendimentos")
    .select("id")
    .whereIn("motocicleta_id", motoIds.length ? motoIds : [0])
    .orWhereIn("cliente_id", clienteIds.length ? clienteIds : [0]);

  const atendimentoIds = atendimentosExistentes.map((item) => item.id);

  if (atendimentoIds.length) {
    await knex("historico_atendimentos").whereIn("atendimento_id", atendimentoIds).del();
    await knex("atendimentos").whereIn("id", atendimentoIds).del();
  }

  if (motoIds.length) {
    await knex("motocicletas").whereIn("id", motoIds).del();
  }

  if (clienteIds.length) {
    await knex("clientes").whereIn("id", clienteIds).del();
  }

  const agora = new Date();

  for (const item of mecanicosDemo) {
    const duplicados = mecanicosExistentes.filter((mecanico) => mecanico.nome.toLowerCase() === item.nome.toLowerCase());

    if (duplicados.length > 1) {
      const principal = duplicados[0];
      const extras = duplicados.slice(1);

      for (const extra of extras) {
        await knex("atendimentos").where({ mecanico_id: extra.id }).update({ mecanico_id: principal.id });
        await knex("historico_atendimentos").where({ mecanico_id: extra.id }).update({ mecanico_id: principal.id });
        await knex("mecanicos").where({ id: extra.id }).del();
      }
    }
  }

  const mecanicosPosConsolidacao = await knex("mecanicos")
    .select("id", "nome")
    .where((query) => {
      mecanicosDemo.forEach((item, index) => {
        const method = index === 0 ? "whereRaw" : "orWhereRaw";
        query[method]("LOWER(nome) = LOWER(?)", [item.nome]);
      });
    });

  for (const item of mecanicosDemo) {
    const existente = mecanicosPosConsolidacao.find((mecanico) => mecanico.nome.toLowerCase() === item.nome.toLowerCase());

    const payload = {
      nome: item.nome,
      ativo: true,
      disponivel_hoje: item.disponivel,
      ordem_exibicao: item.ordem,
      atualizado_em: agora,
    };

    if (existente) {
      await knex("mecanicos").where({ id: existente.id }).update(payload);
    } else {
      await knex("mecanicos").insert({
        ...payload,
        foto_url: null,
        criado_em: agora,
      });
    }
  }

  const mecanicos = await knex("mecanicos").select("id", "nome").whereIn("nome", nomesMecanicos).orderBy("ordem_exibicao", "asc");
  const mecanicosPorNome = Object.fromEntries(mecanicos.map((item) => [item.nome, item.id]));

  const clientesPayload = motosDemo.map((item) => ({
    nome: item[0],
    telefone: item[1],
    cpf: item[2],
    cpf_normalizado: item[2],
    observacoes: "Cliente de demonstracao para testes locais.",
    ativo: true,
    criado_em: agora,
    atualizado_em: agora,
  }));

  await knex("clientes").insert(clientesPayload);

  const clientes = await knex("clientes").select("id", "cpf").whereIn("cpf", cpfs);
  const clientesPorCpf = Object.fromEntries(clientes.map((item) => [item.cpf, item.id]));

  await knex("motocicletas").insert(
    motosDemo.map((item, index) => ({
      cliente_id: clientesPorCpf[item[2]],
      marca: item[3].split(" ")[0],
      modelo: item[3],
      cor: index % 2 === 0 ? "Preta" : "Vermelha",
      placa: item[4],
      placa_normalizada: item[4],
      km: 10000 + index * 1200,
      observacoes: "Motocicleta de demonstracao para testes.",
      ativo: true,
      criado_em: agora,
      atualizado_em: agora,
    })),
  );

  const motocicletas = await knex("motocicletas").select("id", "placa").whereIn("placa", placas);
  const motosPorPlaca = Object.fromEntries(motocicletas.map((item) => [item.placa, item.id]));

  const atribuicoes = [
    "Juliete Martins",
    "Pedro Thiago",
    "Rafael Souza",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    "Lucas Pereira",
    "Marina Torres",
    "Bruna Nogueira",
    "Juliete Martins",
    null,
    null,
    null,
    null,
    null,
    null,
  ];

  await knex("atendimentos").insert(
    motosDemo.map((item, index) => {
      const status = item[6];
      const mecanicoNome = atribuicoes[index];
      const mecanicoId = mecanicoNome ? mecanicosPorNome[mecanicoNome] : null;
      const entradaEm = new Date(Date.now() - (20 - index) * 600000);
      const assumidoEm = mecanicoId ? new Date(entradaEm.getTime() + 600000) : null;
      const concluidoEm = ["SERVICO_CONCLUIDO", "PODE_RETIRAR", "FINALIZADO"].includes(status)
        ? new Date(entradaEm.getTime() + 3600000)
        : null;
      const liberadoEm = ["PODE_RETIRAR", "FINALIZADO"].includes(status) ? new Date(entradaEm.getTime() + 4200000) : null;
      const finalizadoEm = status === "FINALIZADO" ? new Date(entradaEm.getTime() + 4800000) : null;

      return {
        numero_os: `OS-DEMO-2026-${String(index + 1).padStart(6, "0")}`,
        cliente_id: clientesPorCpf[item[2]],
        motocicleta_id: motosPorPlaca[item[4]],
        mecanico_id: mecanicoId,
        problema_servico: item[5],
        observacoes: "Registro de demonstracao.",
        observacoes_internas: "Base de testes local.",
        servico_executado: item[8],
        status,
        situacao_pagamento: item[7],
        entrada_em: entradaEm,
        assumido_em: assumidoEm,
        servico_concluido_em: concluidoEm,
        pagamento_confirmado_em: item[7] === "PAGO" ? entradaEm : null,
        pagamento_confirmado_por: item[7] === "PAGO" ? admin.id : null,
        liberado_retirada_em: liberadoEm,
        retirada_confirmada_em: status === "FINALIZADO" ? finalizadoEm : null,
        finalizado_em: finalizadoEm,
        cancelado_em: null,
        ordem_fila: status === "AGUARDANDO" ? index + 1 : null,
        criado_por: admin.id,
        criado_em: entradaEm,
        atualizado_em: agora,
      };
    }),
  );

  const year = new Date().getFullYear();
  const sequenceExists = await knex("controle_sequencias_os").where({ ano: year }).first();

  if (sequenceExists) {
    await knex("controle_sequencias_os").where({ ano: year }).update({
      ultimo_numero: Math.max(Number(sequenceExists.ultimo_numero || 0), 20),
      atualizado_em: agora,
    });
  } else {
    await knex("controle_sequencias_os").insert({
      ano: year,
      ultimo_numero: 20,
      criado_em: agora,
      atualizado_em: agora,
    });
  }
};
