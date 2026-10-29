import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.js";
import { asvsRequirements, analyses, applications, components, threats, assessmentRecords, findings } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Hardening: Disable Express fingerprinting
  app.disable("x-powered-by");

  // Security Hardening: Standard HTTP Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // Limit JSON payload to prevent memory exhaustion DoS
  app.use(express.json({ limit: "2mb" }));

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
      
      // Input Validation
      if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 200) {
        return res.status(400).json({ error: "Invalid analysis name (must be 1-200 characters)" });
      }

      const validLevel = asvsLevel ? String(asvsLevel).trim() : "2";
      if (!["1", "2", "3"].includes(validLevel)) {
        return res.status(400).json({ error: "Invalid ASVS level (allowed values: 1, 2, 3)" });
      }

      const [newAnalysis] = await db.insert(analyses).values({
        name: name.trim(),
        asvsLevel: validLevel,
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
    const assetsPath = path.join(distPath, 'assets');
    app.use(express.static(distPath));
    app.use('/assets', express.static(assetsPath));
    app.use('/analysis/:id/assets', express.static(assetsPath));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
