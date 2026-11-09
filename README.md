# Excuse Me Counter

A website that asks **"Enter a Username:"**.

- If the username is `excusemeee`, every press of the **spacebar** adds 1 to the counter.
- Anyone else sees the same big number update live, but can't change it.
- The count never resets.

## Run locally

```bash
npm install
npm start
```

Then open http://localhost:3000.

## Keeping the count permanently

Without a database, the count is saved to `count.json`. That works on your own computer or a server with a persistent disk.

Many free hosts (like Render's free tier) wipe files on every redeploy. On those hosts, set a `DATABASE_URL` environment variable pointing at a Postgres database (Render Postgres, Supabase, Neon, etc.). The table is created automatically.
