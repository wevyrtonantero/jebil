# Parte 05 - CRUD de Clientes

## Objetivo

Implementar o cadastro de clientes no back-end com busca, paginacao, inativacao e reativacao.

## Rotas implementadas

* `GET /api/clientes`
* `GET /api/clientes/:id`
* `POST /api/clientes`
* `PUT /api/clientes/:id`
* `PATCH /api/clientes/:id/status`
* `PATCH /api/clientes/:id/reativar`

## Regras implementadas

* nome obrigatorio
* CPF opcional
* validacao de CPF quando preenchido
* busca por nome
* busca por CPF
* busca por telefone
* paginacao por `page` e `limit`
* inativacao logica
* reativacao por rota dedicada
* bloqueio de duplicidade de CPF
* sugestao de reativacao quando o CPF ja existir em cadastro inativo
* acesso permitido apenas para `ADMIN` e `RECEPCAO`

## Parametros de consulta

`GET /api/clientes`

Suporta:

* `nome`
* `cpf`
* `telefone`
* `ativo`
* `page`
* `limit`

## Testes executados

### Sucesso

* service detectando CPF duplicado em cliente inativo e sugerindo reativacao
* service retornando metadados de paginacao
* rota bloqueando o perfil `OFICINA`
* rota respondendo payload paginado no teste HTTP

### Limitacao atual

Os testes reais contra MySQL ainda dependem das credenciais corretas do banco local para executar migrations e seeds.

## Comandos

```bash
cd backend
npm test
```
