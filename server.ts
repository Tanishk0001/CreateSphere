import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/generate-video", async (req, res) => {
  const { prompt } = req.body;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    return res.status(400).json({ error: "OpenAI API Key not found. Please configure OPENAI_API_KEY in settings." });
  }

  try {
    const openai = new OpenAI({ apiKey: openAIKey });
    
    // As of now, Sora is not publicly available via API.
    // We'll return a clear error message that it's in limited release.
    // If it were available, we'd call openai.video.generations.create(...)
    
    res.status(501).json({ 
      error: "OpenAI Video Generation (Sora) is currently in limited release and not publicly available via API yet. Please use Gemini for video generation or wait for OpenAI's public release." 
    });
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate video with OpenAI." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
