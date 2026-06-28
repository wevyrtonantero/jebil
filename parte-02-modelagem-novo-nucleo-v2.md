# Parte 02: Modelagem do Novo Nucleo V2

## 1. Resumo executivo

Esta etapa define o nucleo funcional definitivo da V2 sem alterar codigo, banco, migrations, dependencias ou telas.

Decisao central aprovada:

- o projeto atual sera preservado;
- o nucleo antigo centrado em `atendimentos` nao sera expandido com remendos;
- sera criado um novo nucleo de Ordem de Servico dentro do mesmo projeto;
- cliente, motocicleta, autenticacao, infraestrutura web e parte da base existente serao reaproveitados;
- a unidade principal de operacao da oficina deixara de ser o atendimento monolitico e passara a ser o item da OS.

Definicao estrutural da V2:

- `ordens_servico` sera a entidade principal de cabecalho;
- `itens_ordem_servico` sera a unidade operacional principal;
- diagnostico, orcamento, autorizacao, pagamento, execucao, garantia, peca e comunicacao terao dominios proprios;
- o status geral da OS sera derivado dos itens, nao controlado livremente;
- o sistema armazenara somente fotos iniciais da motocicleta;
- videos, fotos adicionais de diagnostico e arquivos de WhatsApp ficarao fora do sistema;
- WhatsApp continuara manual, com preparo de mensagem e registro da abertura, sem confirmar envio real.

## 2. Objetivo desta etapa

Definir de forma precisa:

- novo dominio de Ordem de Servico;
- itens independentes dentro da OS;
- diagnostico;
- orcamento;
- autorizacao;
- pagamento por item;
- execucao dos servicos;
- participacao de varios mecanicos;
- aguardando pecas;
- prioridade;
- fotos de entrada;
- WhatsApp manual;
- prontuario da motocicleta;
- garantia por item;
- status dos itens;
- status geral da OS;
- transicoes permitidas;
- matriz de permissoes;
- modelagem conceitual definitiva;
- estrategia de reaproveitamento e migracao.

## 3. Principio central da V2

A principal entidade funcional da V2 sera a Ordem de Servico.

Uma Ordem de Servico:

- pertence a um cliente;
- pertence a uma motocicleta;
- possui um numero interno;
- pode conter uma ou mais queixas;
- pode conter varios itens independentes;
- pode ter itens em estados diferentes ao mesmo tempo;
- pode envolver diagnostico, orcamento, autorizacao, execucao, peca, garantia e pagamento sem reduzir tudo a um unico status.

Regra obrigatoria:

- nao usar um unico status para representar toda a complexidade operacional da OS.

Unidade real do trabalho:

- o item da Ordem de Servico.

Unidade agregadora:

- a propria Ordem de Servico.

## 4. Regras fechadas do dominio

## 4.1 Cliente e motocicleta

Mantem-se:

- cliente como entidade propria;
- motocicleta vinculada ao cliente;
- historico do cliente;
- prontuario tecnico principal da motocicleta.

Consulta do prontuario:

- por placa;
- por cliente;
- pela propria motocicleta;
- por OS relacionada.

Recomendacao:

- busca principal operacional por placa;
- busca complementar por nome/telefone/cliente;
- abertura do prontuario sempre ancorada na motocicleta.

## 4.2 Entrada da motocicleta

A recepcao deve poder registrar:

- cliente selecionado ou novo;
- motocicleta selecionada ou nova;
- telefone/WhatsApp;
- placa;
- quilometragem opcional;
- queixa principal;
- observacoes gerais;
- data prometida, quando aplicavel;
- fotos iniciais;
- itens solicitados pelo cliente.

Cada item informado na entrada pode receber desde a abertura:

- descricao;
- tipo;
- origem;
- execucao direta ou exige diagnostico;
- autorizado ou nao;
- pago ou pendente;
- prioridade;
- observacoes.

Regra obrigatoria:

- autorizacao e pagamento sao conceitos diferentes e devem permanecer em campos e historicos separados.

## 4.3 Fotos e videos

O sistema armazenara somente fotos iniciais da motocicleta.

Essas fotos servem para registrar o estado da motocicleta no momento da entrada.

Vinculos obrigatorios:

- cliente;
- motocicleta;
- OS;
- usuario responsavel;
- data e hora.

Nao armazenar no sistema:

- videos;
- videos de diagnostico;
- videos do servico;
- videos da correcao;
- fotos adicionais de diagnostico;
- anexos enviados via WhatsApp;
- arquivos enviados depois da entrada.

### Recomendacao inicial de limites

- quantidade maxima inicial: 8 fotos por entrada;
- tamanho maximo inicial: 5 MB por foto;
- formatos permitidos: JPG, JPEG, PNG, WEBP;
- ordem de exibicao: definida por sequencia de captura/upload;
- compressao: recomendada apenas para imagens, nunca para video;
- exclusao: controlada, com auditoria;
- backup: manter pasta segregada por dominio para reduzir impacto operacional.

### Decisao a confirmar

- a quantidade maxima e o tamanho maximo devem ser confirmados pelo negocio antes da implementacao.

## 4.4 Itens da Ordem de Servico

Cada item da OS sera uma unidade independente.

Campos conceituais obrigatorios do item:

- id;
- ordem_servico_id;
- descricao;
- categoria ou tipo;
- origem;
- execucao_direta;
- exige_diagnostico;
- autorizacao_status;
- pagamento_status;
- status_item;
- prioridade;
- data_prometida;
- previsao_peca_atual;
- observacoes;
- criado_por;
- criado_em;
- iniciado_em;
- concluido_em;
- cancelado_em;
- possui_garantia;
- garantia_padrao_dias ou referencia de regra.

Possiveis origens:

- `SOLICITADO_CLIENTE`
- `GERADO_DIAGNOSTICO`
- `INCLUIDO_ORCAMENTISTA`
- `RETORNO_GARANTIA`

### Historico de item

Recomendacao:

- sim, cada item deve possuir historico proprio de alteracoes.

Justificativa:

- o item passa a ser a unidade real de autorizacao, execucao, pagamento e garantia;
- sem historico proprio, perde-se rastreabilidade tecnica e juridica.

## 4.5 Servico direto

Alguns servicos nao exigem diagnostico.

Exemplos:

- troca de oleo;
- troca da relacao.

Esses itens poderao ser marcados como:

- `execucao_direta = true`

Comportamento recomendado:

- item de execucao direta autorizado entra em `PRONTO_PARA_EXECUTAR`;
- item de execucao direta nao autorizado entra em `AGUARDANDO_AUTORIZACAO`;
- o painel deve exibir marcador visual de servico direto;
- o fato de ser direto nao elimina pagamento nem historico.

### Decisao recomendada: executar antes do fim do diagnostico principal

- Recomendacao: sim, pode.

Justificativa:

- itens independentes devem poder seguir seu proprio fluxo;
- isso reduz gargalo e respeita a ideia de OS multi-item;
- evita que um diagnostico bloqueie servicos simples ja decididos pelo cliente.

Impacto:

- o painel e o status geral da OS precisam aceitar estados paralelos;
- o prontuario deve mostrar que a OS tem item executado e outro ainda em diagnostico.

Risco:

- se a oficina nao enxergar claramente a separacao entre itens, pode haver confusao operacional.

## 4.6 Diagnostico

A queixa principal pode gerar um item de diagnostico.

O mecanico deve poder:

- abrir o prontuario;
- iniciar diagnostico;
- definir mecanico principal;
- incluir auxiliares;
- registrar queixa avaliada;
- registrar causa encontrada;
- descrever tecnicamente o diagnostico;
- indicar servicos necessarios;
- indicar pecas necessarias;
- registrar observacoes;
- concluir diagnostico;
- encaminhar para orcamentista.

Regra:

- diagnostico e dominio tecnico proprio;
- diagnostico nao e equivalente a execucao;
- diagnostico pode gerar um ou mais itens derivados.

WhatsApp interno:

- prepara mensagem com OS, cliente, motocicleta, placa, queixa, diagnostico, servicos sugeridos e pecas sugeridas;
- o mecanico anexa manualmente fotos e videos no WhatsApp;
- o sistema registra apenas a comunicacao preparada/aberta.

## 4.7 Mecanicos e execucoes

O login da oficina permanece compartilhado na V2.

Mecanicos continuam como entidades separadas de usuarios.

Um item pode ter:

- mecanico principal;
- um ou mais mecanicos auxiliares.

Um mecanico pode:

- assumir um item;
- ajudar em um item;
- trabalhar em outro item da mesma moto;
- concluir sua participacao.

A mesma motocicleta pode ter varios mecanicos simultaneamente em itens diferentes.

### Regra operacional

- a atribuicao de mecanico deve ocorrer no nivel de execucao do item;
- a OS pode exibir um responsavel agregado, mas isso nao substitui a granularidade por item.

### Controle de tempo

Nesta etapa, manter apenas:

- `iniciado_em`
- `finalizado_em`

Nao implementar:

- cronometro visivel;
- pausa;
- retomada;
- produtividade;
- tempo liquido;
- comparacao entre mecanicos.

## 4.8 Orcamentista

Novo perfil proposto:

- `ORCAMENTISTA`

Esse perfil pode:

- visualizar OS;
- visualizar cliente e motocicleta;
- consultar diagnostico;
- consultar itens ja autorizados;
- consultar itens ja executados;
- adicionar itens ao orcamento;
- informar valores;
- informar numero externo obrigatorio;
- gerar PDF;
- registrar decisao do cliente;
- enviar itens autorizados para execucao;
- enviar itens para aguardando peca;
- arquivar orcamento;
- consultar historico.

Regra:

- o usuario logado deve ficar vinculado ao orcamento.

## 4.9 Orcamento

A OS continua com numero interno:

- exemplo: `OS-2026-000123`

O orcamento possui numero externo obrigatorio:

- formato: `#99999`

Regra obrigatoria:

- o sistema nao pode concluir nem salvar definitivamente o orcamento sem esse numero.

O orcamento deve possuir itens independentes com:

- descricao;
- quantidade;
- valor de peca;
- valor de mao de obra;
- valor total;
- observacao;
- origem;
- autorizacao_status do item de orcamento;
- aguardando resposta.

### Recomendacao sobre peca e mao de obra

- Recomendacao: separar.

Justificativa:

- melhora clareza para cliente e oficina;
- permite historico tecnico e comercial mais fiel;
- prepara o sistema para regras futuras sem obrigar modulo financeiro completo.

Impacto:

- o orcamento fica mais estruturado;
- o PDF fica mais profissional;
- futuras integracoes e relatorios ficam mais consistentes.

## 4.10 Revisoes de orcamento

### Recomendacao

- suportar revisoes versionadas e imutaveis.

Modelo recomendado:

- um orcamento pode ter varias versoes;
- apenas uma versao pode estar `ATIVA`;
- versao enviada nao deve ser sobrescrita silenciosamente.

Justificativa:

- ha PDF enviado ao cliente;
- ha auditoria de decisao;
- revisao editavel unica apaga historico comercial.

Impacto:

- mais complexidade de modelagem;
- muito menos risco de perda de trilha historica.

Risco se nao fizer:

- inconsistencia entre PDF enviado e estado atual do sistema.

## 4.11 PDF do orcamento

Conteudo obrigatorio do PDF:

- dados da oficina;
- numero da OS;
- numero externo;
- cliente;
- motocicleta;
- placa;
- itens;
- valores;
- total;
- observacoes;
- orcamentista;
- data.

Nome de arquivo recomendado:

- `OS-2026-000123-DNG7965-NOME-CLIENTE.pdf`

Regra conceitual:

- o PDF deve ficar vinculado ao orcamento e ao prontuario da motocicleta;
- o versionamento deve acompanhar a versao do orcamento;
- permissao de consulta deve respeitar perfil e contexto.

## 4.12 WhatsApp manual

Nao ha disparo automatico.

O sistema apenas:

- prepara a mensagem;
- abre o WhatsApp;
- registra a comunicacao preparada ou aberta.

Fluxos previstos:

- recepcao para cliente;
- oficina para orcamentista;
- orcamentista para cliente;
- servico finalizado para cliente, opcional.

Anexos manuais fora do sistema:

- fotos;
- videos;
- PDF.

Regra de auditoria:

- nao registrar "mensagem enviada";
- registrar apenas "WhatsApp aberto" ou "comunicacao preparada".

## 4.13 Autorizacao por item

Autorizacao e por item.

Estados de autorizacao recomendados:

- `NAO_SE_APLICA`
- `AGUARDANDO_RESPOSTA`
- `AUTORIZADO`
- `NAO_AUTORIZADO`
- `PARCIALMENTE_AUTORIZADO`
- `CANCELADO`

### Quem altera

- `ADMIN`
- `RECEPCAO`
- `ORCAMENTISTA`

Recomendacao:

- `OFICINA` nao altera autorizacao comercial.

Campos obrigatorios no historico:

- status anterior;
- status novo;
- usuario responsavel;
- data da decisao;
- observacao.

Impacto no item:

- item autorizado pode seguir para execucao ou aguardando peca;
- item nao autorizado nao deve ir para execucao;
- item aguardando resposta nao deve ser executado.

Impacto na OS:

- compoe o status agregado de aguardando cliente/orcamento, conforme regras de precedencia.

## 4.14 Pagamento por item

Pagamento e por item.

Estados recomendados:

- `PENDENTE`
- `PAGO`

### Quem altera

- `ADMIN`
- `RECEPCAO`
- `ORCAMENTISTA` opcionalmente, se o negocio quiser centralizar no setor de orcamento

Recomendacao:

- permitir alteracao por `ADMIN` e `RECEPCAO`;
- deixar `ORCAMENTISTA` como decisao de negocio a confirmar;
- `OFICINA` apenas visualiza.

### Execucao de item nao pago: bloquear ou alertar?

- Recomendacao: apenas alertar, nao bloquear.

Justificativa:

- a oficina pode precisar iniciar servico ja autorizado antes da baixa operacional do pagamento;
- bloquear tudo aumenta atrito e pode parar o fluxo por formalidade administrativa;
- a autorizacao e o verdadeiro bloqueio de execucao, nao o pagamento.

Impacto:

- exige indicador visual forte para item nao pago;
- exige bloqueio apenas na liberacao final, nao na execucao.

Risco:

- se a operacao for desorganizada, pode aumentar execucao com itens ainda nao quitados.

Contrapeso recomendado:

- item nao pago recebe alerta forte;
- OS nao deve ir para retirada final com pendencias de itens cobraveis.

## 4.15 Aguardando peca

Um item autorizado pode entrar em:

- `AGUARDANDO_PECA`

Registro conceitual obrigatorio:

- descricao da peca;
- previsao de chegada;
- data informada;
- usuario responsavel;
- observacao;
- nova previsao quando houver;
- historico das alteracoes.

Painel deve destacar futuramente:

- dias restantes;
- peca atrasada;
- nova previsao;
- item relacionado;
- motocicleta.

Regras:

- aguardando peca e um estado operacional de item;
- previsao de peca nao deve ser guardada apenas como campo solto sem historico;
- ao resolver a peca, o item retorna para `PRONTO_PARA_EXECUTAR` ou `EM_EXECUCAO`, conforme a operacao.

## 4.16 Prioridades

Fatores de prioridade:

- prioridade manual;
- data prometida ao cliente;
- previsao da peca;
- prazo restante;
- atraso;
- ordem de entrada.

Niveis iniciais recomendados:

- `NORMAL`
- `ALTA`
- `URGENTE`

### Prioridade por OS, item ou ambos?

- Recomendacao: ambos.

Regra:

- prioridade real de execucao e por item;
- prioridade agregada da OS e derivada do item mais critico ou do prazo mais sensivel.

Justificativa:

- a oficina executa itens;
- o painel administrativo ainda precisa enxergar a OS como conjunto.

## 4.17 Garantia

Garantia vinculada ao item executado.

Regra inicial:

- 90 dias.

Campos obrigatorios:

- item executado;
- data de conclusao;
- inicio da garantia;
- fim da garantia;
- dias restantes;
- status;
- observacoes;
- eventual retorno em garantia.

### Inicio da garantia: conclusao ou retirada?

- Recomendacao: iniciar na retirada.

Justificativa:

- alinha a garantia ao momento em que a motocicleta e devolvida ao cliente;
- evita perda de dias enquanto a moto ainda esta na oficina;
- e mais defensavel perante o cliente.

Impacto:

- depende do encerramento da OS ou do item estar efetivamente entregue;
- historico precisa registrar retirada e inicio de garantia.

### Garantia fixa ou editavel?

- Recomendacao: 90 dias automaticos por padrao, editavel somente por `ADMIN` e `ORCAMENTISTA` com auditoria.

## 5. Maquina de estados dos itens

## 5.1 Principio de modelagem

Nem tudo deve virar status.

Devem ser campos separados:

- autorizacao;
- pagamento;
- prioridade;
- execucao_direta;
- exige_diagnostico.

O `status_item` deve representar o estado operacional principal do item.

## 5.2 Status operacionais recomendados do item

Lista definitiva recomendada:

- `SOLICITADO`
- `AGUARDANDO_DIAGNOSTICO`
- `EM_DIAGNOSTICO`
- `DIAGNOSTICADO`
- `AGUARDANDO_ORCAMENTO`
- `AGUARDANDO_AUTORIZACAO`
- `AGUARDANDO_PECA`
- `PRONTO_PARA_EXECUTAR`
- `EM_EXECUCAO`
- `CONCLUIDO`
- `EM_GARANTIA`
- `CANCELADO`

### Estados propositalmente fora de `status_item`

- `AUTORIZADO` nao vira status do item; vira campo de autorizacao.
- `NAO_AUTORIZADO` nao vira status do item; vira campo de autorizacao.
- `PAGO` nao vira status do item; vira campo de pagamento.
- `NAO_PAGO` nao vira status do item; vira campo de pagamento.

## 5.3 Semantica dos estados

### `SOLICITADO`

- item criado, ainda sem classificacao operacional final.

### `AGUARDANDO_DIAGNOSTICO`

- item depende de avaliacao tecnica.

### `EM_DIAGNOSTICO`

- diagnostico iniciado por mecanico.

### `DIAGNOSTICADO`

- diagnostico concluido tecnicamente, aguardando desdobramento.

### `AGUARDANDO_ORCAMENTO`

- diagnostico concluido e aguardando formalizacao comercial.

### `AGUARDANDO_AUTORIZACAO`

- item ja orcado e aguardando resposta do cliente.

### `AGUARDANDO_PECA`

- item autorizado, mas parado por dependencia de peca.

### `PRONTO_PARA_EXECUTAR`

- item liberado para oficina, sem impedimento operacional.

### `EM_EXECUCAO`

- item em trabalho.

### `CONCLUIDO`

- item finalizado tecnicamente.

### `EM_GARANTIA`

- usado para retorno operacional de item em garantia ativa.

### `CANCELADO`

- item descontinuado e sem fluxo ativo.

## 5.4 Transicoes permitidas

### Fluxo geral recomendado

```text
SOLICITADO
  -> AGUARDANDO_DIAGNOSTICO
  -> AGUARDANDO_AUTORIZACAO
  -> PRONTO_PARA_EXECUTAR
  -> CANCELADO

AGUARDANDO_DIAGNOSTICO
  -> EM_DIAGNOSTICO
  -> CANCELADO

EM_DIAGNOSTICO
  -> DIAGNOSTICADO
  -> AGUARDANDO_DIAGNOSTICO
  -> CANCELADO

DIAGNOSTICADO
  -> AGUARDANDO_ORCAMENTO
  -> PRONTO_PARA_EXECUTAR
  -> CANCELADO

AGUARDANDO_ORCAMENTO
  -> AGUARDANDO_AUTORIZACAO
  -> PRONTO_PARA_EXECUTAR
  -> CANCELADO

AGUARDANDO_AUTORIZACAO
  -> PRONTO_PARA_EXECUTAR
  -> CANCELADO

PRONTO_PARA_EXECUTAR
  -> EM_EXECUCAO
  -> AGUARDANDO_PECA
  -> CANCELADO

AGUARDANDO_PECA
  -> PRONTO_PARA_EXECUTAR
  -> EM_EXECUCAO
  -> CANCELADO

EM_EXECUCAO
  -> AGUARDANDO_PECA
  -> CONCLUIDO
  -> CANCELADO

CONCLUIDO
  -> EM_GARANTIA

EM_GARANTIA
  -> PRONTO_PARA_EXECUTAR
  -> CONCLUIDO
  -> CANCELADO

CANCELADO
  -> sem transicoes
```

## 5.5 Regras adicionais de transicao

- item nao autorizado nao entra em `PRONTO_PARA_EXECUTAR`;
- item aguardando resposta nao entra em `EM_EXECUCAO`;
- item de execucao direta autorizado pode sair de `SOLICITADO` para `PRONTO_PARA_EXECUTAR`;
- item em garantia pode reabrir fluxo tecnico sem criar ambiguidade com item original, desde que historico e origem sejam preservados.

## 6. Status geral da Ordem de Servico

## 6.1 Principio

O status geral da OS nao deve ser livre nem manual por padrao.

Ele deve ser derivado do estado dos itens.

## 6.2 Status gerais recomendados da OS

- `ABERTA`
- `EM_DIAGNOSTICO`
- `EM_ORCAMENTO`
- `AGUARDANDO_CLIENTE`
- `AGUARDANDO_PECA`
- `EM_EXECUCAO`
- `PARCIALMENTE_CONCLUIDA`
- `PRONTA_PARA_RETIRADA`
- `FINALIZADA`
- `ARQUIVADA`
- `CANCELADA`

## 6.3 Algoritmo conceitual de derivacao

Ordem de precedencia recomendada:

1. se todos os itens estiverem cancelados ou recusados e nao houver execucao relevante, OS = `ARQUIVADA`;
2. se a OS for explicitamente encerrada sem fluxo ativo e sem retirada pendente, OS = `FINALIZADA`;
3. se houver item em execucao, OS = `EM_EXECUCAO`;
4. se nao houver item em execucao, mas houver item aguardando peca, OS = `AGUARDANDO_PECA`;
5. se houver item aguardando autorizacao ou resposta do cliente, OS = `AGUARDANDO_CLIENTE`;
6. se houver item aguardando orcamento, OS = `EM_ORCAMENTO`;
7. se houver item em diagnostico ou aguardando diagnostico, OS = `EM_DIAGNOSTICO`;
8. se houver itens concluidos e ainda houver itens pendentes em outros estados, OS = `PARCIALMENTE_CONCLUIDA`;
9. se todos os itens executaveis estiverem concluidos e nao houver pendencia impeditiva, OS = `PRONTA_PARA_RETIRADA`;
10. se apenas existir abertura inicial sem item trabalhado, OS = `ABERTA`;
11. se todos os itens estiverem cancelados por decisao administrativa, OS = `CANCELADA`.

## 6.4 Regras complementares

- `PRONTA_PARA_RETIRADA` depende de criterio de retirada definido pelo negocio;
- `FINALIZADA` e fechamento administrativo da OS;
- `ARQUIVADA` e encerramento sem execucao integral, tipico de recusa ou esvaziamento comercial;
- `CANCELADA` e cancelamento formal da OS.

## 6.5 Observacao de consistencia

A derivacao do status da OS deve ser centralizada em servico de dominio, nao espalhada em varias telas.

## 7. Matriz de permissoes V2

Perfis considerados:

- `ADMIN`
- `RECEPCAO`
- `OFICINA`
- `ORCAMENTISTA`

Legenda:

- `S`: permitido
- `N`: nao permitido
- `C`: permitido com condicao

| Acao | ADMIN | RECEPCAO | OFICINA | ORCAMENTISTA |
| --- | --- | --- | --- | --- |
| Login | S | S | S | S |
| Consultar cliente | S | S | C | S |
| Consultar motocicleta | S | S | C | S |
| Abrir OS | S | S | N | N |
| Editar dados de entrada da OS | S | S | N | N |
| Registrar fotos iniciais | S | S | N | N |
| Criar item de entrada | S | S | N | N |
| Marcar execucao direta | S | S | N | C |
| Alterar prioridade | S | S | C | S |
| Iniciar diagnostico | S | N | S | N |
| Concluir diagnostico | S | N | S | N |
| Incluir servicos sugeridos | S | N | S | C |
| Incluir pecas sugeridas | S | N | S | C |
| Abrir WhatsApp para orcamentista | S | N | S | N |
| Criar orcamento | S | N | N | S |
| Editar versao de orcamento nao enviada | S | N | N | S |
| Enviar orcamento para cliente | S | C | N | S |
| Gerar PDF | S | N | N | S |
| Alterar autorizacao por item | S | S | N | S |
| Alterar pagamento por item | S | S | N | C |
| Colocar item em aguardando peca | S | N | C | S |
| Assumir item para execucao | S | N | S | N |
| Registrar mecanico auxiliar | S | N | S | N |
| Iniciar execucao de item | S | N | S | N |
| Concluir item | S | N | S | N |
| Abrir WhatsApp para cliente | S | S | N | S |
| Registrar comunicacao WhatsApp | S | S | S | S |
| Liberar retirada da OS | S | S | N | C |
| Finalizar OS | S | S | N | C |
| Consultar prontuario completo | S | S | C | S |
| Consultar relatorios | S | S | N | S |
| Alterar regra de garantia | S | N | N | C |

Condicoes recomendadas:

- `OFICINA` pode consultar somente dados operacionais necessarios;
- `OFICINA` nao altera autorizacao comercial;
- `OFICINA` nao altera pagamento;
- `ORCAMENTISTA` pode alterar pagamento apenas se o negocio aprovar centralizacao comercial;
- `LIBERAR RETIRADA` deve continuar dependente de criterio administrativo e ausencia de pendencias impeditivas;
- `FINALIZAR OS` por `ORCAMENTISTA` so se essa area assumir esse fechamento; caso contrario, restringir a `ADMIN` e `RECEPCAO`.

## 8. Organizacao do painel da oficina

## 8.1 Areas recomendadas da TV

- Aguardando diagnostico
- Aguardando orcamento
- Aguardando autorizacao
- Aguardando peca
- Pronto para executar
- Em execucao
- Prioridades
- Pode retirar

## 8.2 Cards por OS, moto ou item?

- Recomendacao: cards por OS, com resumo de itens.

Justificativa:

- evita duplicar a mesma moto em excesso na TV;
- preserva leitura visual simples;
- permite exibir grupos de itens por fase;
- reduz poluicao quando ha varios itens na mesma motocicleta.

Contrapartida:

- nas areas operacionais detalhadas da oficina, deve existir drill-down por item.

Modelo visual recomendado:

- TV: card por OS com chips de itens;
- tela operacional: lista por item dentro da OS.

## 8.3 Informacoes recomendadas no card da TV

- cliente;
- placa;
- modelo;
- queixa principal;
- quantidade de itens por estado;
- itens em execucao;
- itens aguardando peca;
- prioridade agregada;
- data prometida;
- previsao de peca mais critica;
- mecanicos principais ativos.

## 9. Prontuario da motocicleta

## 9.1 Finalidade

Ser a visao tecnica consolidada da historia da motocicleta.

## 9.2 Deve reunir

- ordens de servico;
- queixas;
- diagnosticos;
- itens solicitados;
- itens autorizados;
- itens recusados;
- servicos executados;
- pecas informadas;
- orcamentos;
- fotos de entrada;
- mecanicos envolvidos;
- garantias;
- quilometragens;
- datas;
- historico de status.

## 9.3 Estrutura de consulta recomendada

Entradas de busca:

- placa;
- cliente;
- OS;
- motocicleta.

Visao recomendada:

- resumo superior da moto;
- timeline de OS;
- aba de itens;
- aba de diagnosticos;
- aba de orcamentos;
- aba de garantias;
- aba de fotos de entrada;
- aba de historicos e comunicacoes.

## 10. Modelagem conceitual detalhada

## 10.1 `usuarios`

Finalidade:

- autenticacao e permissoes.

Campos conceituais:

- id
- nome
- email
- senha_hash
- perfil
- ativo
- ultimo_login_em
- criado_em
- atualizado_em

Relacionamentos:

- um usuario pode abrir muitas OS;
- um usuario pode registrar comunicacoes;
- um usuario pode gerar orcamentos;
- um usuario pode alterar autorizacoes e pagamentos.

Cardinalidade:

- 1:N para OS;
- 1:N para orcamentos;
- 1:N para historicos;
- 1:N para comunicacoes.

Indices:

- email unico;
- perfil + ativo.

Exclusao:

- inativacao, nao exclusao fisica.

Auditoria:

- login;
- mudanca de perfil;
- alteracoes sensiveis.

## 10.2 `clientes`

Finalidade:

- dono legal ou operacional da motocicleta.

Campos conceituais:

- id
- nome
- telefone
- whatsapp
- cpf
- observacoes
- ativo
- criado_em
- atualizado_em

Relacionamentos:

- 1:N com motocicletas;
- 1:N com ordens_servico.

Indices:

- cpf unico quando preenchido;
- telefone;
- nome.

Exclusao:

- inativacao.

Auditoria:

- reativacao;
- mudancas cadastrais.

## 10.3 `motocicletas`

Finalidade:

- unidade fisica principal do prontuario tecnico.

Campos conceituais:

- id
- cliente_id
- marca
- modelo
- cor
- placa
- placa_normalizada
- km_atual
- observacoes
- ativo
- criado_em
- atualizado_em

Relacionamentos:

- 1:N com ordens_servico;
- 1:N com fotos_entrada;
- 1:N com garantias;
- 1:N com consultas de prontuario.

Indices:

- placa_normalizada;
- cliente_id;
- modelo;
- placa_normalizada + ativo, com regra de unicidade conforme negocio.

Exclusao:

- inativacao.

Auditoria:

- alteracoes de placa, cliente ou dados sensiveis.

## 10.4 `mecanicos`

Finalidade:

- cadastro de profissionais operacionais.

Campos conceituais:

- id
- nome
- foto_url
- ativo
- ordem_exibicao
- disponivel_hoje
- criado_em
- atualizado_em

Relacionamentos:

- 1:N com execucoes como principal;
- N:N com execucoes via `execucao_mecanicos`;
- N:N com diagnosticos, se modelado via apoio.

Indices:

- ativo + ordem_exibicao;
- disponivel_hoje.

Exclusao:

- inativacao.

Auditoria:

- mudanca de disponibilidade;
- reativacao.

## 10.5 `ordens_servico`

Finalidade:

- cabecalho principal do processo V2.

Campos conceituais:

- id
- numero_os
- cliente_id
- motocicleta_id
- usuario_abertura_id
- queixa_principal
- observacoes_entrada
- observacoes_internas
- data_prometida
- prioridade_agregada
- status_geral
- km_entrada
- aberta_em
- pronta_retirada_em
- retirada_em
- finalizada_em
- arquivada_em
- cancelada_em
- legado_atendimento_id opcional
- criado_em
- atualizado_em

Relacionamentos:

- 1:N com itens_ordem_servico;
- 1:N com fotos_entrada;
- 1:N com orcamentos;
- 1:N com comunicacoes_whatsapp;
- 1:N com historico_ordem_servico.

Indices:

- numero_os unico;
- motocicleta_id + aberta_em;
- cliente_id + aberta_em;
- status_geral;
- prioridade_agregada;
- data_prometida.

Exclusao:

- nao excluir fisicamente em fluxo normal;
- usar cancelamento ou arquivamento.

Auditoria:

- obrigatoria.

## 10.6 `itens_ordem_servico`

Finalidade:

- unidade operacional principal da oficina.

Campos conceituais:

- id
- ordem_servico_id
- item_pai_id opcional
- descricao
- categoria
- tipo
- origem
- execucao_direta
- exige_diagnostico
- autorizacao_status
- pagamento_status
- status_item
- prioridade
- data_prometida
- previsao_peca_atual
- observacoes
- criado_por
- criado_em
- iniciado_em
- concluido_em
- cancelado_em
- garantia_aplicavel
- retorno_garantia_de_item_id opcional

Relacionamentos:

- N:1 com ordem_servico;
- 1:N com diagnostico_itens;
- 1:N com orcamento_itens;
- 1:N com autorizacoes;
- 1:N com pagamentos_itens;
- 1:N com execucoes;
- 1:N com previsoes_pecas;
- 1:N com garantias;
- 1:N com historico_item_ordem_servico.

Indices:

- ordem_servico_id + status_item;
- ordem_servico_id + prioridade;
- status_item;
- autorizacao_status;
- pagamento_status;
- data_prometida.

Exclusao:

- preferir cancelamento logico.

Auditoria:

- obrigatoria e detalhada.

## 10.7 `diagnosticos`

Finalidade:

- registrar avaliacao tecnica formal.

Campos conceituais:

- id
- ordem_servico_id
- item_diagnostico_id
- mecanico_principal_id
- queixa_avaliada
- causa_identificada
- descricao_tecnica
- servicos_sugeridos_resumo
- pecas_sugeridas_resumo
- observacoes
- status_diagnostico
- iniciado_em
- concluido_em
- enviado_orcamentista_em
- criado_em
- atualizado_em

Relacionamentos:

- N:1 com ordem_servico;
- N:1 com item de diagnostico;
- 1:N com diagnostico_itens;
- 1:N com comunicacoes_whatsapp;
- 1:N com historicos especificos ou item historico.

Indices:

- ordem_servico_id;
- item_diagnostico_id;
- mecanico_principal_id;
- status_diagnostico.

Exclusao:

- nao excluir em fluxo normal; usar historico/versao.

Auditoria:

- obrigatoria.

## 10.8 `diagnostico_itens`

Finalidade:

- vincular diagnostico a itens tecnicos gerados ou sugeridos.

Campos conceituais:

- id
- diagnostico_id
- item_ordem_servico_id
- tipo_vinculo
- criado_em

Relacionamentos:

- N:1 com diagnosticos;
- N:1 com itens_ordem_servico.

Indices:

- diagnostico_id;
- item_ordem_servico_id;
- unicidade recomendada por par diagnostico-item.

Exclusao:

- fisica controlada ou inativacao logica conforme implementacao futura.

Auditoria:

- registrar criacao e remocao de vinculo.

## 10.9 `orcamentos`

Finalidade:

- cabecalho comercial e documental do orcamento.

Campos conceituais:

- id
- ordem_servico_id
- versao_numero
- numero_externo
- orcamentista_usuario_id
- status_orcamento
- observacoes
- valor_total
- pdf_url ou referencia_arquivo
- enviado_cliente_em
- arquivado_em
- criado_em
- atualizado_em

Relacionamentos:

- N:1 com ordem_servico;
- 1:N com orcamento_itens;
- 1:N com comunicacoes_whatsapp;
- 1:N com autorizacoes, se autorizacao for registrada a partir de itens de orcamento.

Indices:

- numero_externo;
- ordem_servico_id + versao_numero;
- ordem_servico_id + status_orcamento;
- numero_externo unico, se o negocio confirmar unicidade global.

Unicidade:

- `numero_externo` deve ser unico ou no minimo univoco por oficina; recomendacao: unico global.

Exclusao:

- nao excluir versao enviada;
- arquivar quando obsoleta.

Auditoria:

- obrigatoria.

## 10.10 `orcamento_itens`

Finalidade:

- detalhar itens comerciais do orcamento.

Campos conceituais:

- id
- orcamento_id
- item_ordem_servico_id opcional mas recomendado
- descricao
- quantidade
- valor_peca
- valor_mao_obra
- valor_total
- observacao
- origem
- autorizacao_status
- ordem_exibicao
- criado_em
- atualizado_em

Relacionamentos:

- N:1 com orcamentos;
- N:1 com itens_ordem_servico.

Indices:

- orcamento_id;
- item_ordem_servico_id;
- autorizacao_status.

Exclusao:

- evitar exclusao em versao ja emitida;
- preferir nova versao de orcamento.

Auditoria:

- obrigatoria em revisoes.

## 10.11 `autorizacoes`

Finalidade:

- registrar a decisao comercial do cliente por item.

Campos conceituais:

- id
- item_ordem_servico_id
- orcamento_item_id opcional
- status_autorizacao
- decidido_por_usuario_id
- decidido_em
- observacao
- origem_decisao
- criado_em

Relacionamentos:

- N:1 com item_ordem_servico;
- N:1 com orcamento_item opcional;
- N:1 com usuario.

Indices:

- item_ordem_servico_id + decidido_em;
- status_autorizacao.

Exclusao:

- nao excluir; manter trilha.

Auditoria:

- essencial.

## 10.12 `pagamentos_itens`

Finalidade:

- registrar trilha de pagamento por item.

Campos conceituais:

- id
- item_ordem_servico_id
- status_pagamento
- alterado_por_usuario_id
- alterado_em
- observacao
- criado_em

Relacionamentos:

- N:1 com item_ordem_servico;
- N:1 com usuario.

Indices:

- item_ordem_servico_id + alterado_em;
- status_pagamento.

Exclusao:

- nao excluir; manter historico.

Auditoria:

- obrigatoria.

## 10.13 `execucoes`

Finalidade:

- registrar o ciclo de execucao do item.

Campos conceituais:

- id
- item_ordem_servico_id
- mecanico_principal_id
- status_execucao
- descricao_execucao
- iniciado_em
- finalizado_em
- criado_em
- atualizado_em

Relacionamentos:

- N:1 com item_ordem_servico;
- N:1 com mecanico principal;
- 1:N com execucao_mecanicos.

Indices:

- item_ordem_servico_id;
- mecanico_principal_id;
- status_execucao.

Exclusao:

- evitar exclusao; encerrar por status.

Auditoria:

- obrigatoria.

## 10.14 `execucao_mecanicos`

Finalidade:

- representar participacao de mecanicos em uma execucao.

Campos conceituais:

- id
- execucao_id
- mecanico_id
- papel
- status_participacao
- iniciado_em
- finalizado_em
- criado_em

Relacionamentos:

- N:1 com execucao;
- N:1 com mecanico.

Indices:

- execucao_id;
- mecanico_id;
- unicidade recomendada por execucao+mecanico+papel ativo.

Exclusao:

- evitar exclusao; encerrar participacao.

Auditoria:

- obrigatoria.

## 10.15 `previsoes_pecas`

Finalidade:

- registrar dependencia de peca por item e suas revisoes.

Campos conceituais:

- id
- item_ordem_servico_id
- descricao_peca
- previsao_chegada
- informado_por_usuario_id
- informado_em
- observacao
- status_previsao
- substitui_previsao_id opcional
- criado_em

Relacionamentos:

- N:1 com item_ordem_servico;
- N:1 com usuario.

Indices:

- item_ordem_servico_id;
- previsao_chegada;
- status_previsao.

Exclusao:

- nao excluir revisoes; encadear historico.

Auditoria:

- obrigatoria.

## 10.16 `prioridades`

Finalidade:

- registrar alteracoes manuais ou calculadas de prioridade, se desejado como historico proprio.

Campos conceituais:

- id
- ordem_servico_id opcional
- item_ordem_servico_id opcional
- nivel
- motivo
- definido_por_usuario_id
- definido_em
- origem_prioridade

Relacionamentos:

- N:1 com OS ou item;
- N:1 com usuario.

Indices:

- item_ordem_servico_id;
- ordem_servico_id;
- nivel.

Exclusao:

- nao excluir.

Auditoria:

- obrigatoria quando houver ajuste manual.

## 10.17 `garantias`

Finalidade:

- controlar garantia por item executado.

Campos conceituais:

- id
- item_ordem_servico_id
- motocicleta_id
- dias_garantia
- inicio_garantia_em
- fim_garantia_em
- status_garantia
- origem_regra
- editado_por_usuario_id opcional
- observacao
- criado_em
- atualizado_em

Relacionamentos:

- N:1 com item_ordem_servico;
- N:1 com motocicleta;
- N:1 com usuario.

Indices:

- motocicleta_id;
- item_ordem_servico_id;
- fim_garantia_em;
- status_garantia.

Exclusao:

- nao excluir.

Auditoria:

- obrigatoria.

## 10.18 `fotos_entrada`

Finalidade:

- armazenar somente o registro fotografico inicial da entrada.

Campos conceituais:

- id
- ordem_servico_id
- cliente_id
- motocicleta_id
- usuario_responsavel_id
- arquivo_url
- nome_arquivo
- mime_type
- tamanho_bytes
- ordem_exibicao
- hash_arquivo opcional
- criado_em
- excluido_em opcional
- excluido_por_usuario_id opcional

Relacionamentos:

- N:1 com ordem_servico;
- N:1 com cliente;
- N:1 com motocicleta;
- N:1 com usuario.

Indices:

- ordem_servico_id + ordem_exibicao;
- motocicleta_id;
- criado_em.

Unicidade:

- nao exigir unicidade de nome;
- hash opcional pode ajudar em deduplicacao futura.

Exclusao:

- exclusao controlada com auditoria.

Auditoria:

- obrigatoria.

## 10.19 `comunicacoes_whatsapp`

Finalidade:

- registrar comunicacoes preparadas ou abertura de WhatsApp.

Campos conceituais:

- id
- ordem_servico_id
- diagnostico_id opcional
- orcamento_id opcional
- tipo_comunicacao
- destinatario
- finalidade
- usuario_responsavel_id
- mensagem_preparada
- status_registro
- criado_em

Relacionamentos:

- N:1 com ordem_servico;
- N:1 com diagnostico;
- N:1 com orcamento;
- N:1 com usuario.

Indices:

- ordem_servico_id;
- tipo_comunicacao;
- destinatario;
- criado_em.

Exclusao:

- nao excluir em fluxo normal.

Auditoria:

- obrigatoria.

## 10.20 `historico_ordem_servico`

Finalidade:

- trilha agregada da OS.

Campos conceituais:

- id
- ordem_servico_id
- usuario_id
- acao
- status_anterior
- status_novo
- observacao
- criado_em

Relacionamentos:

- N:1 com ordem_servico;
- N:1 com usuario.

Indices:

- ordem_servico_id + criado_em;
- acao.

Exclusao:

- nao excluir.

Auditoria:

- a propria tabela e trilha de auditoria.

## 10.21 `historico_item_ordem_servico`

Finalidade:

- trilha detalhada do item.

Campos conceituais:

- id
- item_ordem_servico_id
- usuario_id
- acao
- status_item_anterior
- status_item_novo
- autorizacao_anterior
- autorizacao_nova
- pagamento_anterior
- pagamento_novo
- observacao
- criado_em

Relacionamentos:

- N:1 com item_ordem_servico;
- N:1 com usuario.

Indices:

- item_ordem_servico_id + criado_em;
- acao.

Exclusao:

- nao excluir.

Auditoria:

- a propria tabela e trilha de auditoria.

## 11. Matriz de reaproveitamento do sistema atual

| Componente atual | Classificacao | Observacao |
| --- | --- | --- |
| Autenticacao | REAPROVEITAR | Base JWT e acesso por perfil continuam validos |
| Usuarios | REAPROVEITAR COM AJUSTES | Incluir perfil `ORCAMENTISTA` |
| Clientes | REAPROVEITAR | Dominio continua valido |
| Motocicletas | REAPROVEITAR | Segue como centro do prontuario |
| Mecanicos | REAPROVEITAR COM AJUSTES | Continuam separados de usuarios, mas passam a atuar por item |
| Tabela atual `atendimentos` | SUBSTITUIR | Nao deve seguir como centro do dominio |
| Historico atual | REAPROVEITAR COM AJUSTES | Conceito valido, modelagem insuficiente |
| Pagamento atual | REFATORAR | Sair do nivel global para item |
| Status atual | REFATORAR | Status unico da OS nao basta |
| Fila atual | REFATORAR | Fila cronologica simples nao atende itens e prioridade |
| Painel atual | REAPROVEITAR COM AJUSTES | Produto reaproveitavel, modelo de dados nao |
| Recepcao atual | REFATORAR | Continua como ponto de entrada, com nova estrutura |
| Oficina atual | REFATORAR | Passa a operar item, diagnostico e execucao |
| Relatorios atuais | REFATORAR | Precisam olhar item, OS, garantia e orcamento |
| Socket.io | REAPROVEITAR COM AJUSTES | Infra serve, eventos mudam |
| Upload atual | REAPROVEITAR COM AJUSTES | Generalizar para fotos de entrada |
| Componentes React comuns | REAPROVEITAR | Modais, badges, layout e base visual podem seguir |
| Controllers atuais de atendimento | SUBSTITUIR | Novo nucleo exige novos contratos |
| Services atuais de atendimento | SUBSTITUIR | Nao devem centralizar o dominio novo |
| Repositories atuais de atendimento | SUBSTITUIR | Novo modelo exige novos repositorios |
| Migrations existentes de clientes/motos/mecanicos/usuarios | REAPROVEITAR | Seguem uteis como base |
| Migrations de `atendimentos` e `historico_atendimentos` | REAPROVEITAR COM AJUSTES | Servem como legado/compatibilidade, nao como centro |
| Estruturas de video | REMOVER | Nao existem hoje; manter politica de nao criar |

## 12. Migracao e convivencia

## 12.1 Principio

O sistema atual deve continuar funcional enquanto a V2 e planejada e construida.

## 12.2 Estrategia recomendada

1. preservar o nucleo atual em operacao;
2. criar o novo nucleo V2 em paralelo dentro do mesmo projeto;
3. manter clientes, motocicletas e mecanicos como base compartilhada;
4. nao migrar telas antigas diretamente antes de o novo dominio estar fechado;
5. ativar a V2 somente apos validacao funcional completa.

## 12.3 Dados e convivencia

### Clientes

- reutilizar diretamente.

### Motocicletas

- reutilizar diretamente.

### Mecanicos

- reutilizar diretamente.

### Usuarios

- reutilizar diretamente, adicionando `ORCAMENTISTA`.

### Atendimentos antigos

Recomendacao:

- tratar como legado;
- converter para historico/OS legada quando a estrategia de migracao for executada;
- nao forcar migracao sem mapa de equivalencia.

## 12.4 Manter IDs

Recomendacao:

- manter IDs originais de clientes, motocicletas e mecanicos;
- para `atendimentos`, guardar referencia legado em `legado_atendimento_id` se necessario;
- `numero_os` deve ser preservado ou compatibilizado com a nova OS.

## 12.5 Testes sem afetar producao

Recomendacao:

- construir a V2 sem desligar a V1;
- usar ambiente paralelo;
- validar modelo de dados, regras e telas antes de corte;
- liberar por fase ou feature flag quando houver implementacao.

## 12.6 Ativacao da V2

Recomendacao:

- somente apos:
  - validacao de dominio;
  - validacao de permissoes;
  - validacao de relatorios;
  - validacao de painel;
  - validacao da recepcao, oficina e orcamento.

## 13. Riscos principais

1. Inflar `atendimentos` com novas colunas e gerar modelo contraditorio.
2. Misturar autorizacao, pagamento e status no mesmo campo.
3. Tentar manter um unico mecanico por processo.
4. Nao versionar orcamentos e perder rastreabilidade.
5. Nao separar OS e item nas consultas, relatorios e paineis.
6. Tratar WhatsApp como envio confirmado sem comprovacao real.
7. Armazenar videos por conveniencia e contradizer a regra aprovada.
8. Tentar migrar tudo de uma vez e quebrar o sistema atual.

## 14. Decisoes recomendadas e respostas objetivas

### 1. O item autorizado de execucao direta pode ser feito antes da conclusao do diagnostico da queixa principal?

- Recomendacao: sim.
- Justificativa: itens independentes devem seguir seu proprio fluxo.
- Impacto: exige status paralelo por item.
- Risco: confusao operacional se o painel nao separar bem os itens.

### 2. Item nao pago deve ser bloqueado ou apenas sinalizado?

- Recomendacao: apenas sinalizado.
- Justificativa: o bloqueio correto e a falta de autorizacao, nao a falta de pagamento.
- Impacto: exige alerta visual forte.
- Risco: execucao de item sem baixa financeira operacional.

### 3. Quem pode alterar pagamento por item?

- Recomendacao: `ADMIN` e `RECEPCAO`.
- Impacto: evita conflito com area tecnica.
- Risco: se o negocio quiser centralizar no orcamento, precisara rever matriz.

### 4. Quem pode alterar autorizacao?

- Recomendacao: `ADMIN`, `RECEPCAO` e `ORCAMENTISTA`.
- Impacto: mantem decisao comercial fora da oficina.
- Risco: duplicidade de criterio se nao houver regra operacional clara.

### 5. A garantia comeca na conclusao ou na retirada?

- Recomendacao: na retirada.
- Justificativa: alinha ao uso real pelo cliente.
- Impacto: depende de fechamento de retirada.
- Risco: se retirada demorar muito, posterga inicio da garantia.

### 6. Garantia de 90 dias sera fixa ou editavel?

- Recomendacao: automatica por padrao, editavel so por `ADMIN` e `ORCAMENTISTA`.
- Impacto: preserva simplicidade e prepara excecoes.
- Risco: se liberado para muitos perfis, perde consistencia.

### 7. Prioridade sera por OS, item ou ambos?

- Recomendacao: ambos.
- Justificativa: operacao por item e visao gerencial por OS.
- Impacto: requer prioridade agregada derivada.
- Risco: se o calculo agregado for pobre, o painel pode confundir.

### 8. Quantas fotos iniciais devem ser permitidas?

- Recomendacao: 8.
- Justificativa: cobre frente, traseira, laterais e detalhes basicos sem exagero.
- Impacto: controle de armazenamento razoavel.
- Risco: pode ser pouco ou muito dependendo da operacao; confirmar.

### 9. Qual tamanho maximo por foto?

- Recomendacao: 5 MB.
- Justificativa: bom equilibrio para celular e VPS.
- Impacto: reduz pressao de backup.
- Risco: imagens muito grandes podem exigir compressao adicional.

### 10. O orcamento deve separar peca e mao de obra?

- Recomendacao: sim.
- Justificativa: mais clareza comercial e tecnica.
- Impacto: mais campos por item.
- Risco: pequena complexidade extra de preenchimento.

### 11. Um orcamento deve possuir revisoes?

- Recomendacao: sim.
- Justificativa: protege auditoria e PDFs ja enviados.
- Impacto: exige versao.
- Risco: sem isso, perde-se trilha comercial.

### 12. Como calcular o status geral da OS?

- Recomendacao: por algoritmo de precedencia derivado dos itens.
- Impacto: centralizar regra no backend.
- Risco: se calculado em varias telas, gera divergencia.

### 13. O painel sera organizado por OS, moto ou item?

- Recomendacao: por OS na TV, com resumo de itens; detalhe operacional por item nas telas.
- Impacto: menos duplicidade visual.
- Risco: se o resumo for pobre, esconde complexidade demais.

### 14. O sistema atual deve continuar sendo executado em paralelo durante a construcao?

- Recomendacao: sim.
- Justificativa: reduz risco operacional.
- Impacto: convivencia temporaria de V1 e V2.
- Risco: exige disciplina de fronteira entre os nucleos.

### 15. Como tratar atendimentos antigos?

- Recomendacao: como legado, com conversao controlada para historico/OS legada quando a migracao for planejada.
- Impacto: preserva rastreabilidade.
- Risco: migracao apressada pode distorcer dados historicos.

## 15. Ambiguidades restantes

1. O perfil `ORCAMENTISTA` sera usuario exclusivo ou extensao de `RECEPCAO`.
2. Se toda queixa gera automaticamente um item de diagnostico.
3. Se a alteracao de pagamento por `ORCAMENTISTA` sera aprovada.
4. Se o PDF sera armazenado pelo sistema ou apenas referenciado por arquivo.
5. Se a garantia podera ter regras especificas por categoria de servico ja na V2 inicial.
6. Se a recepcao podera marcar itens como pagos na abertura.
7. Se itens recusados permanecem visiveis por padrao no painel administrativo ou apenas no prontuario.

## 16. Plano sugerido de implementacao por etapas

### Etapa 1. Fechamento funcional final

- validar ambiguidades restantes;
- aprovar estados, perfis e regras de precedencia.

### Etapa 2. Modelagem tecnica de dados

- transformar a modelagem conceitual em modelo logico.

### Etapa 3. Nucleo backend da V2

- OS;
- itens;
- historicos;
- diagnostico;
- orcamento;
- autorizacao;
- pagamento;
- execucao;
- peca;
- garantia;
- fotos;
- comunicacoes.

### Etapa 4. Recepcao V2

- abertura da OS estruturada.

### Etapa 5. Oficina V2

- operacao por item.

### Etapa 6. Orcamento V2

- revisoes, numero externo e PDF.

### Etapa 7. Prontuario V2

- consolidacao por motocicleta.

### Etapa 8. Painel, relatorios e socket V2

- novas agregacoes e eventos.

### Etapa 9. Migracao gradual

- convivencia;
- testes;
- validacao;
- ativacao controlada.

## 17. Conclusao

O novo nucleo da V2 deve ser construido dentro do projeto atual, mas nao deve reaproveitar `atendimentos` como centro do negocio.

O coracao correto da V2 e:

- `ordens_servico` como cabecalho;
- `itens_ordem_servico` como unidade operacional;
- dominios satelites para diagnostico, orcamento, autorizacao, pagamento, execucao, garantia, peca, fotos e comunicacao.

Essa definicao:

- reduz remendos;
- preserva o que ja funciona;
- prepara o sistema para crescimento real;
- cria base correta para oficina multi-item, multi-mecanico e multi-fase;
- mantem a V1 viva ate que a V2 esteja validada.
