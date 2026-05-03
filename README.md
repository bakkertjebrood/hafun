# Nautar

Marina management — op stroom. SaaS voor jachthavenbeheer (ligplaatsen,
huurders, reserveringen, facturatie, kassa, werkbonnen).

Built with **Nuxt 4**, **Nuxt UI v4**, **Prisma + PostgreSQL** and deployed on
**Heroku**.

## Quick Start

```bash
npm install
cp .env.example .env       # fill in DATABASE_URL, JWT_SECRET, ...
npm run db:setup           # push schema + seed demo data
npm run dev
```

App draait op http://localhost:3000.

## Production setup (Heroku)

Vereiste environment variables (`heroku config:set ...`):

| Variable | Beschrijving |
|---|---|
| `DATABASE_URL` | Postgres connection string (Heroku Postgres add-on) |
| `JWT_SECRET` | Lang random string (>= 64 chars) — sessie token signing |
| `APP_URL` | `https://<app>.herokuapp.com` of custom domain |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `POSTMARK_API_KEY` | Postmark Server token (transactionele mail) |
| `EMAIL_FROM` | Geverifieerd Postmark sender adres |
| `CLAUDE_API_KEY` | (Optioneel) Anthropic API key voor AI ligplaats-detectie |

### Google OAuth

1. Maak een OAuth 2.0 Client aan in
   [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Application type: **Web application**.
3. Authorized JavaScript origins: `https://<app>.herokuapp.com`.
4. Authorized redirect URIs: `https://<app>.herokuapp.com/api/auth/google/callback`.
5. Voeg op het OAuth consent screen verwijzingen toe naar `/privacy` en `/voorwaarden`.

### Postmark

`POSTMARK_API_KEY` is de Postmark *Server token* (niet de account token).
Verifieer het sender domain en zet `EMAIL_FROM` op een adres binnen dat domein.

### Database migraties

Het `Procfile` voert bij elke release `prisma db push` uit. Voor productie kun
je in plaats daarvan `prisma migrate deploy` gebruiken zodra je migraties checkt
in.

## Scripts

| Script | Beschrijving |
|---|---|
| `npm run dev` | Dev server met HMR |
| `npm run build` | Productie build (`prisma generate && nuxt build`) |
| `npm run start` | Run productie build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vue / TypeScript check |
| `npm run db:push` | Sync Prisma schema naar DB |
| `npm run db:studio` | Prisma Studio |

## Routes

- `/` — landing page
- `/login`, `/register` — auth (e-mail of Google)
- `/privacy`, `/voorwaarden` — juridische pagina's
- `/dashboard/*` — havenmeester app
- `/portal` — huurdersportaal
- `/api/auth/google/{start,callback}` — Google OAuth flow
