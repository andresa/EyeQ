# EyeQ

Employee testing platform built with React, TypeScript, Ant Design, and Azure Static Web Apps. Employers create tests, assign them to employees, and track completion. Admins manage companies and employers. APIs are Azure Functions under `api/` with Cosmos DB (EyeQDB).

## Tech Stack

- Vite + React (TypeScript)
- Ant Design + Ant Design Mobile
- Azure Static Web Apps + Azure Functions
- Azure Cosmos DB
- React Query, date-fns
- Jest + Testing Library

## Getting Started

```bash
npm install
npm run dev
```

## API & Database

API endpoints live under `api/` and are Azure Functions-compatible. Cosmos DB configuration lives in `api/shared/cosmos.ts`.

For local development, update `api/local.settings.json` with your connection string.

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - typecheck + build
- `npm run lint` - lint
- `npm run test` - run Jest tests

## Azure Static Web Apps

`staticwebapp.config.json` handles SPA routing and API exclusion. GitHub Actions workflow is located at `.github/workflows/azure-static-web-apps.yml`. Add `AZURE_STATIC_WEB_APPS_API_TOKEN` in repo secrets.

## Notes

- Authentication is email-only (no passwords). Login creates/fetches user records in Cosmos DB.
- Admin endpoints are exposed under `/api/management/*` to avoid Azure Functions built-in `/admin` routes.
- Containers: companies, employers, employees, tests, testInstances, responses, admins, users, scores.
