# Parte 06 - CRUD de Motocicletas

## Objetivo

Implementar o cadastro de motocicletas vinculadas a clientes.

## Rotas implementadas

* `GET /api/motocicletas`
* `GET /api/motocicletas/:id`
* `GET /api/clientes/:clienteId/motocicletas`
* `POST /api/motocicletas`
* `PUT /api/motocicletas/:id`
* `PATCH /api/motocicletas/:id/status`
* `PATCH /api/motocicletas/:id/reativar`

## Regras implementadas

* `cliente_id` obrigatorio
* modelo obrigatorio
* marca opcional
* cor opcional
* placa opcional
* KM opcional
* validacao de placa
* normalizacao de placa antes da comparacao
* vinculacao obrigatoria a cliente existente
* busca por placa
* busca por modelo
* busca por proprietario
* listagem por cliente
* inativacao logica
* reativacao por rota dedicada
* sugestao de reativacao quando a placa ja existir em cadastro inativo
* bloqueio de reativacao se outra motocicleta ativa ja usar a mesma placa
* acesso permitido apenas para `ADMIN` e `RECEPCAO`

## Parametros de consulta

`GET /api/motocicletas`

Suporta:

* `placa`
* `modelo`
* `proprietario`
* `cliente_id`
* `ativo`
* `page`
* `limit`

## Testes executados

### Sucesso

* service sugerindo reativacao quando a placa existe em motocicleta inativa
* service bloqueando listagem por cliente inexistente
* testes gerais do backend aprovados com as rotas e services carregando corretamente

### Limitacao atual

Assim como na Parte 05, a validacao real no MySQL depende das credenciais de banco no `backend/.env`.

## Comandos

```bash
cd backend
npm test
```
