const express = require("express");
const fs = require("fs");
const path = require("path");

const crypto = require("crypto");

// The secret word is NOT stored in the code. Set it as an environment variable:
//   EDITOR_SECRET=yourword npm start
const EDITOR_SECRET = process.env.EDITOR_SECRET || "";
if (!EDITOR_SECRET) console.warn("EDITOR_SECRET is not set - nobody will be able to change the counter.");

function isEditor(word) {
  if (!EDITOR_SECRET) return false;
  const a = crypto.createHash("sha256").update(String(word || "").trim()).digest();
  const b = crypto.createHash("sha256").update(EDITOR_SECRET).digest();
  return crypto.timingSafeEqual(a, b);
}

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

app.post("/api/login", (req, res) => {
  res.json({ editor: isEditor(req.body && req.body.username) });
});

app.post("/api/press", async (req, res) => {
  if (!isEditor(req.body && req.body.username)) {
    return res.status(403).json({ error: "Not allowed" });
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
