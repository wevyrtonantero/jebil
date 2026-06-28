# Parte 03 - Banco MySQL

## Objetivo

Criar a base de banco MySQL com migrations, relacionamentos, indices e seeds iniciais para o sistema.

## Decisoes tecnicas desta parte

* `knex` foi adotado para migrations e seeds.
* `mysql2` foi adotado como driver MySQL do Node.js.
* `bcryptjs` foi adotado para gerar hash das senhas dos usuarios de desenvolvimento.
* `controle_sequencias_os` foi criado para suportar a numeracao anual `OS-AAAA-NNNNNN`.
* `cpf_normalizado` foi criado para garantir unicidade de CPF com ou sem mascara.
* `placa_normalizada` foi criada para comparar placa sem diferenca de caixa, espaco ou hifen.
* a unicidade de placa foi modelada como composta com `ativo`, preservando a regra de unicidade entre motocicletas ativas.
* `ordem_fila` foi mantido no schema como coluna opcional de compatibilidade visual, mas a prioridade oficial continua baseada em `entrada_em`.

## Estrutura adicionada

```text
backend/
  knexfile.js
  src/
    database/
      connection.js
      createDatabase.js
      migrations/
        20260620090000_create_usuarios_table.js
        20260620090100_create_clientes_table.js
        20260620090200_create_motocicletas_table.js
        20260620090300_create_mecanicos_table.js
        20260620090400_create_controle_sequencias_os_table.js
        20260620090500_create_atendimentos_table.js
        20260620090600_create_historico_atendimentos_table.js
      seeds/
        001_usuarios_desenvolvimento.js
    utils/
      hashPassword.js
      normalizeCpf.js
      normalizePlate.js
      formatOsNumber.js
  tests/
    database-utils.test.js
```

## Tabelas criadas nas migrations

### `usuarios`

Campos principais:

* `id`
* `nome`
* `email`
* `senha_hash`
* `perfil`
* `ativo`
* `ultimo_login_em`
* `criado_em`
* `atualizado_em`

Indices e restricoes:

* unico em `email`
* indice em `perfil + ativo`

### `clientes`

Campos principais:

* `id`
* `nome`
* `telefone`
* `cpf`
* `cpf_normalizado`
* `observacoes`
* `ativo`
* `criado_em`
* `atualizado_em`

Indices e restricoes:

* unico em `cpf_normalizado`
* indice em `nome`
* indice em `telefone`

### `motocicletas`

Campos principais:

* `id`
* `cliente_id`
* `marca`
* `modelo`
* `cor`
* `placa`
* `placa_normalizada`
* `km`
* `observacoes`
* `ativo`
* `criado_em`
* `atualizado_em`

Indices e restricoes:

* FK para `clientes`
* unico composto em `placa_normalizada + ativo`
* indice em `cliente_id`
* indice em `modelo`
* indice em `placa_normalizada`

### `mecanicos`

Campos principais:

* `id`
* `nome`
* `foto_url`
* `ativo`
* `ordem_exibicao`
* `criado_em`
* `atualizado_em`

Indices e restricoes:

* indice em `ativo + ordem_exibicao`

### `controle_sequencias_os`

Campos principais:

* `ano`
* `ultimo_numero`
* `criado_em`
* `atualizado_em`

Finalidade:

* controlar a sequencia anual da OS com seguranca transacional nas proximas partes.

### `atendimentos`

Campos principais:

* `id`
* `numero_os`
* `cliente_id`
* `motocicleta_id`
* `mecanico_id`
* `problema_servico`
* `observacoes`
* `observacoes_internas`
* `status`
* `situacao_pagamento`
* `entrada_em`
* `assumido_em`
* `servico_concluido_em`
* `pagamento_confirmado_em`
* `pagamento_confirmado_por`
* `liberado_retirada_em`
* `retirada_confirmada_em`
* `finalizado_em`
* `cancelado_em`
* `ordem_fila`
* `criado_por`
* `criado_em`
* `atualizado_em`

Indices e restricoes:

* unico em `numero_os`
* FKs para `clientes`, `motocicletas`, `mecanicos` e `usuarios`
* indice em `status`
* indice em `mecanico_id`
* indice em `entrada_em`
* indice em `status + entrada_em`
* indice em `situacao_pagamento`

### `historico_atendimentos`

Campos principais:

* `id`
* `atendimento_id`
* `usuario_id`
* `mecanico_id`
* `acao`
* `status_anterior`
* `status_novo`
* `observacao`
* `criado_em`

Indices e restricoes:

* FKs para `atendimentos`, `usuarios` e `mecanicos`
* indice em `atendimento_id`
* indice em `criado_em`
* indice em `acao`

## Relacionamentos

* `motocicletas.cliente_id -> clientes.id`
* `atendimentos.cliente_id -> clientes.id`
* `atendimentos.motocicleta_id -> motocicletas.id`
* `atendimentos.mecanico_id -> mecanicos.id`
* `atendimentos.pagamento_confirmado_por -> usuarios.id`
* `atendimentos.criado_por -> usuarios.id`
* `historico_atendimentos.atendimento_id -> atendimentos.id`
* `historico_atendimentos.usuario_id -> usuarios.id`
* `historico_atendimentos.mecanico_id -> mecanicos.id`

## Seeds implementados

Seed criado:

* `001_usuarios_desenvolvimento.js`

Usuarios previstos:

* 1 usuario `ADMIN`
* 1 usuario `RECEPCAO`
* 1 usuario `OFICINA`

Caracteristicas:

* emails configuraveis por `.env`
* senhas configuraveis por `.env`
* hashes gerados com `bcryptjs`
* nenhuma senha real do cliente foi registrada no repositorio

## Variaveis de ambiente necessarias

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=jebil
DB_USER=root
DB_PASSWORD=
DB_POOL_MIN=0
DB_POOL_MAX=10
SEED_ADMIN_EMAIL=admin@jebil.local
SEED_ADMIN_PASSWORD=dev-admin-123
SEED_RECEPCAO_EMAIL=recepcao@jebil.local
SEED_RECEPCAO_PASSWORD=dev-recepcao-123
SEED_OFICINA_EMAIL=oficina@jebil.local
SEED_OFICINA_PASSWORD=dev-oficina-123
```

## Comandos

Criar/verificar o banco:

```bash
cd backend
npm run db:create
```

Executar migrations:

```bash
cd backend
npm run db:migrate
```

Executar seeds:

```bash
cd backend
npm run db:seed
```

Consultar status das migrations:

```bash
cd backend
npm run db:status
```

Rollback:

```bash
cd backend
npm run db:migrate:rollback
```

## Testes executados

### Testes tecnicos executados com sucesso

* `npm test`
* carregamento do `knexfile.js`
* validacao de utilitarios de normalizacao
* validacao do formato `OS-2026-000001`
* validacao de hash bcrypt
* verificacao da porta `3306` em `127.0.0.1`

### Resultados reais

* `npm test`: sucesso, 5 testes aprovados
* `Test-NetConnection 127.0.0.1:3306`: `TcpTestSucceeded = True`
* `node -e ... require('./knexfile')`: sucesso

### Validacao real de banco

Foi tentado executar:

* `npm run db:create`
* `npm run db:status`

Resultado real no ambiente atual:

* falha por credencial de MySQL local
* mensagem retornada: `Access denied for user 'root'@'localhost' (using password: NO)`

Conclusao:

* a implementacao da Parte 03 foi concluida;
* a validacao completa das migrations e seeds depende de ajustar `DB_USER` e `DB_PASSWORD` no `backend/.env` para um usuario MySQL com permissao.

## Regras de integridade representadas na modelagem

* perfis fixos de usuario: `ADMIN`, `RECEPCAO`, `OFICINA`
* status fixos de atendimento
* situacao de pagamento fixa: `PENDENTE` e `PAGO`
* CPF unico quando preenchido
* placa normalizada com controle de unicidade entre motos ativas
* mecanico separado de usuario
* numero de OS preparado para controle anual
* historico separado e vinculado por FK ao atendimento
