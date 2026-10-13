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
            return [];
        }

        const startTime = performance.now();

        const fileIds = this.invertedIndex.searchMultiWord(query, mode);

        const candidates = [];

        for (const fileId of fileIds) {
            const file = this.metadata.getFile(fileId);

            if (!file) continue;

            const filename = file.name.toLowerCase();
            const normalizedQuery = query.trim().toLowerCase();

            let score = 0;

            if (filename === normalizedQuery) {
                score += 10;
            } else if (filename.includes(normalizedQuery)) {
                score += 6;
            } else {
                score += 3;
            }

            candidates.push({
                ...file,
                score
            });
        }

        const results = MinHeap.selectTopK(candidates, limit);

        return {
            query,
            totalMatches: candidates.length,
            searchTimeMs: Number(
                (performance.now() - startTime).toFixed(3)
            ),
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
