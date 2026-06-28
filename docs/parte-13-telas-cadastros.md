# Parte 13 - Telas de Cadastros

## Objetivo

Implementar as telas iniciais de clientes, motocicletas e mecanicos.

## Telas implementadas

* `frontend/src/pages/ClientesPage.jsx`
* `frontend/src/pages/MotocicletasPage.jsx`
* `frontend/src/pages/MecanicosPage.jsx`

## Regras implementadas

* cadastro e listagem de clientes
* cadastro e listagem de motocicletas
* cadastro e listagem de mecanicos
* inativacao e reativacao visual
* upload e remocao de foto do mecanico
* atualizacao em tempo real por eventos quando houver socket ativo

## Testes executados

### Sucesso

* frontend compilado com as tres telas
* lint aprovado apos ajuste dos efeitos de carga inicial

## Limitacao atual

O comportamento completo de gravacao depende da API conectada a um banco MySQL funcional.

## Comandos

```bash
cd frontend
npm run build
npm run lint
```
