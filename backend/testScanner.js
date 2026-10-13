import { scanFolder } from "./scanner.js";
import SearchEngine from "./searchEngine.js";

async function main() {
    // Scan existing project folder or command line argument
    const folderPath = process.argv[2] || ".";

    console.log(`Scanning folder: ${folderPath}`);

    // Step 1: Scan the folder
    const files = await scanFolder(folderPath);

    console.log("Total files scanned:", files.length);

    // Step 2: Build the search index
    const engine = new SearchEngine();
    const stats = engine.buildIndex(files);

    console.log("Index statistics:", stats);

    // Step 3: Search filenames
    const results = engine.search("java");

    console.log("Search results:");
    console.log(results);

    // Also search a term present in this directory to demonstrate matched results
    console.log("\nSearch results for 'file':");
    console.log(engine.search("file"));
}

main().catch(console.error);
