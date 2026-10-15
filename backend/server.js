import express from "express";
import cors from "cors";
import { performance } from "node:perf_hooks";
import { scanFolder } from "./scanner.js";
import SearchEngine from "./searchEngine.js";

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const engine = new SearchEngine();

// Health check and root status endpoint
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Smart File Search API is running",
        endpoints: {
            health: "/api/health",
            search: "/api/search?q=<query>",
            autocomplete: "/api/autocomplete?prefix=<prefix>",
            index: "POST /api/index"
        }
    });
});

app.get("/api/health", (req, res) => {
    const isIndexed = Boolean(engine.indexed);
    res.json({
        status: "ok",
        message: "Search API is healthy",
        indexed: isIndexed,
        folderPath: engine.folderPath || null,
        totalFiles: isIndexed ? engine.metadata.getSize() : 0,
        scanTimeMs: engine.lastScanTimeMs || 0,
        indexTimeMs: engine.lastIndexTimeMs || 0,
        stats: isIndexed ? engine.getStats() : null
    });
});

// Scan a folder and build the index
app.post("/api/index", async (req, res) => {
  try {
    const { folderPath } = req.body;

    if (!folderPath) {
      return res.status(400).json({
        error: "Please provide a folder path."
      });
    }

    // Measure folder scanning time
    const scanStart = performance.now();
    const files = await scanFolder(folderPath);
    const scanEnd = performance.now();

    // Measure DSA index construction time
    const indexStart = performance.now();
    const indexStats = engine.buildIndex(files);
    const indexEnd = performance.now();

    engine.folderPath = folderPath;
    engine.lastScanTimeMs = Number((scanEnd - scanStart).toFixed(3));
    engine.lastIndexTimeMs = Number((indexEnd - indexStart).toFixed(3));

    res.json({
      message: "Folder indexed successfully!",
      totalFiles: files.length,
      scanTimeMs: engine.lastScanTimeMs,
      indexTimeMs: engine.lastIndexTimeMs,
      indexStats,
      stats: indexStats
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Search indexed filenames
app.get("/api/search", (req, res) => {
    try {
        const { q = "", limit = "10", mode = "AND" } = req.query;

        if (!engine.indexed) {
            return res.status(400).json({
                indexed: false,
                error: "Please index a folder first by clicking 'Index Folder'!"
            });
        }

        const results = engine.search(
            q,
            Number(limit),
            mode
        );

        const linearResults = engine.linearSearch(
            q,
            Number(limit)
        );

        res.json({
            ...results,
            indexed: true,
            totalFiles: engine.metadata.getSize(),
            linearSearchTimeMs: linearResults.searchTimeMs,
            linearTotalMatches: linearResults.totalMatches
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Filename autocomplete
app.get("/api/autocomplete", (req, res) => {
    const { prefix = "", limit = "10" } = req.query;

    res.json(engine.autocomplete(prefix, Number(limit)));
});

app.listen(PORT, () => {
    console.log(`Search API running at http://localhost:${PORT}`);
});
