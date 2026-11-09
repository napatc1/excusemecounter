const express = require("express");
const fs = require("fs");
const path = require("path");

const EDITOR = "excusemeee";
const PORT = process.env.PORT || 3000;

// ---------- Storage ----------
// If DATABASE_URL is set, the count lives in Postgres (survives restarts/redeploys).
// Otherwise it is kept in count.json next to this file.
let store;

if (process.env.DATABASE_URL) {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
  });
  store = {
    async init() {
      await pool.query(
        "CREATE TABLE IF NOT EXISTS counter (id INT PRIMARY KEY, value BIGINT NOT NULL DEFAULT 0)"
      );
      await pool.query(
        "INSERT INTO counter (id, value) VALUES (1, 0) ON CONFLICT (id) DO NOTHING"
      );
    },
    async get() {
      const r = await pool.query("SELECT value FROM counter WHERE id = 1");
      return Number(r.rows[0].value);
    },
    async increment() {
      const r = await pool.query(
        "UPDATE counter SET value = value + 1 WHERE id = 1 RETURNING value"
      );
      return Number(r.rows[0].value);
    },
  };
} else {
  const file = process.env.COUNT_FILE || path.join(__dirname, "count.json");
  let value = 0;
  store = {
    async init() {
      try {
        value = Number(JSON.parse(fs.readFileSync(file, "utf8")).value) || 0;
      } catch {
        value = 0;
      }
    },
    async get() {
      return value;
    },
    async increment() {
      value += 1;
      fs.writeFileSync(file, JSON.stringify({ value }));
      return value;
    },
  };
}

// ---------- Live updates (Server-Sent Events) ----------
const clients = new Set();
function broadcast(count) {
  const msg = `data: ${JSON.stringify({ count })}\n\n`;
  for (const res of clients) res.write(msg);
}

// ---------- App ----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/count", async (req, res) => {
  res.json({ count: await store.get() });
});

app.get("/api/stream", async (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ count: await store.get() })}\n\n`);
  clients.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => {
    clearInterval(ping);
    clients.delete(res);
  });
});

app.post("/api/press", async (req, res) => {
  const username = String((req.body && req.body.username) || "").trim();
  if (username !== EDITOR) {
    return res.status(403).json({ error: "Only excusemeee can change the counter" });
  }
  const count = await store.increment();
  broadcast(count);
  res.json({ count });
});

store
  .init()
  .then(() => {
    app.listen(PORT, () => console.log(`excusemecounter running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
