# Painel de Mercado

Site estático e gratuito com cotações do mercado brasileiro (com atraso), indicadores técnicos e dados macroeconômicos, para estudo. Não é recomendação de investimento. O escopo completo está em `ESCOPO.md`.

## Como rodar

Requer Node 22 ou superior.

```bash
npm install
npm test
npm run build   # gera frontend/out
npm run servir  # serve frontend/out em http://localhost:3000
```

Copie `.env.example` para `.env` e preencha `BRAPI_TOKEN` só se for rodar a coleta (`npm run coletar`).

## Estrutura

- `frontend/`: site Next.js com export estático.
- `pipeline/`: coleta e cálculo dos dados em JSON.
- `contratos/`: tipos do JSON compartilhado entre pipeline e site.
- `scripts/`: utilitários.
- `.github/workflows/`: CI e deploy.
