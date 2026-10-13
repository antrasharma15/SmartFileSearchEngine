"use client";

import { useState } from "react";

export default function Home() {
    const [folderPath, setFolderPath] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const API = "http://localhost:5001";

    async function indexFolder() {
        try {
            setLoading(true);
            setMessage("Indexing folder...");

            const response = await fetch(`${API}/api/index`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ folderPath })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Indexing failed");
            }

            setMessage(
                `Indexed ${data.stats.totalFiles} files successfully!`
            );
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    }

    async function searchFiles() {
        try {
            setLoading(true);

            const response = await fetch(
                `${API}/api/search?q=${encodeURIComponent(query)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Search failed");
            }

            setResults(data.results || []);
            setMessage(`Found ${data.totalMatches} matching files.`);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{
            maxWidth: "800px",
            margin: "50px auto",
            padding: "20px",
            fontFamily: "Arial"
        }}>
            <h1>Smart File Search Engine</h1>

            <p>
                Search your files using Trie, Inverted Index, and MinHeap.
            </p>

            <hr />

            <h2>1. Index a Folder</h2>

            <input
                type="text"
                placeholder="Enter folder path"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                style={{ width: "70%", padding: "10px" }}
            />

            <button
                onClick={indexFolder}
                disabled={loading || !folderPath.trim()}
                style={{ padding: "10px", marginLeft: "8px" }}
            >
                Index Folder
            </button>

            <h2>2. Search Files</h2>

            <input
                type="text"
                placeholder="Search filenames..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: "70%", padding: "10px" }}
            />

            <button
                onClick={searchFiles}
                disabled={loading || !query.trim()}
                style={{ padding: "10px", marginLeft: "8px" }}
            >
                Search
            </button>

            <p>{message}</p>

            <h2>Results</h2>

            {results.map((file, index) => (
                <div
                    key={file.path || index}
                    style={{
                        border: "1px solid #ddd",
                        padding: "12px",
                        marginBottom: "10px",
                        borderRadius: "6px"
                    }}
                >
                    <strong>{file.name}</strong>
                    <p>Path: {file.path}</p>
                    <p>Size: {file.size} bytes</p>
                    <p>Relevance score: {file.score}</p>
                </div>
            ))}
        </main>
    );
}
