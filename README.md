# AM Global Data Next.js App

## Stack
- Next.js 14 (React 18)
- Node.js via Next API routes
- PostgreSQL for transaction data (`pg` client)
- SWR for client fetching

## Setup
1. Install dependencies:
   ```bash
   cd am-global-web
   npm install
   ```
2. Provide `DATABASE_URL` (e.g. `postgres://user:pass@localhost:5432/am_global`) and `NODE_ENV` (optional) in `.env.local`.
3. Run the app with `npm run dev`.

## Database expectations
Create a `transactions` table:
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  service TEXT,
  status TEXT,
  amount TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Seed a few rows so `/api/dashboard` can return examples.

## What’s included
- `src/pages/index.js` renders the dashboard and fetches `/api/dashboard`.
- `src/pages/api/dashboard.js` uses `src/lib/db.js` to query Postgres (fall-back responses show sample data even without actual rows).
- `src/styles/globals.css` provides the fintech visual tokens.

This gives you a N ext.js/Node.js foundation. Let me know when you’re ready to wire in real auth, payment APIs, or the Expo mobile version.
