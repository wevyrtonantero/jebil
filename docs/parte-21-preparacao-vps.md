# Parte 21 - Preparacao para VPS

## Objetivo

Deixar o repositorio pronto para uma implantacao em VPS Linux.

## Artefatos criados

* `ecosystem.config.cjs`
* `deploy/nginx-jebil.conf`
* `scripts/vps-migrate.sh`
* `scripts/vps-seed.sh`
* `scripts/backup-mysql.sh`
* `scripts/update-app.sh`
* `scripts/rollback-release.sh`
* `docs/procedimento-backup.md`
* `docs/procedimento-atualizacao.md`
* `docs/procedimento-rollback.md`

## Ajustes de ambiente

Adicionar em `backend/.env`:

* `UPLOAD_BASE_URL`
* `UPLOAD_DIR`

## Observacao

Esta parte cobre preparacao e documentacao. A publicacao real depende da existencia de uma VPS alvo.
