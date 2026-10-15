import { Trie } from "../dsa/Trie.js";
import { InvertedIndex } from "../dsa/InvertedIndex.js";
import { MinHeap } from "../dsa/MinHeap.js";
import FileMetadata from "../dsa/FileMetadata.js";

export class SearchEngine {
    constructor() {
        this.trie = new Trie();
        this.invertedIndex = new InvertedIndex();
        this.metadata = new FileMetadata();
        this.indexed = false;
    }

    // Build the index from scanned file metadata
    buildIndex(files) {
        this.trie.clear();
        this.invertedIndex.clear();
        this.metadata = new FileMetadata();

        for (const file of files) {
            const fileId = file.path;

            this.metadata.addFile(file);
            this.trie.insert(file.name, fileId);
            this.invertedIndex.addDocument(fileId, file.name);
        }

        this.indexed = true;

        return {
            totalFiles: this.metadata.getSize(),
            indexedTerms: this.invertedIndex.size(),
            trieWords: this.trie.size()
        };
    }

    // Search filenames using the inverted index
    search(query, limit = 10, mode = "AND") {
        if (!this.indexed || !query?.trim()) {
            return {
                query: query || "",
                totalMatches: 0,
                searchTimeMs: 0,
                results: []
            };
        }

        const startTime = performance.now();

        const fileIds = this.invertedIndex.searchMultiWord(query, mode);

        const normalizedQuery = query.trim().toLowerCase();

        const queryTerms = normalizedQuery
            .split(/[^a-z0-9]+/)
            .filter(Boolean);

        const filenameTermsCache = new Map();

        const minHeap = new MinHeap();

        let totalMatches = 0;

        for (const fileId of fileIds) {
            const file = this.metadata.getFile(fileId);

            if (!file) continue;

            totalMatches++;

            const filename = file.name.toLowerCase();

            let score = 0;

            const filenameWithoutExtension = filename
                .replace(/\.[^.]+$/, "");

            let filenameTerms = filenameTermsCache.get(filenameWithoutExtension);

            if (!filenameTerms) {
                filenameTerms = this.invertedIndex.tokenize(filenameWithoutExtension);
                filenameTermsCache.set(filenameWithoutExtension, filenameTerms);
            }

            // Exact filename match
            if (filenameWithoutExtension === normalizedQuery) {
                score += 100;
            }

            // Exact phrase match
            else if (filename.includes(normalizedQuery)) {
                score += 70;
            }

            // Score individual query terms
            for (const term of queryTerms) {
                if (filenameTerms.includes(term)) {
                    score += 20;
                } else if (filename.includes(term)) {
                    score += 10;
                }
            }

            // Prefer filenames containing all query terms
            if (
                queryTerms.length > 0 &&
                queryTerms.every(term => filenameTerms.includes(term))
            ) {
                score += 30;
            }

            // Prefer shorter filenames when relevance is otherwise similar
            score += 1 / Math.max(filename.length, 1);

            const scoreValue = Number(score.toFixed(2));

            if (
                minHeap.getSize() < limit ||
                scoreValue > minHeap.peek().score
            ) {
                const candidate = {
                    ...file,
                    score: scoreValue
                };

                if (minHeap.getSize() < limit) {
                    minHeap.insert(candidate);
                } else {
                    minHeap.extractMin();
                    minHeap.insert(candidate);
                }
            }
        }

        // Extract retained results in descending score order
        const results = [];

        while (!minHeap.isEmpty()) {
            results.push(minHeap.extractMin());
        }

        results.reverse();

        return {
            query,
            totalMatches,
            searchTimeMs: Number(
                (performance.now() - startTime).toFixed(3)
            ),
            results
        };
    }

    // Linear search scanning every indexed file (for DSA benchmark comparison)
    linearSearch(query, limit = 10) {
        if (!this.indexed || !query?.trim()) {
            return {
                query: query || "",
                totalMatches: 0,
                searchTimeMs: 0,
                results: []
            };
        }

        const startTime = performance.now();
        const allFiles = this.metadata.getAllFiles();
        const normalizedQuery = query.trim().toLowerCase();

        const queryTerms = normalizedQuery
            .split(/[^a-z0-9]+/)
            .filter(Boolean);

        const candidates = [];

        for (const file of allFiles) {
            const filename = file.name.toLowerCase();
            const tokens = this.invertedIndex.tokenize(filename);
            const matches = queryTerms.length > 0
                ? queryTerms.every(term => tokens.includes(term))
                : filename.includes(normalizedQuery);

            if (!matches) continue;

            const filenameWithoutExtension = filename.replace(/\.[^.]+$/, "");
            const filenameTerms = filenameWithoutExtension
                .split(/[^a-z0-9]+/)
                .filter(Boolean);

            let score = 0;

            if (filenameWithoutExtension === normalizedQuery) {
                score += 100;
            } else if (filename.includes(normalizedQuery)) {
                score += 70;
            }

            for (const term of queryTerms) {
                if (filenameTerms.includes(term)) {
                    score += 20;
                } else if (filename.includes(term)) {
                    score += 10;
                }
            }

            if (
                queryTerms.length > 0 &&
                queryTerms.every(term => filenameTerms.includes(term))
            ) {
                score += 30;
            }

            score += 1 / Math.max(filename.length, 1);

            candidates.push({
                ...file,
                score: Number(score.toFixed(2))
            });
        }

        // Full array sort for linear approach (O(M log M))
        candidates.sort((a, b) => b.score - a.score);
        const results = candidates.slice(0, limit);

        return {
            query,
            totalMatches: candidates.length,
            searchTimeMs: Number((performance.now() - startTime).toFixed(3)),
            results
        };
    }

    // Filename autocomplete
    autocomplete(prefix, limit = 10) {
        return this.trie.searchPrefix(prefix, limit);
    }

    // Get metadata for a specific file
    getFile(filePath) {
        return this.metadata.getFile(filePath);
    }

    getStats() {
        return {
            totalFiles: this.metadata.getSize(),
            ...this.invertedIndex.getStats()
        };
    }
}

export default SearchEngine;
