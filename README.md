# Excuse Me Counter

A website that asks **"Enter a Username:"**.

- If the username is the secret word, every press of the **spacebar** adds 1 to the counter.
- Anyone else sees the same big number update live, but can't change it.
- The count never resets.

## Run locally

```bash
npm install
EDITOR_SECRET=yourSecretWord npm start
```

The secret word is only ever stored in the `EDITOR_SECRET` environment variable, never in the code. On a host like Render, add it under Environment Variables.

Then open http://localhost:3000.

## Keeping the count permanently

Without a database, the count is saved to `count.json`. That works on your own computer or a server with a persistent disk.

Many free hosts (like Render's free tier) wipe files on every redeploy. On those hosts, set a `DATABASE_URL` environment variable pointing at a Postgres database (Render Postgres, Supabase, Neon, etc.). The table is created automatically.
