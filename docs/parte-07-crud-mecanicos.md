# Parte 07 - CRUD de Mecanicos

## Objetivo

Implementar o cadastro de mecanicos com foto, ordenacao e controle de status.

## Rotas implementadas

* `GET /api/mecanicos`
* `GET /api/mecanicos/:id`
* `POST /api/mecanicos`
* `PUT /api/mecanicos/:id`
* `PATCH /api/mecanicos/:id/status`
* `POST /api/mecanicos/:id/foto`
* `DELETE /api/mecanicos/:id/foto`

## Regras implementadas

* nome obrigatorio
* `ordem_exibicao` opcional
* listagem com filtro por `ativo`
* inativacao logica
* upload de foto com `multer`
* tipos permitidos: `jpg`, `jpeg`, `png` e `webp`
* limite de 5 MB por arquivo
* avatar padrao quando nao existir foto
* acesso de leitura para `ADMIN`, `RECEPCAO` e `OFICINA`
* acesso de escrita apenas para `ADMIN`

## Estrutura adicionada

* `backend/src/config/upload.js`
* `backend/src/middlewares/uploadErrorMiddleware.js`
* `backend/uploads/mecanicos/default-avatar.svg`

## Testes executados

### Sucesso

* carga do backend com as novas rotas e dependencias
* `npm test` aprovado
* `GET /api/health` respondendo com o backend iniciado

### Limitacao atual

Os fluxos reais de cadastro e upload ainda dependem do banco MySQL local configurado no `backend/.env`.

## Comandos

```bash
cd backend
npm install
npm test
npm run start
```
