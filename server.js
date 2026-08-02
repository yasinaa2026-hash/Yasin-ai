import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProvider } from "./services/provider.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const maxFileMb = Number(process.env.MAX_FILE_MB || 10);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: `${maxFileMb}mb` }));
app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RATE_LIMIT || 30),
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/", limiter);

const provider = createProvider();

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    demoMode: provider.demoMode,
    provider: provider.name,
    model: provider.model || null
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model, temperature, maxTokens } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages are required." });
    }

    const safeMessages = messages.slice(-40).map((m) => ({
      role: ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
      content: typeof m.content === "string" ? m.content.slice(0, 100_000) : m.content
    }));

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    await provider.stream({
      messages: safeMessages,
      model: typeof model === "string" ? model : undefined,
      temperature: Number.isFinite(Number(temperature)) ? Number(temperature) : 0.7,
      maxTokens: Number.isFinite(Number(maxTokens)) ? Number(maxTokens) : 2048,
      onToken(token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("AI request failed:", error.message);
    if (!res.headersSent) {
      return res.status(502).json({ error: "AI service unavailable." });
    }
    res.write(`data: ${JSON.stringify({ error: "AI service unavailable." })}\n\n`);
    res.end();
  }
});

app.get("*splat", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Yasin AI running at http://localhost:${port}`);
});