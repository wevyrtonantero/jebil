# Procedimento de Rollback

## Passos

1. Escolher a referencia Git anterior estavel.
2. Executar:

```bash
./scripts/rollback-release.sh <git-ref>
```

3. Validar `GET /api/health`.
4. Validar login e telas principais.

## Observacao

Rollback de codigo nao substitui restauracao de banco. Se houver migration destrutiva, o plano de banco deve ser tratado separadamente.
