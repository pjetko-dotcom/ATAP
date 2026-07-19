import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.js";
import { asvsRequirements, analyses, applications, components, threats, assessmentRecords, findings } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  
  // Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Analyses
  app.get("/api/analyses", async (req, res) => {
    try {
      const allAnalyses = await db.query.analyses.findMany({
        orderBy: (analyses, { desc }) => [desc(analyses.updatedAt)],
      });
      res.json(allAnalyses);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/analyses", async (req, res) => {
    try {
      const { name, asvsLevel } = req.body;
      const [newAnalysis] = await db.insert(analyses).values({
        name,
        asvsLevel,
        asvsCatalogVersion: "5.0.0",
      }).returning();
      res.json(newAnalysis);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
