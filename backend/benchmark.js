import { performance } from "node:perf_hooks";
import SearchEngine from "./searchEngine.js";

const engine = new SearchEngine();

const files = [];

for (let i = 1; i <= 100000; i++) {
    files.push({
        name: i % 10 === 0
            ? `Java Notes ${i}.pdf`
            : i % 10000 === 1
                ? `Quantum Research ${i}.txt`
                : `Document ${i}.txt`,
        path: `C:/Benchmark/Document${i}`,
        extension: i % 10 === 0 ? ".pdf" : ".txt",
        size: 1000 + i
    });
}

const queries = ["quantum", "java", "document"];
const RUNS = 10;
const K = 10;

function linearSearch(query) {
    const normalizedQuery = query.toLowerCase();

    return files.filter(file =>
        file.name.toLowerCase().includes(normalizedQuery)
    );
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

// Build the index
const buildStart = performance.now();

engine.buildIndex(files);

const buildEnd = performance.now();

console.log("\n========== INDEX CONSTRUCTION ==========");
console.log("Total files:", files.length);
console.log(
    "Index construction time:",
    (buildEnd - buildStart).toFixed(3),
    "ms"
);

for (const query of queries) {
    // Warm up both search methods
    for (let i = 0; i < 3; i++) {
        linearSearch(query);
        engine.search(query, K);
    }

    const linearTimes = [];
    const indexedTimes = [];

    let linearMatches = 0;
    let indexedMatches = 0;

    for (let i = 0; i < RUNS; i++) {
        // Linear search
        const linearStart = performance.now();

        const linearResults = linearSearch(query);

        const linearEnd = performance.now();

        linearTimes.push(linearEnd - linearStart);
        linearMatches = linearResults.length;

        // Indexed search
        const indexedStart = performance.now();

        const indexedResults = engine.search(query, K);

        const indexedEnd = performance.now();

        indexedTimes.push(indexedEnd - indexedStart);
        indexedMatches = indexedResults.totalMatches;
    }

    const linearMedian = median(linearTimes);
    const indexedMedian = median(indexedTimes);

    const speedup = indexedMedian > 0
        ? linearMedian / indexedMedian
        : 0;

    console.log(`\n========== QUERY: ${query} ==========`);

    console.log("Linear median:", linearMedian.toFixed(3), "ms");
    console.log("Indexed median:", indexedMedian.toFixed(3), "ms");

    console.log("Linear total matches:", linearMatches);
    console.log("Indexed total matches:", indexedMatches);

    console.log("Speedup:", speedup.toFixed(2) + "x");

    console.log(
        "Match counts equal:",
        linearMatches === indexedMatches
    );
}

console.log("\n========== BENCHMARK COMPLETE ==========");
