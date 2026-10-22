import path from "node:path";
import express from "express";

const app = express();
app.disable("x-powered-by");

app.use(express.json({ limit: "100kb" }));

app.get("/api/salud", (req, res) => {
  res.json({ ok: true });
});

app.use(express.static(path.join(import.meta.dirname, "..", "web")));

export { app };
