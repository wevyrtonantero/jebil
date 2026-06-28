# Procedimento de Atualizacao

## Passos

1. Criar backup do banco e dos uploads.
2. Atualizar o codigo:

```bash
./scripts/update-app.sh
```

3. Validar `GET /api/health`.
4. Validar login.
5. Validar fluxo basico de recepcao e oficina.

## Observacao

Se houver falha apos a atualizacao, aplicar rollback com o procedimento dedicado.
