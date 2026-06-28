# Parte 01: Arquitetura e Regras

## 1. Objetivo desta etapa

Este documento consolida a análise inicial do sistema web de fluxo de oficina da Jebil Motos Preparações.

Nesta fase, o objetivo é definir com clareza:

1. Regras de negócio.
2. Arquitetura proposta.
3. Modelo inicial do banco de dados MySQL.
4. Estrutura de pastas do front-end e do back-end.
5. Rotas da API.
6. Matriz de permissões.
7. Fluxos operacionais principais.
8. Riscos, ambiguidades e decisões que precisam de validação.
9. Plano de implementação por fases.

Este documento não implementa código funcional. Ele serve como base de aprovação antes do início do desenvolvimento.

---

## 2. Resumo executivo

O escopo está bem direcionado para um sistema operacional de oficina, com foco em fila, atribuição de atendimentos, acompanhamento de status, controle de pagamento em nível simples e liberação para retirada. Isso é positivo porque evita dispersão em estoque, financeiro completo e indicadores avançados.

O núcleo do sistema depende de quatro pilares:

1. Controle rigoroso do ciclo de vida do atendimento.
2. Regras de permissão no back-end.
3. Histórico confiável de movimentações.
4. Atualização em tempo real sem perder consistência com o banco.

A principal recomendação técnica é adotar uma arquitetura monolítica organizada, com:

* Front-end React separado.
* Back-end Node.js + Express.
* MySQL como fonte oficial de dados.
* Socket.io apenas como mecanismo de notificação, não como fonte oficial de estado.

Essa abordagem é suficiente para o escopo atual, reduz complexidade operacional e facilita evolução futura.

---

## 3. Decisões técnicas iniciais

Antes da implementação, estas decisões técnicas são propostas para orientar a construção:

### 3.1 Arquitetura geral

Decisão:
Adotar um monólito dividido em `frontend/` e `backend/`.

Justificativa:

* O escopo ainda é controlado.
* A equipe terá mais velocidade de entrega.
* Há menos complexidade de deploy, logs, autenticação e transações.
* O sistema depende fortemente de regras transacionais entre atendimento e histórico.

### 3.2 Fonte oficial de estado

Decisão:
O MySQL será a fonte oficial do estado do atendimento.

Justificativa:

* Evita divergência entre telas.
* Permite recuperar estado correto após reinício do servidor.
* Mantém integridade para fila, pagamento, retirada e histórico.

### 3.3 Atualização em tempo real

Decisão:
Usar Socket.io apenas para notificar que houve mudança.

Justificativa:

* O front-end pode refazer a consulta da API após eventos importantes.
* Reduz risco de telas ficarem inconsistentes por payload parcial.
* Está alinhado com o requisito do escopo.

### 3.4 Controle de fila

Decisão:
A prioridade da fila será baseada primariamente em `entrada_em`.

Justificativa:

* O documento exige que atendimentos mais antigos permaneçam no topo.
* Quando um atendimento retornar à fila, a prioridade original precisa ser preservada.
* Isso evita distorções por reentrada manual.

Observação:
O campo `ordem_fila` pode existir como apoio de ordenação ou para tratamento visual, mas a lógica principal deve respeitar `entrada_em`.

### 3.5 Segurança e permissões

Decisão:
As permissões serão aplicadas por perfil e validadas em middleware e service.

Justificativa:

* Middleware filtra acesso geral por rota.
* Service valida regra de negócio sensível por ação.
* Evita confiar somente no front-end.

### 3.6 Exclusão lógica

Decisão:
Usar inativação para clientes, motocicletas e mecânicos; usar preservação histórica para atendimentos.

Justificativa:

* Mantém rastreabilidade.
* Evita quebra de relatórios.
* Está alinhado ao escopo.

### 3.7 Numeração da OS

Decisão:
Gerar `numero_os` único no back-end.

Definição aprovada:
Formato `OS-AAAA-NNNNNN`, por exemplo `OS-2026-000001`.

Justificativa:

* Evita colisões.
* Facilita busca humana.
* Não depende do front-end.
* Permite reinício da sequência por ano sem perder legibilidade.

---

## 4. Análise crítica do escopo

### 4.1 Pontos fortes

* O escopo está objetivo e focado no fluxo operacional da oficina.
* As responsabilidades dos perfis estão relativamente bem separadas.
* O ciclo de atendimento foi descrito com boa granularidade.
* O documento já delimita claramente o que não deve ser construído agora.
* A obrigatoriedade de histórico e validação no back-end reduz risco de inconsistência.

### 4.2 Pontos de atenção

* O termo "mecânico assume uma motocicleta" aparece no fluxo, mas o perfil operacional descrito é `OFICINA`, não um perfil separado de mecânico autenticado. Isso precisa ser interpretado corretamente.
* O documento pede cadastro de mecânicos com foto, mas não afirma se cada mecânico terá login próprio ou se o usuário do perfil `OFICINA` poderá operar qualquer card.
* Há distinção entre "concluir serviço", "liberar para retirada", "confirmar retirada" e "finalizar", mas a fronteira operacional entre esses passos precisa ser rigidamente definida para evitar redundância.
* A regra de fila é cronológica, mas o documento também sugere `ordem_fila`; é necessário decidir qual campo é autoridade.
* O sistema terá painéis internos e potencialmente visíveis a clientes. Isso exige cuidado na separação de dados sensíveis e no desenho das APIs públicas.

### 4.3 Conclusão da análise

O escopo é viável e bem recortado para uma primeira versão. A implementação tende a ser segura e sustentável se houver disciplina em:

* modelagem de status;
* controle transacional;
* separação entre visualização interna e pública;
* padronização das regras de permissão.

---

## 5. Decisões operacionais confirmadas

### 5.1 Login e operação da oficina

Ficou definido que não haverá login individual para cada mecânico nesta primeira versão.

Haverá apenas um usuário com perfil `OFICINA`, utilizado no computador da oficina. Esse usuário poderá movimentar atendimentos de todos os mecânicos.

Regra operacional:

* ao assumir um atendimento, o operador do perfil `OFICINA` deverá selecionar qual mecânico ficará responsável;
* o `mecanico_id` representa o profissional exibido no card e vinculado ao atendimento;
* o `usuario` representa quem acessa e opera o sistema.

### 5.2 Separação entre usuário e mecânico

Ficou definido que `Usuário` e `Mecânico` permanecerão como entidades separadas.

Consequência prática:

* `usuarios` controlam autenticação e permissão;
* `mecanicos` controlam exibição em cards, foto, ordem de exibição e vínculo operacional do atendimento.

### 5.3 Cancelamento de atendimento

Ficou definido que o perfil `OFICINA` não pode cancelar atendimento.

Permissão de cancelamento:

* `ADMIN`
* `RECEPCAO`

Regra adicional:

* cancelamento só é permitido se o atendimento não estiver `FINALIZADO` nem `CANCELADO`;
* o histórico deve registrar quem cancelou e, se informado, o motivo.

### 5.4 Histórico para o perfil OFICINA

Ficou definido que o perfil `OFICINA` não visualizará o histórico administrativo completo.

O perfil `OFICINA` poderá visualizar apenas dados operacionais necessários ao atendimento atual:

* nome do cliente;
* modelo da motocicleta;
* placa;
* problema ou serviço;
* horário de chegada;
* status atual;
* mecânico responsável.

O histórico completo permanece disponível para `ADMIN` e `RECEPCAO`.

### 5.5 Liberação para retirada

Ficou definido que o perfil `OFICINA` poderá liberar a motocicleta para retirada quando o pagamento já estiver confirmado.

Regra:

* `SERVICO_CONCLUIDO` não muda automaticamente para `PODE_RETIRAR`;
* o sistema deve exibir confirmação explícita;
* ao confirmar, o atendimento muda para `PODE_RETIRAR`.

Perfis autorizados a liberar para retirada:

* `ADMIN`
* `RECEPCAO`
* `OFICINA`, somente quando o pagamento já estiver `PAGO`

### 5.6 Confirmação de retirada e finalização

Ficou definido que `CONFIRMAR RETIRADA` e `FINALIZAR` serão tratados como a mesma ação nesta V1.

Consequência:

* `PATCH /api/atendimentos/:id/confirmar-retirada` muda o status para `FINALIZADO`;
* `retirada_confirmada_em` e `finalizado_em` poderão receber o mesmo timestamp;
* a ação operacional visível pode ser nomeada como `CONFIRMAR RETIRADA`.

### 5.7 Unicidade e reativação de cadastros

Definições aprovadas:

* CPF é único quando preenchido, inclusive para clientes inativos;
* placa é única quando preenchida, considerando somente motocicletas ativas;
* o sistema deve sugerir reativação quando encontrar CPF ou placa vinculados a cadastro inativo.

Regras complementares:

* comparação de placa deve ignorar maiúsculas, minúsculas, espaços e hífen;
* ao encontrar cliente inativo com mesmo CPF, o sistema deve oferecer reativação em vez de duplicação;
* ao encontrar motocicleta inativa com mesma placa, o sistema deve oferecer reativação em vez de duplicação.

### 5.8 Painéis e busca por OS

Ficou definido que:

* o painel da oficina é exclusivamente interno;
* o painel dos clientes continua público e simplificado;
* a busca por número de OS existirá apenas nas telas internas.

Telas internas com busca por OS:

* recepção;
* lista de atendimentos;
* histórico;
* relatório simples.

### 5.9 Observações internas

Ficou definido que `observacoes_internas` será mantido na V1.

Visibilidade:

* `ADMIN`
* `RECEPCAO`
* `OFICINA`, quando a observação for necessária para execução do serviço

Regra obrigatória:

* nunca exibir `observacoes_internas` no painel público dos clientes.

### 5.10 Últimos concluídos

Ficou definido que:

* painel da oficina mostra os últimos 5 atendimentos finalizados;
* painel dos clientes mostra os últimos 3 atendimentos finalizados.

---

## 6. Riscos principais

### 6.1 Concorrência ao assumir atendimento

Risco:
Dois operadores tentarem assumir o mesmo atendimento quase ao mesmo tempo.

Mitigação:

* validar status atual no back-end;
* usar transação;
* atualizar apenas se o atendimento ainda estiver `AGUARDANDO` e sem `mecanico_id`;
* retornar erro de conflito em caso de corrida.

### 6.2 Inconsistência entre status e pagamento

Risco:
Atendimento ficar em `PODE_RETIRAR` com pagamento pendente.

Mitigação:

* validar em service antes de atualizar status;
* bloquear na API;
* cobrir com testes automatizados.

### 6.3 Exposição de dados sensíveis em painéis públicos

Risco:
Telefone, CPF ou situação de pagamento aparecerem em telas visíveis por clientes.

Mitigação:

* criar DTOs de resposta distintos por contexto;
* não reaproveitar diretamente payload administrativo em painel público;
* filtrar no back-end.

### 6.4 Histórico incompleto

Risco:
A alteração do atendimento ser salva, mas o histórico falhar.

Mitigação:

* atendimento e histórico devem ser gravados na mesma transação.

### 6.5 Dependência excessiva do Socket.io

Risco:
Telas perderem sincronização se o evento falhar.

Mitigação:

* front-end sempre refaz consulta após evento;
* telas críticas podem ter polling leve de contingência no futuro, se necessário.

### 6.6 Dados duplicados de clientes e motos

Risco:
Cadastros repetidos por pressa operacional.

Mitigação:

* busca por nome/telefone/CPF antes de cadastrar cliente;
* busca por placa e combinação cliente + modelo antes de cadastrar moto;
* alertas de duplicidade.

### 6.7 Escopo de relatório crescer cedo demais

Risco:
Relatório simples virar módulo analítico antes da hora.

Mitigação:

* limitar a listagem a filtros e colunas aprovados;
* evitar indicadores, ranking e tempos médios nesta fase.

---

## 7. Proposta de arquitetura

## 7.1 Visão geral

Arquitetura proposta:

* `frontend/`: aplicação React com React Router, Axios e Socket.io Client.
* `backend/`: API REST em Node.js + Express, autenticação JWT, Socket.io e upload de arquivos.
* `mysql`: banco relacional principal.
* `uploads/`: armazenamento local inicial para fotos dos mecânicos.

Fluxo macro:

1. Usuário autentica via API.
2. Front-end consome rotas REST protegidas.
3. Mudanças críticas são persistidas no MySQL.
4. O back-end emite eventos Socket.io.
5. Clientes conectados recebem aviso e atualizam dados consultando a API.

## 7.2 Back-end em camadas

Camadas propostas:

* `routes`: mapeamento HTTP.
* `middlewares`: autenticação, autorização, tratamento de erro, upload.
* `controllers`: tradução entre HTTP e serviços.
* `services`: regras de negócio e transações.
* `repositories`: consultas SQL.
* `validators`: validação de payload.
* `sockets`: organização dos eventos em tempo real.
* `database`: conexão, migrations, seeds.

## 7.3 Front-end por contexto

Áreas funcionais propostas:

* autenticação;
* cadastros;
* recepção;
* oficina administrativa;
* painéis visuais;
* relatórios.

## 7.4 Estratégia de deploy futura

Quando sair do ambiente local:

* Nginx como proxy reverso;
* PM2 para processos Node;
* MySQL persistente;
* HTTPS;
* backup automático do banco;
* pasta de uploads com política de persistência.

---

## 8. Modelo inicial do banco MySQL

## 8.1 Entidades principais

Tabelas previstas:

* `usuarios`
* `clientes`
* `motocicletas`
* `mecanicos`
* `atendimentos`
* `historico_atendimentos`

Opcional futura, mas não obrigatória nesta fase:

* `refresh_tokens` se houver necessidade de sessão estendida;
* `arquivos_upload` caso o sistema passe a centralizar metadados de arquivos.

## 8.2 Tabela `usuarios`

Campos sugeridos:

* `id` BIGINT PK
* `nome` VARCHAR(120) NOT NULL
* `email` VARCHAR(160) NOT NULL UNIQUE
* `senha_hash` VARCHAR(255) NOT NULL
* `perfil` ENUM('ADMIN','RECEPCAO','OFICINA') NOT NULL
* `ativo` BOOLEAN NOT NULL DEFAULT TRUE
* `ultimo_login_em` DATETIME NULL
* `criado_em` DATETIME NOT NULL
* `atualizado_em` DATETIME NOT NULL

Índices:

* `uk_usuarios_email`
* `idx_usuarios_perfil_ativo`

## 8.3 Tabela `clientes`

Campos sugeridos:

* `id` BIGINT PK
* `nome` VARCHAR(160) NOT NULL
* `telefone` VARCHAR(20) NULL
* `cpf` VARCHAR(14) NULL
* `observacoes` TEXT NULL
* `ativo` BOOLEAN NOT NULL DEFAULT TRUE
* `criado_em` DATETIME NOT NULL
* `atualizado_em` DATETIME NOT NULL

Índices:

* `idx_clientes_nome`
* `idx_clientes_telefone`
* `uk_clientes_cpf` com tratamento para nulos conforme estratégia adotada

Observação:
Mesmo com CPF opcional, ele deve ser único quando preenchido.
Se houver coincidência com cliente inativo, a interface deve sugerir reativação em vez de criar novo cadastro.

## 8.4 Tabela `motocicletas`

Campos sugeridos:

* `id` BIGINT PK
* `cliente_id` BIGINT NOT NULL FK
* `marca` VARCHAR(80) NULL
* `modelo` VARCHAR(120) NOT NULL
* `cor` VARCHAR(50) NULL
* `placa` VARCHAR(10) NULL
* `km` INT NULL
* `observacoes` TEXT NULL
* `ativo` BOOLEAN NOT NULL DEFAULT TRUE
* `criado_em` DATETIME NOT NULL
* `atualizado_em` DATETIME NOT NULL

Índices:

* `idx_motocicletas_cliente_id`
* `idx_motocicletas_modelo`
* `idx_motocicletas_placa`

Observação:
Placa é única quando preenchida entre motocicletas ativas.
Na busca de duplicidade, a comparação deve ignorar maiúsculas, minúsculas, espaços e hífen.
Se houver coincidência com motocicleta inativa, a interface deve sugerir reativação em vez de criar novo cadastro.

## 8.5 Tabela `mecanicos`

Campos sugeridos:

* `id` BIGINT PK
* `nome` VARCHAR(120) NOT NULL
* `foto_url` VARCHAR(255) NULL
* `ativo` BOOLEAN NOT NULL DEFAULT TRUE
* `ordem_exibicao` INT NOT NULL DEFAULT 0
* `criado_em` DATETIME NOT NULL
* `atualizado_em` DATETIME NOT NULL

Índices:

* `idx_mecanicos_ativo_ordem`

## 8.6 Tabela `atendimentos`

Campos sugeridos:

* `id` BIGINT PK
* `numero_os` VARCHAR(30) NOT NULL UNIQUE
* `cliente_id` BIGINT NOT NULL FK
* `motocicleta_id` BIGINT NOT NULL FK
* `mecanico_id` BIGINT NULL FK
* `problema_servico` TEXT NOT NULL
* `observacoes` TEXT NULL
* `observacoes_internas` TEXT NULL
* `status` ENUM('AGUARDANDO','EM_SERVICO','AGUARDANDO_PECAS','SAIDA_PARA_TESTE','SERVICO_CONCLUIDO','PODE_RETIRAR','FINALIZADO','CANCELADO') NOT NULL
* `situacao_pagamento` ENUM('PENDENTE','PAGO') NOT NULL DEFAULT 'PENDENTE'
* `entrada_em` DATETIME NOT NULL
* `assumido_em` DATETIME NULL
* `servico_concluido_em` DATETIME NULL
* `pagamento_confirmado_em` DATETIME NULL
* `pagamento_confirmado_por` BIGINT NULL FK `usuarios.id`
* `liberado_retirada_em` DATETIME NULL
* `retirada_confirmada_em` DATETIME NULL
* `finalizado_em` DATETIME NULL
* `cancelado_em` DATETIME NULL
* `ordem_fila` BIGINT NULL
* `criado_por` BIGINT NOT NULL FK `usuarios.id`
* `criado_em` DATETIME NOT NULL
* `atualizado_em` DATETIME NOT NULL

Índices:

* `uk_atendimentos_numero_os`
* `idx_atendimentos_status`
* `idx_atendimentos_mecanico_id`
* `idx_atendimentos_entrada_em`
* `idx_atendimentos_status_entrada_em`
* `idx_atendimentos_pagamento`

Regra de ouro:
Somente atendimentos com `status = AGUARDANDO` participam da fila ativa.

Regra adicional:
O `numero_os` deve ser gerado no formato `OS-AAAA-NNNNNN`, com sequência crescente e possibilidade de reinício anual.

## 8.7 Tabela `historico_atendimentos`

Campos sugeridos:

* `id` BIGINT PK
* `atendimento_id` BIGINT NOT NULL FK
* `usuario_id` BIGINT NULL FK
* `mecanico_id` BIGINT NULL FK
* `acao` ENUM('CRIADO','ENVIADO_PARA_FILA','ASSUMIDO','STATUS_ALTERADO','RETORNADO_PARA_FILA','SERVICO_CONCLUIDO','PAGAMENTO_CONFIRMADO','LIBERADO_PARA_RETIRADA','RETIRADA_CONFIRMADA','FINALIZADO','CANCELADO') NOT NULL
* `status_anterior` VARCHAR(40) NULL
* `status_novo` VARCHAR(40) NULL
* `observacao` TEXT NULL
* `criado_em` DATETIME NOT NULL

Índices:

* `idx_historico_atendimento_id`
* `idx_historico_criado_em`
* `idx_historico_acao`

## 8.8 Relacionamentos

* Um `cliente` possui muitas `motocicletas`.
* Um `cliente` possui muitos `atendimentos`.
* Uma `motocicleta` possui muitos `atendimentos`.
* Um `mecanico` pode estar vinculado a muitos `atendimentos` ao longo do tempo.
* Um `atendimento` possui muitos registros em `historico_atendimentos`.
* Um `usuario` pode criar atendimentos e confirmar pagamentos.

## 8.9 Regras de integridade

* Não permitir `mecanico_id` preenchido quando status for `AGUARDANDO`, salvo inconsistência histórica que deve ser tratada como erro.
* Não permitir `PODE_RETIRAR` com `situacao_pagamento = PENDENTE`.
* Não permitir alterar pagamento por perfil `OFICINA`.
* Não permitir alteração operacional em atendimento `FINALIZADO` ou `CANCELADO`.
* Permitir `PODE_RETIRAR` para perfil `OFICINA` somente quando o status atual for `SERVICO_CONCLUIDO` e `situacao_pagamento = PAGO`.
* `confirmar-retirada` deve marcar o atendimento como `FINALIZADO`.
* Toda mudança importante deve gerar histórico na mesma transação.

---

## 9. Estrutura de pastas proposta

## 9.1 Back-end

```text
backend/
  src/
    app.js
    server.js
    config/
      env.js
      jwt.js
      upload.js
    controllers/
      authController.js
      clienteController.js
      motocicletaController.js
      mecanicoController.js
      atendimentoController.js
      painelController.js
      relatorioController.js
      usuarioController.js
    services/
      authService.js
      clienteService.js
      motocicletaService.js
      mecanicoService.js
      atendimentoService.js
      painelService.js
      relatorioService.js
      historicoService.js
      usuarioService.js
    repositories/
      clienteRepository.js
      motocicletaRepository.js
      mecanicoRepository.js
      atendimentoRepository.js
      historicoRepository.js
      usuarioRepository.js
    routes/
      authRoutes.js
      clienteRoutes.js
      motocicletaRoutes.js
      mecanicoRoutes.js
      atendimentoRoutes.js
      painelRoutes.js
      relatorioRoutes.js
      usuarioRoutes.js
      index.js
    middlewares/
      authMiddleware.js
      roleMiddleware.js
      errorMiddleware.js
      uploadMiddleware.js
    validators/
      authValidator.js
      clienteValidator.js
      motocicletaValidator.js
      mecanicoValidator.js
      atendimentoValidator.js
      relatorioValidator.js
    sockets/
      index.js
      atendimentoEvents.js
    database/
      connection.js
      migrations/
      seeds/
    utils/
      apiError.js
      cpf.js
      placa.js
      osNumber.js
      pagination.js
      date.js
  uploads/
    mecanicos/
  tests/
  .env.example
  package.json
  README.md
```

## 9.2 Front-end

```text
frontend/
  src/
    main.jsx
    App.jsx
    api/
      axios.js
    pages/
      LoginPage.jsx
      DashboardPage.jsx
      ClientesPage.jsx
      MotocicletasPage.jsx
      MecanicosPage.jsx
      NovoAtendimentoPage.jsx
      AtendimentosPage.jsx
      OficinaAdminPage.jsx
      PainelOficinaPage.jsx
      PainelClientesPage.jsx
      RelatorioAtendimentosPage.jsx
    components/
      layout/
      auth/
      clientes/
      motocicletas/
      mecanicos/
      atendimentos/
      oficina/
      paineis/
      relatorios/
      common/
    contexts/
      AuthContext.jsx
      SocketContext.jsx
    hooks/
      useAuth.js
      useSocket.js
      useRealtimeRefresh.js
    layouts/
      AppLayout.jsx
      PublicPanelLayout.jsx
    routes/
      AppRouter.jsx
      ProtectedRoute.jsx
      RoleRoute.jsx
    services/
      authService.js
      clienteService.js
      motocicletaService.js
      mecanicoService.js
      atendimentoService.js
      painelService.js
      relatorioService.js
    socket/
      socketClient.js
      socketEvents.js
    styles/
      variables.css
      globals.css
      theme.css
    utils/
      formatters.js
      masks.js
      status.js
      permissions.js
  public/
  .env.example
  package.json
  README.md
```

## 9.3 Observações estruturais

* `Dashboard` pode ser simples na primeira versão, servindo como navegação.
* `AtendimentosPage` pode concentrar busca, histórico e visão administrativa resumida.
* `OficinaAdminPage` será a tela operacional principal do setor oficina.
* Os painéis públicos devem ser independentes da UI administrativa.

---

## 10. Lista de rotas da API

## 10.1 Autenticação

* `POST /api/auth/login`
* `GET /api/auth/me`

## 10.2 Usuários

Rotas adicionais recomendadas para o perfil `ADMIN`:

* `GET /api/usuarios`
* `POST /api/usuarios`
* `PUT /api/usuarios/:id`
* `PATCH /api/usuarios/:id/status`

Observação:
O escopo fala em criar e editar usuários, então essas rotas precisam existir mesmo que não tenham sido listadas originalmente.

## 10.3 Clientes

* `GET /api/clientes`
* `GET /api/clientes/:id`
* `POST /api/clientes`
* `PUT /api/clientes/:id`
* `PATCH /api/clientes/:id/status`
* `PATCH /api/clientes/:id/reativar`

## 10.4 Motocicletas

* `GET /api/motocicletas`
* `GET /api/motocicletas/:id`
* `GET /api/clientes/:clienteId/motocicletas`
* `POST /api/motocicletas`
* `PUT /api/motocicletas/:id`
* `PATCH /api/motocicletas/:id/status`
* `PATCH /api/motocicletas/:id/reativar`

## 10.5 Mecânicos

* `GET /api/mecanicos`
* `GET /api/mecanicos/:id`
* `POST /api/mecanicos`
* `PUT /api/mecanicos/:id`
* `PATCH /api/mecanicos/:id/status`
* `PATCH /api/mecanicos/:id/reativar`

## 10.6 Atendimentos

* `GET /api/atendimentos`
* `GET /api/atendimentos/:id`
* `GET /api/atendimentos/:id/historico`
* `POST /api/atendimentos`
* `PATCH /api/atendimentos/:id/assumir`
* `PATCH /api/atendimentos/:id/status`
* `PATCH /api/atendimentos/:id/retornar-fila`
* `PATCH /api/atendimentos/:id/concluir-servico`
* `PATCH /api/atendimentos/:id/confirmar-pagamento`
* `PATCH /api/atendimentos/:id/liberar-retirada`
* `PATCH /api/atendimentos/:id/confirmar-retirada`
* `PATCH /api/atendimentos/:id/cancelar`

## 10.7 Painéis

* `GET /api/paineis/oficina`
* `GET /api/paineis/clientes`

## 10.8 Relatórios

* `GET /api/relatorios/atendimentos`

## 10.9 Considerações REST

* Todas as rotas autenticadas devem exigir JWT, exceto login e, se desejado, o painel público de clientes.
* As rotas de painéis podem retornar payloads específicos para evitar vazamento de dados.
* `PATCH /status` deve ser restrito aos status permitidos por regra de transição, não pode ser um atalho irrestrito.
* A busca por `numero_os` deve existir apenas nas telas e rotas administrativas/internas.

---

## 11. Matriz de permissões

Legenda:

* `S`: permitido
* `N`: não permitido
* `C`: permitido com condição

| Ação | ADMIN | RECEPCAO | OFICINA |
| --- | --- | --- | --- |
| Login no sistema | S | S | S |
| Criar usuário | S | N | N |
| Editar usuário | S | N | N |
| Inativar usuário | S | N | N |
| Cadastrar cliente | S | S | N |
| Editar cliente | S | S | N |
| Ver telefone | S | S | N |
| Ver CPF | S | S | N |
| Cadastrar motocicleta | S | S | N |
| Editar motocicleta | S | S | N |
| Cadastrar mecânico | S | N | N |
| Editar mecânico | S | N | N |
| Criar atendimento | S | S | N |
| Ver fila | S | S | S |
| Ver cards dos mecânicos | S | S | S |
| Assumir atendimento | S | N | S |
| Alterar status operacional | S | N | S |
| Retornar atendimento para fila | S | N | S |
| Concluir serviço | S | N | S |
| Ver situação de pagamento | S | S | S |
| Alterar situação de pagamento | S | S | N |
| Confirmar pagamento | S | S | N |
| Liberar para retirada | S | S | C |
| Confirmar retirada | S | S | N |
| Finalizar atendimento | S | S | N |
| Cancelar atendimento | S | S | N |
| Ver histórico completo | S | S | N |
| Ver dados operacionais do atendimento atual | S | S | S |
| Ver relatório simples | S | S | N |
| Ver painel interno | S | S | S |
| Ver painel de clientes | S | S | S |
| Reativar cliente | S | S | N |
| Reativar motocicleta | S | S | N |
| Reativar mecânico | S | N | N |

Condições aplicáveis:

* `Liberar para retirada` para `OFICINA`: permitido somente quando o status atual for `SERVICO_CONCLUIDO` e o pagamento estiver `PAGO`.

Matriz operacional recomendada para a primeira implementação:

* `ADMIN`: acesso total.
* `RECEPCAO`: cadastra, confirma pagamento, libera retirada, confirma retirada, consulta histórico completo e reativa cliente ou motocicleta.
* `OFICINA`: assume, altera status, retorna fila, conclui serviço, pode liberar retirada quando pago e visualiza pagamento apenas como `PAGO` ou `PENDENTE`.

---

## 12. Fluxo completo dos status

## 12.1 Status válidos

* `AGUARDANDO`
* `EM_SERVICO`
* `AGUARDANDO_PECAS`
* `SAIDA_PARA_TESTE`
* `SERVICO_CONCLUIDO`
* `PODE_RETIRAR`
* `FINALIZADO`
* `CANCELADO`

## 12.2 Fluxo principal recomendado

```text
CRIACAO DO ATENDIMENTO
  -> AGUARDANDO

AGUARDANDO
  -> EM_SERVICO
  -> CANCELADO

EM_SERVICO
  -> AGUARDANDO_PECAS
  -> SAIDA_PARA_TESTE
  -> SERVICO_CONCLUIDO
  -> AGUARDANDO (retorno para fila)
  -> CANCELADO

AGUARDANDO_PECAS
  -> EM_SERVICO
  -> SAIDA_PARA_TESTE
  -> SERVICO_CONCLUIDO
  -> AGUARDANDO (retorno para fila)
  -> CANCELADO

SAIDA_PARA_TESTE
  -> EM_SERVICO
  -> SERVICO_CONCLUIDO
  -> AGUARDANDO (retorno para fila)
  -> CANCELADO

SERVICO_CONCLUIDO
  -> PODE_RETIRAR (somente se pagamento = PAGO e houver confirmacao explicita)
  -> CANCELADO

PODE_RETIRAR
  -> FINALIZADO

FINALIZADO
  -> sem transições

CANCELADO
  -> sem transições
```

## 12.3 Regras adicionais de transição

* Criar atendimento sempre inicia em `AGUARDANDO`.
* Ao assumir atendimento, o status muda para `EM_SERVICO`.
* `AGUARDANDO_PECAS` e `SAIDA_PARA_TESTE` mantêm o vínculo com o mecânico.
* `RETORNAR PARA A FILA` remove `mecanico_id` e volta para `AGUARDANDO`.
* `SERVICO_CONCLUIDO` não libera retirada automaticamente.
* `PODE_RETIRAR` só é permitido com pagamento confirmado.
* `FINALIZADO` é alcançado pela ação `CONFIRMAR RETIRADA`.
* `FINALIZADO` e `CANCELADO` encerram o fluxo ativo.

---

## 13. Fluxo de pagamento e liberação

## 13.1 Regras centrais

* Situação de pagamento possui apenas `PENDENTE` e `PAGO`.
* `OFICINA` visualiza essa informação e pode liberar retirada somente quando ela já estiver `PAGO`.
* `ADMIN` e `RECEPCAO` podem alterar para `PAGO`.
* Nenhum atendimento com pagamento pendente pode ir para `PODE_RETIRAR`.

## 13.2 Fluxo recomendado

```text
Atendimento criado
  -> situacao_pagamento = PENDENTE ou PAGO

Servico concluido
  -> status = SERVICO_CONCLUIDO

Se situacao_pagamento = PENDENTE
  -> bloquear liberacao
  -> exibir alerta operacional

Recepcao/Admin confirma pagamento
  -> situacao_pagamento = PAGO
  -> registrar pagamento_confirmado_em
  -> registrar pagamento_confirmado_por
  -> registrar historico

Oficina/Admin/Recepcao confirma liberacao para retirada
  -> status = PODE_RETIRAR
  -> registrar liberado_retirada_em
  -> registrar historico

Recepcao/Admin confirma retirada
  -> status = FINALIZADO
  -> registrar retirada_confirmada_em
  -> registrar finalizado_em
  -> registrar historico
```

## 13.3 Mensagem operacional obrigatória

Quando o atendimento estiver com serviço concluído e pagamento pendente, a oficina deve ver um alerta claro:

`PAGAMENTO PENDENTE`

`O servico foi concluido, mas esta motocicleta ainda nao esta liberada para retirada. Oriente o cliente a procurar a recepcao.`

Quando o atendimento estiver com serviço concluído e pagamento confirmado, o sistema deve exibir uma confirmação explícita antes da mudança para `PODE_RETIRAR`:

`Servico concluido e pagamento confirmado. Deseja liberar a motocicleta para retirada?`

Observação:
Na implementação, a mensagem pode ser exibida com acentuação correta. Aqui foi mantida a ideia textual da regra.

---

## 14. Fluxo de retorno para a fila

## 14.1 Objetivo

Permitir interrupção do atendimento sem cancelar a OS e sem perder prioridade histórica.

## 14.2 Passos obrigatórios

1. Validar que o atendimento está ativo e possui mecânico.
2. Remover `mecanico_id`.
3. Alterar status para `AGUARDANDO`.
4. Preservar a prioridade original usando `entrada_em`.
5. Registrar histórico com ação `RETORNADO_PARA_FILA`.
6. Emitir evento em tempo real.
7. Permitir novo aceite por outro mecânico.

## 14.3 Regra de ordenação

Ordem da fila recomendada:

1. `status = AGUARDANDO`
2. `entrada_em ASC`
3. `id ASC` como desempate técnico

Observação:
Se `ordem_fila` for mantido, ele deve espelhar a mesma prioridade, não substituí-la arbitrariamente.

---

## 15. Fluxos operacionais por tela

## 15.1 Tela da recepção

Fluxo:

1. Buscar cliente.
2. Selecionar cliente existente ou cadastrar novo.
3. Selecionar moto existente ou cadastrar nova.
4. Informar problema/serviço.
5. Informar observações.
6. Definir situação de pagamento inicial.
7. Salvar atendimento.
8. Sistema gera OS, registra histórico e insere na fila.

## 15.2 Tela administrativa da oficina

Fluxo:

1. Visualizar fila ordenada.
2. Selecionar atendimento e assumir em um card de mecânico.
3. Alterar status operacional conforme andamento.
4. Retornar para fila se necessário.
5. Concluir serviço.
6. Ver sinalização de pagamento.
7. Se o pagamento já estiver confirmado, liberar para retirada mediante confirmação.
8. Se o pagamento estiver pendente, orientar o cliente a procurar a recepção.

## 15.3 Painel da oficina

Fluxo:

* somente leitura;
* mostra fila, cards dos mecânicos, área de retirada e últimos concluídos;
* sem botões;
* por ser interno, pode mostrar sinalização operacional de pagamento;
* a situação de pagamento não precisa ficar visível o tempo todo, mas deve ganhar destaque principalmente quando o serviço estiver concluído;
* mostra os últimos 5 atendimentos finalizados.

## 15.4 Painel dos clientes

Fluxo:

* somente leitura;
* mostra estado público simplificado;
* mostra os últimos 3 atendimentos finalizados;
* nunca mostra pagamento, CPF, telefone ou observações internas.

---

## 16. Regras de exibição e privacidade

## 16.1 Dados que a oficina não deve ver

O perfil `OFICINA` não deve receber na resposta de API:

* CPF
* telefone
* valor de serviço
* forma de pagamento
* detalhes financeiros

O perfil `OFICINA` pode receber `observacoes_internas` apenas quando elas forem relevantes para a execução do serviço.

## 16.2 Dados que o painel de clientes não deve ver

O painel público não deve receber:

* CPF
* telefone
* situação de pagamento
* observações internas
* usuário responsável
* qualquer campo financeiro

## 16.3 DTOs recomendados

Criar respostas distintas:

* `AtendimentoAdminDTO`
* `AtendimentoRecepcaoDTO`
* `AtendimentoOficinaDTO`
* `PainelOficinaDTO`
* `PainelClientesDTO`
* `AtendimentoOficinaResumoDTO`

Isso evita reutilização insegura do mesmo objeto para todos os contextos.

---

## 17. Estratégia de eventos em tempo real

Eventos sugeridos e quando disparar:

* `atendimento:criado`: após criação da OS
* `atendimento:assumido`: após vincular mecânico
* `atendimento:status_alterado`: após mudança operacional
* `atendimento:retornado_fila`: após remover mecânico e voltar à fila
* `atendimento:servico_concluido`: após conclusão do serviço
* `atendimento:pagamento_confirmado`: após confirmação de pagamento
* `atendimento:liberado_retirada`: após mudança para `PODE_RETIRAR`
* `atendimento:retirada_confirmada`: após retirada
* `atendimento:finalizado`: pode ser emitido junto da retirada confirmada se as ações forem fundidas
* `atendimento:cancelado`: após cancelamento
* `fila:atualizada`: sempre que a fila for impactada
* `mecanico:atualizado`: quando distribuição visual dos cards mudar

Prática recomendada:

* emitir eventos após `commit` da transação;
* no front-end, ouvir evento e consultar novamente os dados relevantes.

---

## 18. Plano de implementação por etapas

## 18.1 Fase 1: base do projeto

Entregas:

* estrutura `frontend/` e `backend/`;
* configuração do Vite;
* configuração do Express;
* conexão MySQL;
* migrations iniciais;
* autenticação JWT;
* autorização por perfil;
* tratamento centralizado de erros;
* documentação básica de setup.

Critério de aceite:

* login funcional;
* `GET /api/auth/me` funcional;
* base pronta para CRUDs.

## 18.2 Fase 2: cadastros

Entregas:

* CRUD de clientes;
* CRUD de motocicletas;
* CRUD de mecânicos;
* upload de foto;
* validações de CPF e placa;
* inativação lógica.

Critério de aceite:

* recepção consegue cadastrar cliente e múltiplas motos;
* admin consegue cadastrar mecânico com foto.

## 18.3 Fase 3: núcleo do atendimento

Entregas:

* criação de atendimento;
* geração de OS;
* entrada automática na fila;
* assumir atendimento;
* alterar status;
* retornar para fila;
* histórico transacional.

Critério de aceite:

* fila ordenada corretamente;
* concorrência de aceite protegida;
* histórico completo dessas ações.

## 18.4 Fase 4: pagamento e retirada

Entregas:

* situação de pagamento;
* confirmação de pagamento;
* conclusão do serviço;
* bloqueio de retirada com pendência;
* liberação para retirada;
* confirmação de retirada/finalização;
* cancelamento.

Critério de aceite:

* API impede `PODE_RETIRAR` com pagamento pendente;
* oficina vê alerta de pendência;
* recepção consegue liberar corretamente.

## 18.5 Fase 5: telas operacionais

Entregas:

* login;
* cadastros;
* tela da recepção;
* tela administrativa da oficina;
* navegação por perfil.

Critério de aceite:

* fluxos essenciais executáveis pelo navegador.

## 18.6 Fase 6: tempo real e painéis

Entregas:

* integração Socket.io;
* atualização em tempo real;
* painel interno da oficina;
* painel de clientes.

Critério de aceite:

* múltiplas abas refletem mudanças rapidamente;
* painel público não expõe dados sensíveis.

## 18.7 Fase 7: relatório, testes e implantação

Entregas:

* relatório simples;
* revisão final de permissões;
* testes automatizados prioritários;
* preparação para VPS.

Critério de aceite:

* filtros essenciais funcionando;
* testes cobrindo regras críticas;
* documentação de deploy inicial pronta.

---

## 19. Lista de testes prioritários derivados do escopo

Testes críticos de regra:

* criar atendimento com status inicial `AGUARDANDO`;
* ordenar fila por antiguidade;
* impedir dois mecânicos de assumirem a mesma OS;
* permitir retorno para fila sem perder prioridade;
* bloquear `OFICINA` ao tentar confirmar pagamento;
* bloquear liberação com `situacao_pagamento = PENDENTE`;
* permitir `PODE_RETIRAR` somente com `SERVICO_CONCLUIDO` e `PAGO`;
* impedir alterações em `FINALIZADO`;
* impedir alterações em `CANCELADO`;
* garantir histórico em todas as transições críticas;
* garantir que painel de clientes não retorne dados sensíveis.

Testes importantes de persistência:

* reiniciar servidor e manter fila correta;
* manter vínculo histórico entre cliente, moto e atendimento;
* manter dados após upload de foto do mecânico.
* sugerir reativação de cliente ao encontrar CPF de cadastro inativo.
* sugerir reativação de motocicleta ao encontrar placa de cadastro inativo.
* impedir duplicidade de placa ativa ignorando caixa, espaço e hífen.
* permitir liberação para retirada pelo perfil `OFICINA` somente após pagamento confirmado.
* garantir que `confirmar-retirada` finalize o atendimento.

---

## 20. Situação das decisões e consistência atual

As decisões operacionais da seção anterior foram consolidadas e, neste momento, não há decisão funcional bloqueante remanescente para iniciar a implementação da Fase 1.

Consistência revisada:

* entidades: consistentes com a separação entre `usuarios` e `mecanicos`;
* banco: consistente com OS anual, reativação, pagamento simples e finalização por confirmação de retirada;
* permissões: consistentes com `OFICINA` sem cancelamento e sem histórico completo, mas com liberação condicionada quando pago;
* rotas: consistentes com reativação de cadastros, busca interna por OS e fluxo de retirada;
* fluxos: consistentes com `SERVICO_CONCLUIDO -> PODE_RETIRAR -> FINALIZADO`.

Pontos de atenção não bloqueantes:

1. Definir na implementação se a normalização da placa ficará em coluna derivada, em regra de aplicação ou em índice funcional do MySQL.
2. Definir se `ordem_fila` será mantido apenas por compatibilidade visual ou removido do banco para simplificar o modelo.
3. Definir se haverá endpoint específico para consulta operacional resumida da oficina ou se isso será resolvido por projeção da rota principal de atendimentos.

---

## 21. Recomendação final desta etapa

Com as definições recebidas, o documento já está suficientemente fechado para servir como base da Fase 1.

A recomendação agora é:

* aprovar formalmente esta versão do documento;
* manter as três observações da seção 20 como decisões técnicas de implementação, não como bloqueios de negócio;
* somente após essa aprovação iniciar a criação da estrutura do repositório e do esqueleto técnico.

---

## 22. Conclusão

O projeto está maduro o suficiente para sair da etapa de levantamento e entrar em construção. As definições fornecidas resolveram as ambiguidades principais sobre login da oficina, separação entre usuário e mecânico, cancelamento, histórico, liberação para retirada, finalização, unicidade e reativação.

Este documento deve ser usado como referência formal da Fase 1 e revisado antes de qualquer desenvolvimento funcional.
