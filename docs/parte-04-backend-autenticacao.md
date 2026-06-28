# Parte 04 - Backend e Autenticacao

## Objetivo

Criar a base do back-end com camadas iniciais, autenticacao JWT, middlewares, validacao e controle de perfis.

## Implementado

### Estrutura e camadas

Foram adicionados:

* `config/jwt.js`
* `middlewares/authMiddleware.js`
* `middlewares/roleMiddleware.js`
* `middlewares/loginRateLimiter.js`
* `middlewares/requestLoggerMiddleware.js`
* `repositories/usuarioRepository.js`
* `services/authService.js`
* `validators/authValidator.js`
* `controllers/authController.js`
* `routes/authRoutes.js`
* `routes/index.js`
* utilitarios de erro, resposta padronizada, async handler e paginacao

### Autenticacao

Rotas implementadas:

* `POST /api/auth/login`
* `GET /api/auth/me`
* `POST /api/auth/logout`

Regras implementadas:

* senha validada com `bcryptjs`
* token assinado com JWT
* rotas privadas protegidas com Bearer token
* usuario inativo bloqueado
* perfis validados no back-end
* limitador basico de tentativas no login

### Respostas e erros

Padrao adotado para sucesso:

```json
{
  "success": true,
  "message": "Mensagem",
  "data": {}
}
```

Padrao adotado para erro:

```json
{
  "success": false,
  "message": "Mensagem de erro",
  "details": null
}
```

## Variaveis de ambiente adicionadas

```env
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=8h
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=10
```

## Testes executados

### Sucesso

* login valido em teste HTTP com `supertest`
* bloqueio de usuario inativo em teste de service
* `GET /api/health` funcionando com servidor real
* `GET /api/clientes` bloqueando perfil `OFICINA` em teste HTTP

### Resultado real

* `npm test`: sucesso
* `GET http://127.0.0.1:3333/api/health`: sucesso

### Limitacao atual

As rotas reais de login dependem do banco e dos seeds da Parte 03. Como a credencial MySQL local continua ausente no `backend/.env`, a validacao real com usuario persistido no banco ainda depende desse ajuste.

## Comandos

```bash
cd backend
copy .env.example .env
npm install
npm test
npm run start
```
