# Parte 08 - Atendimentos e Fila

## Objetivo

Implementar a criacao de atendimentos, numero de OS e fila inicial da oficina.

## Rotas implementadas

* `GET /api/atendimentos`
* `GET /api/atendimentos/fila`
* `GET /api/atendimentos/:id`
* `POST /api/atendimentos`
* `PATCH /api/atendimentos/:id/assumir`

## Regras implementadas

* cliente obrigatorio
* motocicleta obrigatoria
* validacao de pertencimento da motocicleta ao cliente
* geracao automatica de numero de OS por ano
* entrada inicial com status `AGUARDANDO`
* envio automatico para a fila da oficina
* mecanico inativo nao pode assumir atendimento
* atendimento ja assumido nao pode ser assumido novamente
* dados sensiveis do cliente ocultados para perfil `OFICINA`

## Estrutura adicionada

* `backend/src/services/atendimentoService.js`
* `backend/src/repositories/atendimentoRepository.js`
* `backend/src/database/migrations/20260620090400_create_controle_sequencias_os_table.js`
* `backend/src/database/migrations/20260620090500_create_atendimentos_table.js`

## Testes executados

### Sucesso

* backend carregando services, repositories e regras da fila sem quebrar a suite
* `npm test` aprovado

### Limitacao atual

O fluxo completo de criacao e fila depende das migrations aplicadas em um MySQL acessivel.

## Comandos

```bash
cd backend
npm test
npm run start
```
