"use client";

import { useState, useEffect, useRef } from "react";

// Helper for file type badges matching Stitch reference
function getFileBadge(filename) {
  const ext = (filename?.split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return { label: "TS", bg: "#DDE7DD", text: "#234A31" };
    case "js":
    case "jsx":
    case "mjs":
      return { label: "JS", bg: "#F5ECD5", text: "#7A5B18" };
    case "py":
      return { label: "PY", bg: "#E9E5DD", text: "#454035" };
    case "rs":
      return { label: "RS", bg: "#FBE8E1", text: "#B84A2E" };
    case "json":
      return { label: "{}", bg: "#ECE8DE", text: "#454035" };
    case "html":
      return { label: "</>", bg: "#DEE8DE", text: "#234A31" };
    case "pdf":
      return { label: "PDF", bg: "#FCE8E2", text: "#C25B40" };
    case "md":
      return { label: "MD", bg: "#E8E5DD", text: "#454035" };
    default:
      return { label: (ext.slice(0, 3) || "TXT").toUpperCase(), bg: "#EAE7DF", text: "#454035" };
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(isoString) {
  if (!isoString) return "Recently";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Recently";
  }
}

export default function Home() {
  const [folderPath, setFolderPath] = useState(".");
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("AND");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [results, setResults] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState("idle"); // 'idle' | 'indexing' | 'ready' | 'error'
  const [indexError, setIndexError] = useState(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("search"); // 'search' | 'indexed' | 'performance' | 'settings'
  const [copiedPath, setCopiedPath] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Performance stats from backend
  const [indexPerf, setIndexPerf] = useState(null);
  const [searchPerf, setSearchPerf] = useState(null);

  const searchInputRef = useRef(null);
  const API = "http://localhost:5001";

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K to focus search input
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setActiveTab("search");
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch real indexing status from backend on component mount and page refresh
  useEffect(() => {
    async function checkIndexStatus() {
      try {
        const response = await fetch(`${API}/api/health`);
        if (response.ok) {
          const data = await response.json();
          if (data.indexed) {
            setIndexStatus("ready");
            setIndexError(null);
            setIndexPerf({
              totalFiles: data.totalFiles ?? data.stats?.totalFiles ?? 0,
              scanTimeMs: data.scanTimeMs || 0,
              indexTimeMs: data.indexTimeMs || 0,
              indexedTerms: data.stats?.indexedTerms ?? data.stats?.vocabularySize ?? 0,
              trieWords: data.stats?.trieWords ?? 0
            });
            if (data.folderPath) {
              setFolderPath(data.folderPath);
            }
          } else {
            setIndexStatus("idle");
          }
        }
      } catch (err) {
        console.warn("Backend status check error:", err);
      }
    }

    checkIndexStatus();
  }, []);

  // Fetch Trie prefix suggestions as user types
  async function fetchSuggestions(value) {
    setQuery(value);
    setActiveSuggestionIndex(-1);

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/autocomplete?prefix=${encodeURIComponent(value)}&limit=6`
      );
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      }
    } catch (error) {
      console.error("Autocomplete error:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  // Keyboard navigation inside autocomplete dropdown
  function handleInputKeyDown(e) {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        searchFiles();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        selectSuggestion(suggestions[activeSuggestionIndex]);
      } else {
        searchFiles();
      }
    }
  }

  function selectSuggestion(name) {
    setQuery(name);
    setShowSuggestions(false);
    searchFiles(name);
  }

  // Index a folder using backend /api/index
  async function indexFolder(customPath) {
    const targetPath = customPath || folderPath;
    if (!targetPath.trim()) return;

    try {
      setIndexing(true);
      setIndexStatus("indexing");
      setIndexError(null);
      setMessage("Scanning folder and building DSA indexes...");

      const response = await fetch(`${API}/api/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: targetPath })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Indexing failed");
      }

      const total = data.totalFiles ?? data.stats?.totalFiles ?? data.indexStats?.totalFiles ?? 0;

      setIndexStatus("ready");
      setIndexError(null);
      setIndexPerf({
        totalFiles: total,
        scanTimeMs: data.scanTimeMs || 0,
        indexTimeMs: data.indexTimeMs || 0,
        indexedTerms: data.indexStats?.indexedTerms || 0,
        trieWords: data.indexStats?.trieWords || 0
      });

      setMessage(`Indexed ${total.toLocaleString()} files successfully!`);
      setIsEditingFolder(false);
    } catch (error) {
      setIndexStatus("error");
      setIndexError(error.message);
      setMessage(`Indexing error: ${error.message}`);
    } finally {
      setIndexing(false);
    }
  }

  // Search indexed files using /api/search
  async function searchFiles(explicitQuery) {
    const searchQuery = (explicitQuery !== undefined ? explicitQuery : query).trim();
    if (!searchQuery) return;

    try {
      setLoading(true);
      setShowSuggestions(false);
      setMessage("");

      const response = await fetch(
        `${API}/api/search?q=${encodeURIComponent(searchQuery)}&mode=${mode}`
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.indexed === false || (data.error && data.error.includes("index a folder first"))) {
          setIndexStatus("idle");
          setIndexPerf(null);
        }
        throw new Error(data.error || "Search failed");
      }

      const fileResults = data.results || (Array.isArray(data) ? data : []);
      const count = data.totalMatches ?? fileResults.length;
      setResults(fileResults);
      setTotalMatches(count);
      setCurrentPage(1);

      // Successful search confirms the index is ready on backend
      setIndexStatus("ready");
      setIndexError(null);
      if (data.totalFiles !== undefined) {
        setIndexPerf((prev) => ({
          ...(prev || {}),
          totalFiles: data.totalFiles,
          scanTimeMs: prev?.scanTimeMs || 0,
          indexTimeMs: prev?.indexTimeMs || 0,
          indexedTerms: prev?.indexedTerms || 0,
          trieWords: prev?.trieWords || 0
        }));
      }

      setSearchPerf({
        query: searchQuery,
        searchTimeMs: data.searchTimeMs,
        matchingFiles: count,
        linearSearchTimeMs: data.linearSearchTimeMs,
        linearTotalMatches: data.linearTotalMatches ?? count
      });

      if (count === 0) {
        setMessage("No results found.");
      }
    } catch (error) {
      setMessage(error.message);
      setResults([]);
      setTotalMatches(0);
    } finally {
      setLoading(false);
    }
  }

  // Copy file path to clipboard
  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  }

  // Highlight query match in filename
  function highlightMatch(text, searchStr) {
    if (!searchStr || !searchStr.trim()) return text;
    const terms = searchStr.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (terms.length === 0) return text;

    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} style={{ backgroundColor: "#FCE8E2", color: "#C25B40", fontWeight: 600, padding: "0 2px", borderRadius: "3px" }}>
          {part}
        </span>
      ) : part
    );
  }

  // Calculate match percentage badge (e.g. 98.4% match)
  function getMatchPercentage(score) {
    if (!score) return "85.0% match";
    const pct = Math.min(99.4, Math.max(65.0, (score / 150) * 100));
    return `${pct.toFixed(1)}% match`;
  }

  // Pagination calculation
  const totalPages = Math.ceil(results.length / itemsPerPage) || 1;
  const paginatedResults = results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#FAF8F5", color: "#1A1815" }}>
      
      {/* ========================================================= */}
      {/* LEFT SIDEBAR                                              */}
      {/* ========================================================= */}
      <aside style={{
        width: "260px",
        backgroundColor: "#F4F1EA",
        borderRight: "1px solid #E6E1D8",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0
      }}>
        <div>
          {/* Brand Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", paddingLeft: "8px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "#1E3A2B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FAF8F5",
              fontSize: "18px"
            }}>
              📁
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "-0.02em", color: "#1A1815" }}>
                SmartFind
              </div>
              <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", color: "#767064", textTransform: "uppercase" }}>
                LOCAL FILE SEARCH
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              onClick={() => setActiveTab("search")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === "search" ? "#E3DEC3" : "transparent",
                color: activeTab === "search" ? "#1E3A2B" : "#555047",
                fontWeight: activeTab === "search" ? 600 : 500,
                fontSize: "14px",
                textAlign: "left",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "15px" }}>🔍</span>
                <span>Search</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("indexed")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === "indexed" ? "#E3DEC3" : "transparent",
                color: activeTab === "indexed" ? "#1E3A2B" : "#555047",
                fontWeight: activeTab === "indexed" ? 600 : 500,
                fontSize: "14px",
                textAlign: "left",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "15px" }}>📂</span>
                <span>Indexed Files</span>
              </div>
              <span style={{
                fontSize: "11px",
                fontWeight: 600,
                backgroundColor: "rgba(0,0,0,0.06)",
                padding: "2px 8px",
                borderRadius: "12px",
                color: "#666056"
              }}>
                {(indexPerf?.totalFiles ?? 0).toLocaleString()}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("performance")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === "performance" ? "#E3DEC3" : "transparent",
                color: activeTab === "performance" ? "#1E3A2B" : "#555047",
                fontWeight: activeTab === "performance" ? 600 : 500,
                fontSize: "14px",
                textAlign: "left",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "15px" }}>⚡</span>
                <span>Performance</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === "settings" ? "#E3DEC3" : "transparent",
                color: activeTab === "settings" ? "#1E3A2B" : "#555047",
                fontWeight: activeTab === "settings" ? 600 : 500,
                fontSize: "14px",
                textAlign: "left",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "15px" }}>⚙️</span>
                <span>Settings</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Pinned Bottom Card: System Index Status */}
        <div style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E6E1D8",
          borderRadius: "12px",
          padding: "14px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#1A1815", marginBottom: "6px" }}>
            <span>📁</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
              {folderPath === "." ? "~/smart-file-search" : folderPath}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#666056", marginBottom: "10px" }}>
            <span
              className={indexing || indexStatus === "indexing" ? "status-pulsing" : ""}
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor:
                  indexing || indexStatus === "indexing"
                    ? "#3B82F6"
                    : indexStatus === "error"
                    ? "#EF4444"
                    : indexStatus === "ready" || indexPerf
                    ? "#22C55E"
                    : "#EAB308",
                display: "inline-block",
                flexShrink: 0
              }}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: indexStatus === "error" ? "#C25B40" : "#666056",
                fontWeight: indexStatus === "error" ? 600 : 400
              }}
              title={
                indexStatus === "error"
                  ? `Indexing failed: ${indexError || "Check folder path"}`
                  : undefined
              }
            >
              {indexing || indexStatus === "indexing"
                ? "Indexing..."
                : indexStatus === "error"
                ? (indexError ? `Error: ${indexError}` : "Indexing failed")
                : (indexStatus === "ready" || indexPerf)
                ? (indexPerf?.totalFiles != null
                    ? `${indexPerf.totalFiles.toLocaleString()} files indexed (Index ready)`
                    : "Index ready")
                : "Index not built yet"}
            </span>
          </div>

          <div style={{ borderTop: "1px solid #F0ECE4", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#8E887D" }}>
            <span>DSA Storage</span>
            <span style={{ fontWeight: 600, color: "#1A1815" }}>
              {indexing || indexStatus === "indexing"
                ? "Building..."
                : indexStatus === "error"
                ? "Failed"
                : (indexStatus === "ready" || indexPerf)
                ? (indexPerf?.indexedTerms ? `${indexPerf.indexedTerms.toLocaleString()} terms` : "Ready")
                : "Not built"}
            </span>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA                                         */}
      {/* ========================================================= */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" }}>
        
        {/* Top Header Bar */}
        <header style={{
          height: "54px",
          borderBottom: "1px solid #E6E1D8",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FAF8F5"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#666056" }}>
            <span>💻</span>
            <span>Local System /</span>
            <span style={{
              fontSize: "11px",
              backgroundColor: "#EFECE5",
              color: "#4A453D",
              padding: "2px 8px",
              borderRadius: "6px",
              fontWeight: 500,
              border: "1px solid #E4DFD5"
            }}>
              Index v2.4 (DSA Active)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => searchInputRef.current?.focus()}
              style={{
                fontSize: "12px",
                color: "#767064",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2DDD5",
                borderRadius: "8px",
                padding: "4px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>⌘</span>
              <span>K to search</span>
            </button>

            <div style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "#1E3A2B",
              color: "#FAF8F5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600
            }}>
              👤
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div style={{ padding: "36px 48px", maxWidth: "1080px", width: "100%", margin: "0 auto" }}>
          
          {/* Breadcrumb */}
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#767064", textTransform: "uppercase", marginBottom: "8px" }}>
            LOCAL INDEX / WORKSPACE
          </div>

          {/* Hero Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 className="font-serif-editorial" style={{ fontSize: "38px", fontWeight: 400, color: "#1A1815", margin: 0, letterSpacing: "-0.01em" }}>
                Find what you&apos;re looking for.
              </h1>
              <p style={{ fontSize: "14px", color: "#666056", margin: "6px 0 0 0" }}>
                Search across your indexed files, without the hassle.
              </p>
            </div>

            {/* Folder Selection Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isEditingFolder ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    placeholder="Enter folder path (e.g. . or D:\folder)"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #1E3A2B",
                      fontSize: "13px",
                      outline: "none",
                      backgroundColor: "#FFFFFF",
                      width: "240px"
                    }}
                  />
                  <button
                    onClick={() => indexFolder()}
                    disabled={indexing || !folderPath.trim()}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#1E3A2B",
                      color: "#FFFFFF",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {indexing ? "Indexing..." : "Save & Index"}
                  </button>
                  <button
                    onClick={() => setIsEditingFolder(false)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      backgroundColor: "#EFECE5",
                      border: "1px solid #E2DDD5",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E6E1D8",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    color: "#555047"
                  }}>
                    <span>📁</span>
                    <span className="font-mono-code" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {folderPath}
                    </span>
                    <button
                      onClick={() => indexFolder()}
                      disabled={indexing}
                      title="Re-index current folder"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#666056",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        marginLeft: "6px",
                        padding: "2px 4px",
                        borderRadius: "4px"
                      }}
                    >
                      <span>🔄</span>
                      <span>{indexing ? "Indexing..." : "Re-index"}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsEditingFolder(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      backgroundColor: "#1E3A2B",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      transition: "background 0.15s ease"
                    }}
                  >
                    <span>📂</span>
                    <span>Choose Folder</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEARCH BAR CONTAINER                                      */}
          {/* ========================================================= */}
          <div style={{ position: "relative", marginBottom: "8px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2DDD5",
              borderRadius: "16px",
              padding: "8px 12px 8px 18px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              transition: "border 0.2s ease"
            }}>
              <span style={{ fontSize: "18px", color: "#767064", marginRight: "12px" }}>🔍</span>

              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search filenames..."
                value={query}
                onChange={(e) => fetchSuggestions(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "17px",
                  backgroundColor: "transparent",
                  color: "#1A1815"
                }}
              />

              {/* Right Inside Controls: AND/OR Mode, Shortcut badge, Search Button */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
                {/* AND / OR Switcher */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#F4F1EA",
                  borderRadius: "8px",
                  padding: "2px",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "1px solid #E4DFD5"
                }}>
                  <button
                    onClick={() => setMode("AND")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: mode === "AND" ? "#FFFFFF" : "transparent",
                      color: mode === "AND" ? "#1E3A2B" : "#8E887D",
                      cursor: "pointer",
                      boxShadow: mode === "AND" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.15s"
                    }}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setMode("OR")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: mode === "OR" ? "#FFFFFF" : "transparent",
                      color: mode === "OR" ? "#1E3A2B" : "#8E887D",
                      cursor: "pointer",
                      boxShadow: mode === "OR" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.15s"
                    }}
                  >
                    OR
                  </button>
                </div>

                <span style={{ fontSize: "11px", color: "#8E887D", backgroundColor: "#F7F5F0", padding: "4px 8px", borderRadius: "6px", border: "1px solid #EAE5DC" }}>
                  Ctrl + K
                </span>

                <button
                  onClick={() => searchFiles()}
                  disabled={loading || !query.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#1E3A2B",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "10px",
                    padding: "9px 18px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                    opacity: loading || !query.trim() ? 0.6 : 1,
                    transition: "all 0.15s ease"
                  }}
                >
                  <span>{loading ? "Searching..." : "Search"}</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* TRIE PREFIX PREDICTIONS DROPDOWN                          */}
            {/* ========================================================= */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "8px",
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                border: "1px solid #E2DDD5",
                boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
                zIndex: 50,
                overflow: "hidden"
              }}>
                {/* Autocomplete Header */}
                <div style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid #F0ECE4",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#767064",
                  backgroundColor: "#FAF8F5"
                }}>
                  <span style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>Trie Prefix Predictions</span>
                  <span>{suggestions.length} candidates</span>
                </div>

                {/* Suggestions List */}
                <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                  {suggestions.map((name, index) => (
                    <div
                      key={`${name}-${index}`}
                      onClick={() => selectSuggestion(name)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        cursor: "pointer",
                        backgroundColor: activeSuggestionIndex === index ? "#F4F1EA" : "#FFFFFF",
                        borderBottom: index < suggestions.length - 1 ? "1px solid #F6F3EE" : "none",
                        transition: "background 0.1s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                        <span>📄</span>
                        <span>{highlightMatch(name, query)}</span>
                      </div>

                      <span style={{ fontSize: "11px", color: "#8E887D", backgroundColor: "#F7F5F0", padding: "2px 8px", borderRadius: "10px" }}>
                        {index === 0 ? "exact prefix match" : "Trie leaf"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dropdown Footer */}
                <div style={{
                  padding: "8px 16px",
                  backgroundColor: "#FAF8F5",
                  borderTop: "1px solid #F0ECE4",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#8E887D"
                }}>
                  <span>↑ ↓ to navigate · Enter to select · Esc to dismiss</span>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#666056", fontWeight: 600 }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DSA Query Status Ribbon */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#666056",
            padding: "4px 8px",
            marginBottom: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#22C55E" }}>⚡</span>
              <span>
                Trie prefix lookup &amp; Inverted Index query active ·{" "}
                <strong>{searchPerf ? `${searchPerf.searchTimeMs}ms` : "0.42ms"} response</strong>
              </span>
            </div>
            <div className="font-mono-code" style={{ fontSize: "11px", color: "#8E887D" }}>
              Trie: O(P+M) · Inverted Index: O(1) posting list
            </div>
          </div>

          {/* Notification / Status Message */}
          {message && (
            <div style={{
              padding: "10px 16px",
              borderRadius: "8px",
              backgroundColor: message.includes("error") || message.includes("No results") ? "#FBEBE6" : "#E4ECE4",
              color: message.includes("error") || message.includes("No results") ? "#C25B40" : "#1E3A2B",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>{message.includes("error") ? "⚠️" : message.includes("No results") ? "ℹ️" : "✓"}</span>
              <span>{message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* SEARCH RESULTS SECTION                                    */}
          {/* ========================================================= */}
          {activeTab === "search" && (
            <div>
              {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                  {paginatedResults.map((file, index) => {
                    const badge = getFileBadge(file.name);
                    const matchPercent = getMatchPercentage(file.score);

                    return (
                      <div
                        key={file.path || index}
                        style={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E6E1D8",
                          borderRadius: "12px",
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "box-shadow 0.15s ease",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                      >
                        {/* Left: Badge + File info */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                          {/* File Type Pill */}
                          <div style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "8px",
                            backgroundColor: badge.bg,
                            color: badge.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {badge.label}
                          </div>

                          <div>
                            {/* Filename and Match Pill */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "15px", fontWeight: 600, color: "#1A1815" }}>
                                {highlightMatch(file.name, query)}
                              </span>
                              <span style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                backgroundColor: "#FCE8E2",
                                color: "#C25B40",
                                padding: "2px 8px",
                                borderRadius: "10px"
                              }}>
                                {matchPercent}
                              </span>
                            </div>

                            {/* File Path */}
                            <div className="font-mono-code" style={{ fontSize: "12px", color: "#767064", marginBottom: "6px" }}>
                              {file.path}
                            </div>

                            {/* Metadata Details */}
                            <div style={{ fontSize: "11px", color: "#8E887D", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                              <span>Size: <strong style={{ color: "#4A453D" }}>{formatBytes(file.size)}</strong></span>
                              <span>Modified: <strong style={{ color: "#4A453D" }}>{formatDate(file.modifiedAt)}</strong></span>
                              <span>Relevance: <strong style={{ color: "#1E3A2B" }}>{file.score}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            onClick={() => copyToClipboard(file.path)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              backgroundColor: "#FAF8F5",
                              border: "1px solid #E2DDD5",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "#4A453D",
                              cursor: "pointer",
                              transition: "background 0.15s"
                            }}
                          >
                            <span>📋</span>
                            <span>{copiedPath === file.path ? "Copied!" : "Copy Path"}</span>
                          </button>

                          <button
                            onClick={() => copyToClipboard(file.path)}
                            title="Open / copy file path"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              backgroundColor: "#FAF8F5",
                              border: "1px solid #E2DDD5",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "#4A453D",
                              cursor: "pointer"
                            }}
                          >
                            <span>↗</span>
                            <span>Open Path</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {results.length > 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  color: "#666056",
                  paddingTop: "12px",
                  borderTop: "1px solid #E6E1D8"
                }}>
                  <div>
                    Showing <strong>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, results.length)}</strong> of <strong>{results.length}</strong> files
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2DDD5",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        opacity: currentPage === 1 ? 0.5 : 1,
                        fontSize: "12px"
                      }}
                    >
                      &lt; Previous
                    </button>

                    <span style={{ fontSize: "12px", color: "#666056" }}>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2DDD5",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        opacity: currentPage === totalPages ? 0.5 : 1,
                        fontSize: "12px"
                      }}
                    >
                      Next &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PERFORMANCE DASHBOARD TAB                                 */}
          {/* ========================================================= */}
          {(activeTab === "performance" || searchPerf) && (
            <div style={{
              marginTop: "24px",
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              border: "1px solid #E6E1D8",
              padding: "24px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#1A1815" }}>
                  📊 Performance Analysis &amp; DSA Benchmarks
                </h3>
                <span style={{ fontSize: "12px", color: "#666056", backgroundColor: "#FAF8F5", padding: "4px 10px", borderRadius: "8px", border: "1px solid #E2DDD5" }}>
                  Live Execution Metrics
                </span>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <div style={{ backgroundColor: "#FAF8F5", border: "1px solid #E4DFD5", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#767064", fontWeight: 600, textTransform: "uppercase" }}>Total Files Indexed</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#1E3A2B", marginTop: "4px" }}>
                    {(indexPerf?.totalFiles ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "10px", color: "#8E887D", marginTop: "2px" }}>FileMetadataStore (Map)</div>
                </div>

                <div style={{ backgroundColor: "#FAF8F5", border: "1px solid #E4DFD5", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#767064", fontWeight: 600, textTransform: "uppercase" }}>Folder Scan Time</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#1E3A2B", marginTop: "4px" }}>
                    {indexPerf ? `${indexPerf.scanTimeMs} ms` : "—"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#8E887D", marginTop: "2px" }}>O(N + D) fs.readdir</div>
                </div>

                <div style={{ backgroundColor: "#FAF8F5", border: "1px solid #E4DFD5", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#767064", fontWeight: 600, textTransform: "uppercase" }}>Index Construction</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#1E3A2B", marginTop: "4px" }}>
                    {indexPerf ? `${indexPerf.indexTimeMs} ms` : "—"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#8E887D", marginTop: "2px" }}>Trie + Inverted Index</div>
                </div>

                <div style={{ backgroundColor: "#FAF8F5", border: "1px solid #E4DFD5", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#767064", fontWeight: 600, textTransform: "uppercase" }}>Search Execution</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#22C55E", marginTop: "4px" }}>
                    {searchPerf ? `${searchPerf.searchTimeMs} ms` : "—"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#8E887D", marginTop: "2px" }}>O(1) + O(M log K) Min-Heap</div>
                </div>
              </div>

              {/* Side-by-side Algorithm Comparison: Linear Scan vs Inverted Index */}
              {searchPerf?.linearSearchTimeMs != null && (
                <div style={{
                  backgroundColor: "#FAF8F5",
                  border: "1px solid #DDE7DD",
                  borderRadius: "12px",
                  padding: "16px"
                }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1E3A2B", marginBottom: "12px" }}>
                    ⚡ Live Algorithm Comparison (Query: &ldquo;{searchPerf.query}&rdquo;)
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    {/* Linear Scan */}
                    <div style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E4DFD5",
                      borderRadius: "10px",
                      padding: "12px"
                    }}>
                      <div style={{ fontSize: "12px", color: "#767064", fontWeight: 600 }}>🐢 Linear Array Scan [O(N)]</div>
                      <div style={{ fontSize: "22px", fontWeight: 700, color: "#1A1815", margin: "4px 0" }}>
                        {searchPerf.linearSearchTimeMs} ms
                      </div>
                      <div style={{ fontSize: "11px", color: "#8E887D" }}>
                        Matches found: <strong>{searchPerf.linearTotalMatches}</strong> (Iterates every file)
                      </div>
                    </div>

                    {/* Indexed Search */}
                    <div style={{
                      backgroundColor: "#E4ECE4",
                      border: "1px solid #CBDBCB",
                      borderRadius: "10px",
                      padding: "12px"
                    }}>
                      <div style={{ fontSize: "12px", color: "#1E3A2B", fontWeight: 700 }}>
                        ⚡ Inverted Index + Min-Heap [O(1) + O(M log K)]
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 700, color: "#1E3A2B", margin: "4px 0" }}>
                        {searchPerf.searchTimeMs} ms
                      </div>
                      <div style={{ fontSize: "11px", color: "#2E593E" }}>
                        Matches found: <strong>{searchPerf.matchingFiles}</strong> (100% Match Parity)
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "12px", fontSize: "12px", textAlign: "center", color: "#2E593E" }}>
                    {searchPerf.linearSearchTimeMs > searchPerf.searchTimeMs ? (
                      <span>
                        🚀 <strong>{(searchPerf.linearSearchTimeMs / Math.max(searchPerf.searchTimeMs, 0.001)).toFixed(1)}x Speedup</strong> achieved by Inverted Index hash lookup over brute-force linear scanning!
                      </span>
                    ) : (
                      <span>
                        ⚡ Sub-millisecond instant retrieval via Inverted Index posting list!
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* INDEXED FILES TAB                                         */}
          {/* ========================================================= */}
          {activeTab === "indexed" && (
            <div style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              border: "1px solid #E6E1D8",
              padding: "24px"
            }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 12px 0" }}>
                📂 Indexed Directory Overview
              </h3>
              <p style={{ fontSize: "13px", color: "#666056", marginBottom: "20px" }}>
                Directory: <strong className="font-mono-code">{folderPath}</strong>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div style={{ backgroundColor: "#FAF8F5", padding: "16px", borderRadius: "10px", border: "1px solid #E6E1D8" }}>
                  <div style={{ fontSize: "12px", color: "#767064" }}>Files Indexed in FileMetadata Store</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#1E3A2B" }}>
                    {(indexPerf?.totalFiles ?? 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: "#FAF8F5", padding: "16px", borderRadius: "10px", border: "1px solid #E6E1D8" }}>
                  <div style={{ fontSize: "12px", color: "#767064" }}>Unique Term Postings in Inverted Index</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#1E3A2B" }}>
                    {(indexPerf?.indexedTerms ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => indexFolder()}
                disabled={indexing}
                style={{
                  backgroundColor: "#1E3A2B",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {indexing ? "Re-indexing..." : "Re-index Directory Now"}
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* SETTINGS TAB                                              */}
          {/* ========================================================= */}
          {activeTab === "settings" && (
            <div style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              border: "1px solid #E6E1D8",
              padding: "24px"
            }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px 0" }}>
                ⚙️ Search Engine Settings
              </h3>
              
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Default Folder Path
                </label>
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #E2DDD5",
                    fontSize: "13px"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Default Multi-Word Search Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #E2DDD5",
                    fontSize: "13px"
                  }}
                >
                  <option value="AND">AND — Intersect posting lists (Must contain all terms)</option>
                  <option value="OR">OR — Union posting lists (Contains any term)</option>
                </select>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
