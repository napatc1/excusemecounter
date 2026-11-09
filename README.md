# Excuse Me Counter

A GitHub Pages site that asks **"Enter a Username:"**.

- If the username is the secret word, every press of the **spacebar** adds 1 to the counter.
- Everyone else sees the same big number update live, but can't change it.
- The count never resets. It's stored in Supabase.

## How the secret stays secret

The secret word is not in this repo. Supabase stores only a hash of it, in a table the public can't read. The page asks the database "is this the right word?", and the database decides who can add to the counter.

## Setup

1. In Supabase, open **SQL Editor**, paste in `supabase-setup.sql`, replace `YOUR_SECRET_WORD` with your word, and run it. Don't commit your real word.
2. In GitHub, go to **Settings → Pages**, set the source to **Deploy from a branch**, choose `main` and `/ (root)`, then save.

To change the word later, run only the last `insert ... on conflict` statement from the setup file with a new word.
