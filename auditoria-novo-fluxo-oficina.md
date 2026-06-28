# Auditoria Tecnica: Novo Fluxo da Oficina

## Escopo desta auditoria

Esta analise foi feita em modo leitura. Nao houve alteracao de backend, frontend, banco, migrations, dependencias, rotas, servicos, telas ou instalacoes.

Esta versao ampliada considera o nucleo funcional contratado, incluindo:

- OS com varios itens independentes;
- diagnostico por queixa;
- orcamento com revisoes e autorizacoes;
- execucao por item;
- varios mecanicos por item e por motocicleta;
- aguardando peca por item;
- prioridade operacional;
- garantia por item executado;
- prontuario consolidado da motocicleta;
- fotos iniciais da entrada;
- comunicacao manual via WhatsApp, sem automacao de envio;
- nao armazenamento de videos.

## Situacao objetiva antes desta ampliacao

1. Arquivos alterados antes da correcao de escopo: nenhum.
2. Migrations criadas: nenhuma.
3. Dependencias instaladas: nenhuma.
4. Comandos que modificaram o projeto antes da auditoria: nenhum.
5. Arquivos alterados antes da auditoria: nenhum.

## Estado atual do sistema

O sistema atual possui um nucleo operacional simples e funcional, desenhado para um atendimento linear de oficina.

O fluxo atual e este:

1. a recepcao cria ou atualiza cliente;
2. a recepcao cria ou atualiza motocicleta;
3. a recepcao cria um registro em `atendimentos`;
4. a OS entra na fila com status unico;
5. um mecanico assume o atendimento;
6. o atendimento passa por um pequeno conjunto de status operacionais;
7. a oficina conclui o servico;
8. a recepcao confirma pagamento;
9. a motocicleta e liberada e finalizada.

Esse desenho atende bem um fluxo "uma OS, um conjunto unico de servicos, um responsavel principal, um status dominante".

O novo nucleo contratado nao e mais linear. Ele e multi-item, multi-fase e parcialmente paralelo.

## Estrutura atual da solucao

### Backend

Estrutura principal observada:

- `backend/src/routes`
- `backend/src/controllers`
- `backend/src/services`
- `backend/src/repositories`
- `backend/src/database/migrations`
- `backend/src/utils/atendimentoDtos.js`
- `backend/src/config/upload.js`
- `backend/src/sockets/index.js`

### Frontend

Estrutura principal observada:

- `frontend/src/pages/RecepcaoPage.jsx`
- `frontend/src/pages/OficinaAdminPage.jsx`
- `frontend/src/pages/AtendimentosPage.jsx`
- `frontend/src/pages/RelatorioPage.jsx`
- `frontend/src/services/atendimentoService.js`
- `frontend/src/hooks/useRealtimeRefresh.js`
- `frontend/src/socket/socketEvents.js`

### Realtime

O Socket.io atual emite eventos operacionais globais:

- `atendimento:criado`
- `atendimento:assumido`
- `atendimento:status_alterado`
- `atendimento:retornado_fila`
- `atendimento:servico_concluido`
- `atendimento:pagamento_confirmado`
- `atendimento:liberado_retirada`
- `atendimento:retirada_confirmada`
- `atendimento:finalizado`
- `atendimento:cancelado`
- `fila:atualizada`
- `mecanico:atualizado`

Esse catalogo esta adequado para o fluxo atual, mas insuficiente para o novo nucleo itemizado.

## Tabelas e relacionamentos existentes

### Tabelas identificadas

1. `usuarios`
2. `clientes`
3. `motocicletas`
4. `mecanicos`
5. `controle_sequencias_os`
6. `atendimentos`
7. `historico_atendimentos`

### Relacionamentos atuais

- `motocicletas.cliente_id -> clientes.id`
- `atendimentos.cliente_id -> clientes.id`
- `atendimentos.motocicleta_id -> motocicletas.id`
- `atendimentos.mecanico_id -> mecanicos.id`
- `atendimentos.pagamento_confirmado_por -> usuarios.id`
- `atendimentos.criado_por -> usuarios.id`
- `historico_atendimentos.atendimento_id -> atendimentos.id`
- `historico_atendimentos.usuario_id -> usuarios.id`
- `historico_atendimentos.mecanico_id -> mecanicos.id`

### Observacao estrutural principal

Hoje `atendimentos` acumula ao mesmo tempo o papel de:

- ordem de servico;
- fila;
- status operacional;
- pagamento;
- atribuicao de mecanico;
- trilha principal da oficina.

Esse acoplamento e justamente o ponto mais forte no fluxo atual e o principal limite para o novo fluxo.

## Avaliacao profunda do novo nucleo funcional

## 1. OS com varios itens independentes

O sistema atual nao modela itens independentes dentro de uma mesma OS.

Hoje existe apenas:

- `problema_servico`
- `observacoes`
- `servico_executado`

Esses campos sao textuais e agregados. Eles nao permitem representar de forma estruturada:

- troca de oleo;
- troca da relacao;
- diagnostico da queixa "moto falhando";
- autorizacao parcial;
- execucao de um item enquanto outro aguarda peca;
- pagamento de um item sem pagamento de outro.

### Conclusao

Uma OS multi-item nao cabe tecnicamente no desenho atual apenas expandindo texto em `atendimentos`.

Os itens precisam de entidade propria.

## 2. Informacoes proprias por item

Cada item contratado precisa de atributos autonomos:

- descricao;
- tipo;
- exige diagnostico;
- execucao direta;
- autorizado;
- situacao de pagamento;
- status;
- mecanico principal;
- mecanicos auxiliares;
- iniciado em;
- finalizado em;
- garantia.

### Avaliacao do estado atual

Nada disso existe como estrutura por item.

Hoje o sistema so possui:

- um status da OS;
- uma situacao de pagamento da OS;
- um mecanico principal da OS;
- um `servico_executado` textual da OS.

### Conclusao

O modelo atual nao representa o item como unidade de negocio. Portanto, ele nao suporta o novo nucleo sem reestruturacao.

## 3. Simultaneidade de estados na mesma motocicleta

O novo fluxo permite coexistencia de situacoes como:

- item autorizado pronto para execucao;
- queixa aguardando diagnostico;
- item aguardando orcamento;
- item aguardando autorizacao;
- item aguardando peca.

### Avaliacao de `atendimentos.status`

Hoje `atendimentos.status` e unico e global. O enum atual e:

- `AGUARDANDO`
- `EM_SERVICO`
- `AGUARDANDO_PECAS`
- `SAIDA_PARA_TESTE`
- `SERVICO_CONCLUIDO`
- `PODE_RETIRAR`
- `FINALIZADO`
- `CANCELADO`

Esse desenho pressupoe que a OS inteira esta em um estado dominante por vez.

No novo fluxo isso deixa de ser verdadeiro.

Exemplo:

- item A: troca de oleo, autorizado, pronto para execucao;
- item B: relacao, aguardando autorizacao;
- item C: queixa de falha, aguardando diagnostico.

Nao existe um unico status de OS que descreva isso com fidelidade.

### Conclusao objetiva

Um unico `atendimentos.status` nao suporta o novo nucleo como fonte principal de verdade operacional.

Ele ate pode continuar existindo no futuro como:

- status agregado;
- status resumido para painel;
- fase geral da OS;

mas nao como estado central do processo.

## 4. Avaliacao de `atendimentos.mecanico_id`

O novo fluxo permite:

- varios mecanicos na mesma moto;
- mecanicos em itens diferentes;
- um mecanico principal por item;
- auxiliares no mesmo item.

### Estado atual

Hoje existe apenas `atendimentos.mecanico_id`.

Isso implica:

- um mecanico dominante por atendimento;
- impossibilidade estrutural de auxiliares;
- impossibilidade de alocar mecanicos distintos por item;
- impossibilidade de rastrear participacao multipla com precisao.

### Conclusao objetiva

`atendimentos.mecanico_id` nao e mais suficiente.

Ele so continua util, no maximo, como:

- responsavel principal agregado da OS;
- mecanico "lider" exibido em painel resumido.

Mas a execucao real precisa sair desse modelo e ir para entidades por item e vinculacoes N:N.

## 5. Dominio de diagnostico

O dominio contratado exige:

- queixa;
- causa identificada;
- descricao tecnica;
- servicos sugeridos;
- pecas sugeridas;
- mecanicos envolvidos;
- envio manual via WhatsApp ao orcamentista.

### Estado atual

Hoje o sistema nao possui:

- entidade de diagnostico;
- etapa formal de diagnostico;
- autoria tecnica do diagnostico;
- estrutura para servicos sugeridos;
- estrutura para pecas sugeridas;
- versao ou revisao do diagnostico;
- log proprio de envio ao orcamentista.

O mais proximo disso e o campo textual `problema_servico`, que mistura queixa, pedido e descricao livre.

### Avaliacao tecnica

O diagnostico e um dominio proprio, nao apenas um texto complementar.

Ele precisa separar pelo menos:

- o que o cliente relatou;
- o que a oficina encontrou;
- o que tecnicamente recomenda;
- quem participou da avaliacao;
- quando isso foi formalizado;
- para qual fluxo de orcamento isso foi encaminhado.

### Conclusao

O sistema atual nao possui nucleo de diagnostico. Esse dominio precisa ser criado como modulo proprio.

## 6. Dominio de orcamento

O dominio contratado exige:

- orcamentista responsavel;
- numero externo obrigatorio no formato `#99999`;
- itens do orcamento;
- valores;
- PDF;
- revisoes;
- autorizacao total;
- autorizacao parcial;
- recusa;
- aguardando resposta;
- arquivamento.

### Estado atual

Nao existe:

- entidade de orcamento;
- campo de numero externo;
- versao de orcamento;
- itens orcados;
- totalizacao;
- estado de resposta do cliente;
- autoria do orcamentista;
- controle de revisoes;
- relacao formal com PDF.

### Avaliacao tecnica

Orcamento nao pode ser modelado como mero detalhe de atendimento porque:

- pode ter varias revisoes;
- pode ter resposta parcial;
- pode ter itens aprovados e itens recusados;
- pode nascer de um diagnostico;
- pode ter numero externo obrigatorio;
- pode gerar um PDF;
- pode continuar existindo no prontuario depois da OS.

### Conclusao

O dominio de orcamento precisa de entidade propria e itens proprios. Nao cabe como extensao textual do atendimento.

## 7. Relacao entre solicitados, autorizados, pagos, diagnosticados, orcados, executados e garantidos

O novo fluxo exige distinguir claramente:

- itens solicitados;
- itens diagnosticados;
- itens orcados;
- itens autorizados;
- itens pagos;
- itens executados;
- itens em garantia.

### Estado atual

O sistema atual mistura varios desses conceitos em tres lugares:

- `problema_servico`
- `status`
- `situacao_pagamento`

Isso elimina rastreabilidade fina.

### Problema central

Autorizacao e pagamento nao sao o mesmo conceito.

O modelo atual trabalha fortemente em nivel de OS:

- status global;
- pagamento global.

No novo fluxo, o correto e admitir que:

- um item pode estar autorizado e nao pago;
- um item pode estar pago e ainda nao executado;
- um item pode ser recusado;
- outro pode ser aprovado parcialmente;
- outro pode existir como queixa sem servico autorizado.

### Conclusao

Esses conceitos precisam de trilhas separadas por item. O sistema atual nao tem granularidade suficiente.

## 8. Fluxo de aguardando peca

O novo fluxo exige por item:

- aguardando peca;
- previsao de chegada;
- alteracao da previsao;
- contagem regressiva;
- retorno para execucao.

### Estado atual

Hoje existe apenas o status global `AGUARDANDO_PECAS`.

Nao existe:

- previsao por item;
- historico de alteracao de previsao;
- mais de uma previsao na mesma OS;
- retorno seletivo de item para execucao;
- visao de atraso de peca.

### Conclusao

`AGUARDANDO_PECAS` como status de OS e insuficiente. Aguardando peca precisa ser um estado por item, associado a previsao e historico proprio.

## 9. Prioridades

O novo fluxo exige:

- prioridade manual;
- data prometida ao cliente;
- prazo restante;
- atraso;
- fila de prioridade separada da ordem normal.

### Estado atual

Hoje a fila se apoia essencialmente em:

- `entrada_em`
- `ordem_fila` como compatibilidade visual

Nao existe:

- prioridade operacional explicita;
- SLA prometido;
- calculo de atraso;
- ordenacao por risco de prazo;
- fila separada por urgencia.

### Conclusao

O sistema atual possui uma fila cronologica simples. O novo fluxo exige motor de priorizacao. Isso vai alem de um campo adicional em `atendimentos`.

## 10. Garantia por item

O novo fluxo exige:

- garantia de 90 dias por item executado;
- inicio e fim;
- contagem regressiva;
- consulta no prontuario da motocicleta;
- possibilidade futura de regras diferentes por servico.

### Estado atual

Nao existe:

- entidade de garantia;
- data de inicio/fim por item;
- regras por tipo de servico;
- consulta de garantia por motocicleta;
- visao de garantias ativas e expiradas.

### Avaliacao tecnica

Garantia por item nao combina com texto livre em `servico_executado`.

Ela depende de:

- item executado identificado;
- data real de conclusao;
- regra aplicada;
- status de vigencia.

### Conclusao

Garantia precisa ser um dominio proprio, ligado a item executado.

## 11. Prontuario da motocicleta

O prontuario contratado deve consolidar:

- ordens de servico;
- itens;
- diagnosticos;
- orcamentos;
- autorizacoes;
- servicos executados;
- mecanicos;
- fotos iniciais;
- garantias;
- historico.

### Estado atual

Hoje o sistema consegue recuperar:

- cliente;
- motocicleta;
- atendimentos;
- historico operacional do atendimento;
- mecanico principal da OS.

Ele nao consegue consolidar, porque ainda nao possui, os demais dominios.

### Conclusao

O prontuario deve ser tratado como visao agregada de varios dominios, nao como extensao simples da tela atual de atendimento.

## Avaliacao do banco diante do novo nucleo

## Tabela `atendimentos`

### O que ela faz bem hoje

- identifica a OS atual;
- liga cliente e motocicleta;
- guarda entrada e datas principais;
- permite operacao simples de fila e conclusao;
- sustenta o numero OS.

### Onde ela quebra no novo fluxo

- nao representa varios itens independentes;
- nao suporta varios status simultaneos;
- nao separa diagnostico, orcamento, autorizacao e execucao;
- nao suporta varios mecanicos por item;
- nao suporta pagamento por item;
- nao suporta garantia por item;
- nao suporta prioridade operacional detalhada;
- nao suporta prontuario rico.

### Conclusao

`atendimentos` nao deve continuar como centro absoluto do dominio. Ela pode ser base transitoria ou ser absorvida por uma nova entidade de OS.

## Historico atual

`historico_atendimentos` foi desenhado para eventos globais da OS:

- criado;
- assumido;
- status alterado;
- concluido;
- pagamento;
- retirada;
- cancelamento.

Isso e util, mas insuficiente para o novo fluxo, que precisara de historico por:

- item;
- diagnostico;
- orcamento;
- autorizacao;
- previsao de peca;
- garantia;
- comunicacao externa.

## Status atual

O enum atual de `atendimentos.status` e simples demais para um processo multi-item e multi-fase.

## Pagamento atual

`situacao_pagamento` em `atendimentos` e binaria no nivel da OS:

- `PENDENTE`
- `PAGO`

Isso nao suporta:

- itens pagos e nao pagos na mesma OS;
- autorizacao parcial sem pagamento;
- garantia sem relacao direta com pagamento total;
- controle financeiro itemizado.

## Mecanico unico atual

`atendimentos.mecanico_id` so atende o modelo de um responsavel unico por atendimento.

## Fila atual

A fila atual representa a OS inteira, nao os itens executaveis.

## Painel atual

Os paineis atuais exibem:

- fila;
- em servico;
- pode retirar;
- ultimos finalizados.

Eles dependem de um status unico e simples. O novo fluxo vai exigir indicadores agregados e filtros mais inteligentes.

## Tela da oficina atual

Ela distribui atendimento inteiro, nao item.

## Tela da recepcao atual

Ela abre atendimento inteiro, nao OS detalhada com itens, fotos, diagnostico e comunicacoes.

## Relatorios atuais

Os relatorios atuais usam `atendimentoRepository.list()` e filtram por:

- status;
- mecanico;
- periodo;
- situacao de pagamento;
- numero OS.

Esse modelo fica pobre demais para o novo nucleo.

## Socket.io atual

Ele emite eventos globais de atendimento, nao de item, diagnostico, orcamento ou previsao de peca.

## Matriz de reaproveitamento

### Classificacao solicitada

#### `tabela atendimentos`

- Classificacao: `SUBSTITUIR`
- Justificativa: nao precisa ser apagada imediatamente, mas deve deixar de ser a entidade central do dominio. O papel correto dela sera absorvido por uma nova modelagem de OS.

#### `historico`

- Classificacao: `REAPROVEITAR COM AJUSTES`
- Justificativa: a ideia de trilha operacional e valida, mas a tabela atual cobre so eventos globais. O conceito pode ser reaproveitado, a modelagem atual nao basta.

#### `status`

- Classificacao: `REFATORAR`
- Justificativa: o conceito continua necessario, mas sai do nivel unico da OS e precisa existir principalmente no nivel do item e de seus subdominios.

#### `pagamento`

- Classificacao: `REFATORAR`
- Justificativa: o conceito e valido, mas hoje esta binario e global. Precisa migrar para granularidade por item, sem confundir com autorizacao.

#### `mecanico unico`

- Classificacao: `SUBSTITUIR`
- Justificativa: o modelo de um unico `mecanico_id` por atendimento nao atende mais o processo real.

#### `fila`

- Classificacao: `REFATORAR`
- Justificativa: a fila atual e cronologica e global. O novo fluxo exige fila por prioridade e por item executavel.

#### `painel`

- Classificacao: `REAPROVEITAR COM AJUSTES`
- Justificativa: o painel como produto continua valido, mas seu modelo de dados precisa mudar profundamente.

#### `tela da oficina`

- Classificacao: `REFATORAR`
- Justificativa: a tela atual distribui atendimento inteiro. Ela precisa passar a operar itens, diagnosticos, previsoes e execucoes paralelas.

#### `tela da recepcao`

- Classificacao: `REFATORAR`
- Justificativa: a tela atual pode continuar como ponto de entrada, mas precisa abrir a OS de forma estruturada, com itens e fotos iniciais.

#### `relatorios`

- Classificacao: `REFATORAR`
- Justificativa: a base de relatorios por atendimento unico, status unico e mecanico unico nao atende o novo dominio.

#### `Socket.io`

- Classificacao: `REAPROVEITAR COM AJUSTES`
- Justificativa: a infraestrutura serve, mas os eventos e os agregados publicados precisarao mudar.

## Modulos reaproveitaveis

### 1. Cadastro de clientes

- Classificacao pratica: reaproveitar.
- Motivo: o dominio de cliente segue valido.

### 2. Cadastro de motocicletas

- Classificacao pratica: reaproveitar.
- Motivo: a motocicleta continua sendo o centro do prontuario.

### 3. Autenticacao e perfis

- Classificacao pratica: reaproveitar.
- Motivo: a base de acesso continua adequada.

### 4. Infra basica de upload

- Classificacao pratica: reaproveitar com ajustes.
- Motivo: existe `multer`, mas o desenho precisa deixar de ser especifico para foto de mecanico.

### 5. Infra de socket

- Classificacao pratica: reaproveitar com ajustes.
- Motivo: a tecnologia serve, os eventos atuais nao.

### 6. Estrutura Express por camadas

- Classificacao pratica: reaproveitar.
- Motivo: separacao entre rota, controller, service e repository continua boa.

## Modulos que precisam de ajuste profundo

### 1. Recepcao

Precisa evoluir de "formulario de atendimento" para "abertura de OS com itens iniciais, fotos de entrada e trilha de comunicacao".

### 2. Oficina

Precisa evoluir de "mover atendimento na fila" para "gerir itens, diagnosticos, execucoes e previsoes".

### 3. Atendimento service

Hoje centraliza demais. No novo fluxo ele nao deve continuar concentrando todo o dominio.

### 4. DTOs e consultas

Precisam separar:

- painel resumido;
- detalhe da OS;
- detalhe do item;
- prontuario da motocicleta;
- relatorio analitico.

## Modulos que devem ser refatorados ou substituidos

### 1. `backend/src/services/atendimentoService.js`

- Diagnostico: `SUBSTITUIR` como nucleo central.
- Motivo: ele pode continuar existindo em parte de compatibilidade, mas nao deve ser o servico central do novo dominio.

### 2. `backend/src/repositories/atendimentoRepository.js`

- Diagnostico: `SUBSTITUIR` como repositorio central.
- Motivo: o novo dominio exigira varios repositorios especializados.

### 3. `backend/src/utils/atendimentoDtos.js`

- Diagnostico: `REFATORAR`
- Motivo: os DTOs precisam sair da logica de atendimento monolitico.

### 4. `frontend/src/services/atendimentoService.js`

- Diagnostico: `REFATORAR`
- Motivo: ele deixara de ser o unico gateway do fluxo operacional.

### 5. `frontend/src/pages/RecepcaoPage.jsx`

- Diagnostico: `REFATORAR`
- Motivo: continua como tela valida, mas precisa mudar de responsabilidade e composicao.

### 6. `frontend/src/pages/OficinaAdminPage.jsx`

- Diagnostico: `REFATORAR`
- Motivo: a oficina passa a operar itens e nao apenas OS inteiras.

### 7. `frontend/src/pages/AtendimentosPage.jsx`

- Diagnostico: `REFATORAR`
- Motivo: precisa virar consulta de OS e prontuario, nao apenas lista geral com historico simples.

### 8. `frontend/src/pages/RelatorioPage.jsx`

- Diagnostico: `REFATORAR`
- Motivo: filtros e agregacoes atuais sao insuficientes.

## Modulos que devem ser removidos

### Estruturas de video

- Classificacao: `REMOVER`
- Observacao: na pratica, nada precisa ser removido hoje porque nao foram encontradas tabelas, rotas ou pipelines de video.

## Impacto tecnico no banco

## Diagnostico geral

O banco atual e curto demais para o novo processo. O novo nucleo nao cabe em simples adicoes laterais de colunas em `atendimentos`.

### Principais lacunas estruturais

- inexistencia de entidade formal de ordem de servico;
- inexistencia de itens da OS;
- inexistencia de diagnosticos;
- inexistencia de orcamentos;
- inexistencia de autorizacoes;
- inexistencia de execucao por item;
- inexistencia de mecanicos auxiliares;
- inexistencia de previsoes de peca;
- inexistencia de garantias;
- inexistencia de fotos de entrada;
- inexistencia de comunicacoes WhatsApp auditaveis.

### Conclusao objetiva para banco

O novo fluxo exige nova modelagem conceitual. Remendo na tabela atual gera alta probabilidade de inconsistencia e retrabalho.

## Impacto tecnico no backend

### Diagnostico

O backend atual esta bem organizado por camadas, mas o dominio foi desenhado em torno de um atendimento monolitico.

### Principais impactos

- separacao entre OS e itens;
- separacao entre operacao, diagnostico, orcamento e execucao;
- consultas agregadas para prontuario;
- novas regras de autorizacao e pagamento por item;
- log de comunicacao externa;
- upload restrito a fotos de entrada;
- bloqueio explicito de videos.

### Risco principal

O maior risco e tentar encaixar o novo dominio inteiro dentro de `atendimentoService` e `atendimentoRepository`.

## Impacto tecnico no frontend

### Recepcao

Vai deixar de ser "entrada rapida de atendimento" e passar a ser "abertura de OS estruturada".

### Oficina

Vai operar:

- itens em diagnostico;
- itens autorizados;
- itens aguardando peca;
- itens em execucao;
- itens concluidos;
- prioridades e prazos.

### Orcamento

O sistema atual nao tem tela propria para esse dominio. Isso indica necessidade de novo modulo funcional, mesmo dentro do mesmo projeto.

### Prontuario

Nao existe hoje e sera uma visao estruturante do produto.

## Impacto no Socket.io

O impacto sera medio, nao porque o transporte esteja errado, mas porque o grafo de eventos atual e pobre demais.

Exemplos de novos eventos conceituais que provavelmente serao necessarios no futuro:

- OS criada;
- item criado;
- item priorizado;
- diagnostico concluido;
- orcamento revisado;
- autorizacao recebida;
- item aguardando peca;
- previsao de peca alterada;
- item iniciado;
- item finalizado;
- garantia criada;
- foto de entrada registrada;
- comunicacao WhatsApp registrada.

O Socket.io continua util, mas o catalogo de eventos atual nao atende o novo processo.

## Riscos de remendos

### 1. Manter `atendimentos` como centro absoluto

Risco:

- forcar dezenas de colunas heterogeneas;
- gerar estados contraditorios;
- perder clareza entre OS e item;
- aumentar custo de consulta e manutencao.

### 2. Usar um unico status agregado como verdade do processo

Risco:

- ocultar simultaneidade real dos itens;
- produzir paineis enganosos;
- quebrar relatorios.

### 3. Continuar tratando pagamento como binario na OS

Risco:

- confundir pagamento com autorizacao;
- perder rastreio parcial;
- bloquear evolucao financeira futura.

### 4. Continuar com um unico mecanico por atendimento

Risco:

- distorcer producao real;
- inviabilizar apontamento de equipe;
- enfraquecer o prontuario.

### 5. Colocar diagnostico e orcamento como texto livre

Risco:

- nao suportar revisao, autorizacao parcial e historico tecnico.

### 6. Injetar fotos, garantia e comunicacoes no historico atual

Risco:

- misturar dominios;
- empobrecer consultas;
- aumentar acoplamento.

## Comparacao: alterar, refatorar ou criar novo nucleo

### Opcao 1. Alterar diretamente o fluxo atual

Vantagens:

- menor custo imediato.

Desvantagens:

- maior risco de remendo;
- forte chance de retrabalho;
- baixa legibilidade do dominio.

Veredito:

- nao recomendado.

### Opcao 2. Refatorar parcialmente e criar um novo nucleo de OS dentro do mesmo projeto

Vantagens:

- preserva autenticacao, cadastros, infra web, upload basico e socket;
- permite desenhar o dominio certo;
- reduz regressao desnecessaria;
- facilita migracao gradual de telas e relatorios.

Desvantagens:

- exige conviver temporariamente com legado e novo nucleo.

Veredito:

- melhor opcao tecnica.

### Opcao 3. Reescrever toda a aplicacao

Vantagens:

- liberdade total de desenho.

Desvantagens:

- custo muito maior;
- perde reaproveitamento valioso;
- risco alto de atrasar entrega.

Veredito:

- desnecessario neste momento.

## Estrategia tecnica recomendada

Recomendacao principal desta auditoria ampliada:

- manter o projeto atual;
- nao manter o nucleo atual de `atendimentos` como centro do negocio;
- criar um novo nucleo de ordem de servico e itens dentro do mesmo projeto;
- reutilizar o que ja esta correto ao redor desse nucleo;
- migrar gradualmente telas, paineis e relatorios para a nova modelagem.

Em outras palavras:

- nao vale reescrever a aplicacao inteira;
- nao vale remendar `atendimentos` ate ele virar um superregistro inconsistente;
- vale evoluir a base atual com um novo nucleo interno melhor modelado.

## Modelagem conceitual sugerida

Sem criar migrations, a modelagem conceitual recomendada e a seguinte.

### 1. `ordens_servico`

Papel:

- cabecalho da OS;
- vinculo com cliente e motocicleta;
- numero da OS;
- datas gerais;
- prioridade agregada;
- promessa ao cliente;
- responsavel de abertura;
- status resumido da OS;
- observacoes gerais.

### 2. `itens_ordem_servico`

Papel:

- unidade central do trabalho;
- descricao do item;
- tipo;
- origem do item;
- exige diagnostico;
- execucao direta;
- status do item;
- autorizado ou nao;
- situacao de pagamento do item;
- prioridade do item;
- datas do item;
- garantia prevista ou aplicada.

Este deve ser o verdadeiro centro operacional do novo fluxo.

### 3. `diagnosticos`

Papel:

- registro tecnico do diagnostico;
- queixa original;
- causa identificada;
- descricao tecnica;
- autoria;
- data de elaboracao;
- versao ou revisao do diagnostico;
- situacao de envio ao orcamentista.

### 4. `diagnostico_itens`

Papel:

- vincular um diagnostico aos itens sugeridos ou desdobrados;
- permitir que uma mesma queixa gere um ou mais itens.

### 5. `orcamentos`

Papel:

- cabecalho do orcamento;
- orcamentista responsavel;
- numero externo obrigatorio no formato `#99999`;
- status do orcamento;
- total;
- PDF relacionado;
- versao/revisao;
- resposta do cliente;
- arquivamento.

### 6. `orcamento_itens`

Papel:

- itens financeiros do orcamento;
- valores de servico;
- valores de peca;
- quantidade;
- subtotal;
- relacao com item da OS ou item sugerido.

### 7. `autorizacoes`

Papel:

- registrar resposta do cliente;
- total, parcial, recusa ou aguardando;
- autoria do registro;
- data e observacao;
- granularidade por item.

### 8. `execucoes`

Papel:

- registrar inicio e fim real do trabalho de um item;
- apontar mecanico principal;
- apontar status real de execucao;
- guardar resultado tecnico final.

### 9. `execucao_mecanicos`

Papel:

- tabela de participacao N:N;
- principal e auxiliares;
- tempo, papel ou tipo de participacao se necessario no futuro.

### 10. `previsoes_pecas`

Papel:

- registrar aguardando peca por item;
- previsao inicial;
- alteracoes de previsao;
- motivo;
- retorno para execucao;
- status da previsao.

### 11. `garantias`

Papel:

- garantia por item executado;
- regra aplicada;
- inicio;
- fim;
- situacao atual;
- base para consulta no prontuario.

### 12. `fotos_entrada`

Papel:

- armazenar somente as fotos iniciais da entrada;
- vinculo com OS, motocicleta, cliente e usuario da recepcao;
- data e horario;
- sem video.

### 13. `comunicacoes_whatsapp`

Papel:

- log minimo de comunicacao preparada;
- tipo da mensagem;
- destinatario;
- finalidade;
- usuario que abriu;
- data e hora;
- referencia a OS, diagnostico ou orcamento quando couber.

### Observacao de arquitetura

Nem toda entidade precisa virar tela isolada imediatamente, mas o dominio precisa existir separadamente para evitar remendos.

## Respostas objetivas solicitadas

### O nucleo atual pode permanecer?

- Resposta: parcialmente.
- Detalhe: a aplicacao atual pode permanecer, mas o nucleo de negocio atual centrado em `atendimentos` nao deve permanecer como esta.

### A tabela `atendimentos` ainda serve como centro?

- Resposta: nao.

### Deve ser criada uma nova entidade `ordens_servico`?

- Resposta: sim.

### Os itens precisam de tabela propria?

- Resposta: sim, obrigatoriamente.

### O fluxo atual deve ser refatorado ou parcialmente reconstruido?

- Resposta: parcialmente reconstruido, com refatoracao ao redor.

### Vale evoluir a base atual ou criar um novo nucleo dentro do mesmo projeto?

- Resposta: vale criar um novo nucleo dentro do mesmo projeto e reaproveitar o restante.

### Qual opcao reduz mais o risco de remendos?

- Resposta: criar o novo nucleo de OS e itens dentro do projeto atual, migrando gradualmente telas, paineis, relatorios e eventos.

## Plano de implementacao por etapas

### Etapa 1. Fechamento conceitual

Definir sem ambiguidade:

- tipos de item;
- estados de item;
- estados de OS agregada;
- regras de autorizacao;
- regras de pagamento por item;
- regra de garantia;
- numero externo do orcamento;
- comportamento do PDF;
- papeis de recepcao, oficina e orcamentista.

### Etapa 2. Nova modelagem de nucleo

Desenhar:

- `ordens_servico`
- `itens_ordem_servico`
- modulos de diagnostico, orcamento, execucao, garantia e comunicacao.

### Etapa 3. Backend do novo nucleo

Criar servicos e repositorios por dominio:

- OS;
- itens;
- diagnostico;
- orcamento;
- autorizacao;
- execucao;
- previsao de peca;
- garantia;
- fotos de entrada;
- comunicacoes WhatsApp.

### Etapa 4. Adaptacao da recepcao

Transformar a recepcao em abertura de OS estruturada.

### Etapa 5. Adaptacao da oficina

Migrar a oficina para operar por item.

### Etapa 6. Orcamento e autorizacao

Introduzir modulo proprio e revisoes.

### Etapa 7. Prontuario

Montar a visao agregada da motocicleta.

### Etapa 8. Paineis, relatorios e socket

Recalcular agregados e eventos sobre o novo nucleo.

### Etapa 9. Desativacao gradual do fluxo antigo

Reduzir dependencias de `atendimentos` como centro do dominio.

## Decisoes ainda pendentes

1. Quais tipos oficiais de item existirao.
2. Se toda queixa vira item desde a abertura ou se nasce em entidade de diagnostico e depois desdobra itens.
3. Como sera calculado o status agregado da OS.
4. Se pagamento sera apenas marcacao operacional ou se havera detalhamento financeiro futuro.
5. Se a autorizacao parcial sera por item ou por grupo de itens.
6. Como revisar orcamentos sem perder historico.
7. Se o PDF do orcamento sera armazenado pelo sistema ou apenas referenciado.
8. Qual papel sistemico do orcamentista: usuario proprio, perfil proprio ou extensao do perfil recepcao/admin.
9. Como sera definida a prioridade manual.
10. Qual regra oficial para atraso e prazo restante.
11. Se a garantia de 90 dias vale para todos os tipos de servico ou se havera excecoes.
12. Como sera exibido o prontuario: por abas, timeline, grade ou visao hibrida.
13. Se fotos iniciais serao obrigatorias na abertura.
14. Quantidade maxima e tamanho maximo das fotos iniciais.
15. Qual numero interno de WhatsApp sera usado no fluxo mecanico -> orcamentista.

## Conclusao executiva atualizada

O sistema atual e tecnicamente organizado para uma oficina com fluxo linear e simples, mas nao foi modelado para o nucleo funcional agora contratado.

O ponto central da auditoria ampliada e este:

- o novo processo nao e apenas "adicionar fotos iniciais e abrir WhatsApp";
- ele redefine o coracao do negocio da oficina;
- a unidade real do trabalho deixa de ser o atendimento monolitico e passa a ser o item da ordem de servico.

Por isso, a tabela `atendimentos` e o fluxo atual nao devem continuar como centro do dominio.

O projeto atual pode e deve ser aproveitado em partes importantes:

- autenticacao;
- cadastros de clientes e motocicletas;
- estrutura web;
- organizacao em camadas;
- upload basico;
- Socket.io como tecnologia;
- parte das telas como base de migracao.

Mas o nucleo funcional deve ser parcialmente reconstruido dentro do mesmo projeto, com uma nova modelagem centrada em:

- `ordens_servico`;
- `itens_ordem_servico`;
- diagnosticos;
- orcamentos;
- autorizacoes;
- execucoes;
- previsoes de pecas;
- garantias;
- fotos de entrada;
- comunicacoes WhatsApp.

Essa opcao reduz mais o risco de remendos porque:

- preserva o que ja funciona fora do nucleo;
- evita inflar `atendimentos` ate virar uma estrutura contraditoria;
- permite migracao gradual;
- melhora rastreabilidade, relatorios, paineis e prontuario;
- cria base correta para evolucoes futuras.

Conclusao final objetiva:

- manter a aplicacao: sim;
- manter `atendimentos` como centro: nao;
- criar novo nucleo de OS e itens dentro do mesmo projeto: sim;
- abordagem recomendada: refatoracao estrutural com reconstrucao parcial do dominio, e nao remendo incremental.
