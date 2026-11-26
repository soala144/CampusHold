# CampusHold

A freelance marketplace with a tracked, payment-coordinated workflow: agree the scope, fund the job, deliver, approve, release.

> **Current stage: 2 — frontend with mock data.** No backend, no real accounts, no real payments. Everything financial is labelled **Simulated**.

## Running locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. The landing page is at `/`; the app starts at `/dashboard`.

## Trying the workflows

- **As a visitor:** log out (sidebar, bottom left), then browse `/explore` and open a service. Requesting one asks you to sign up or log in, then returns you to the request.
- **As a client:** pick a service package, describe what you need, and it becomes a job request with the scope, price, deadline and revisions already agreed.
- **As a freelancer:** create and manage listings under **My services** (Working mode).

You're signed in as a demo user (Tobi Essien) who both hires and freelances. Switch between **Hiring** and **Working** at the top of the sidebar.

- **Every job workspace has Simulation controls** (dashed panel, bottom right). They let you act as the other party or the payment provider: accept a request, submit a delivery, confirm or fail a payment, settle funds, make a transfer succeed or fail.
- **Auth screens accept any valid input.** Use password `wrongpassword` on login, or code `000000` on verification, to see the error states.
- **Admin** (`/admin`) is visible to the demo user so disputes can be resolved and the ledger reconciled.
- **State lives in `localStorage`.** Reset it from Settings → Security → Reset demo data.

## Project structure

```
app/(marketing)     Public landing page
app/(auth)          Sign up, log in, verification, password reset
app/(app)           Signed-in app (browser-rendered in Stage 2)
components/ui       Design system primitives
components/*        Feature components (jobs, payments, disputes, admin…)
lib/domain          Types, job state machine, payment states, next-action rules
lib/store           Stage 2 mock store and pure state operations
lib/mock            Seed data
lib/validation      Zod schemas shared by forms (and the Stage 3 server)
```

The job lifecycle is enforced in one place: `lib/domain/job-machine.ts`. Balances are always derived from job and transaction records (`lib/domain/payment.ts`), never stored.

## Environment

Copy `.env.example` to `.env.local`. Payment provider keys are not used until Stage 4 and must never be committed.
