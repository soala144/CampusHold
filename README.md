# CampusHold

A freelance marketplace with a tracked, payment-coordinated workflow: agree the scope, fund the job, deliver, approve, release.

> **Current stage: 3 — backend and database.** Real accounts and data in PostgreSQL. **Payments are still simulated** (the provider integration is Stage 4), and every financial figure is labelled as such.

## Setup

```bash
pnpm install
cp .env.example .env.local     # then fill in DATABASE_URL and SEED_PASSWORD
pnpm db:migrate                # create the tables
pnpm db:seed                   # add demo users, services and jobs
pnpm dev
```

Open http://localhost:3000.

| Script | What it does |
| --- | --- |
| `pnpm db:generate` | Create a new migration after changing `lib/server/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:seed` | Seed an empty database with demo data |
| `pnpm db:reset` | **Wipe all data** and reseed |
| `pnpm test:smoke` | Run migrations, seed and permission/lifecycle checks against an in-memory Postgres |

## Accounts

- **Anyone can sign up** at `/signup`. Email and SMS aren't connected yet, so verification codes and password-reset links are **printed in the server console**.
- **Demo accounts** from the seed all share `SEED_PASSWORD`. The seed prints the list. `tobi.essien@example.com` is an admin who both hires and freelances.
- To test both sides of a job, sign in as the client in one browser and the freelancer in another.

## How it works

- `lib/domain` — types, the job state machine and payment rules (shared by browser and server).
- `lib/store/operations.ts` — pure operations (accept, fund, approve, message…).
- `lib/server` — database (Drizzle), sessions, permissions (`authorize.ts`) and server actions.

The browser applies an operation instantly, then the server re-runs it: it identifies the user from the session cookie, checks permissions, runs the same operation inside a transaction and saves the result. The server's data always wins. Other users' email and phone numbers are never sent to the browser.

Service cover images are links (seed data uses free Unsplash placeholders, which must be replaced before launch).

## Environment

See `.env.example`. Never commit `.env.local`.
