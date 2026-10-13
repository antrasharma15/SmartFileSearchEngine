import express from "express";
import cors from "cors";
import { scanFolder } from "./scanner.js";
import SearchEngine from "./searchEngine.js";

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const engine = new SearchEngine();

// Scan a folder and build the index
app.post("/api/index", async (req, res) => {
    try {
        const { folderPath } = req.body;

        if (!folderPath) {
            return res.status(400).json({
                error: "Please provide a folder path."
            });
        }

        const files = await scanFolder(folderPath);
        const stats = engine.buildIndex(files);

        res.json({
            message: "Folder indexed successfully!",
            stats
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

        const results = engine.search(
            q,
            Number(limit),
            mode
        );

        res.json(results);
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
