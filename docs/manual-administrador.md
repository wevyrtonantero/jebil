# Manual do Administrador

## Responsabilidades

* Gerenciar usuarios do banco e variaveis de ambiente.
* Gerenciar cadastro de mecanicos.
* Validar o fluxo completo da recepcao e da oficina.
* Acompanhar relatorios e historicos.
* Preparar backups, atualizacoes e rollback.

## Checklist operacional

* Verificar `backend/.env` e `frontend/.env`.
* Garantir que migrations e seeds estejam consistentes.
* Confirmar que `npm test`, `npm run lint` e `npm run build` passaram antes de publicar.
* Confirmar que uploads estao persistidos fora de deploy descartavel.
