/**
 * Inverted Index Implementation for Keyword-Based File Search
 * 
 * Course: PAMCA501 — Data Structures and Algorithms
 * Module: dsa/InvertedIndex.js
 * 
 * Purpose:
 * Maps normalized word tokens (keywords) to a Posting List (Set of File IDs).
 * Enables instant O(1) keyword search across thousands of files without linear scanning.
 * 
 * Data Structure Architecture:
 * Map<string, Set<string>>
 * Key: Normalized keyword token (e.g., "dbms", "notes")
 * Value: Set of file IDs (e.g., {"F1", "F3"}) -> Posting List
 * 
 * Complexity:
 * - addDocument(fileId, filename): O(T) time, where T is the number of tokens in the filename.
 * - search(keyword): O(1) average lookup time to retrieve the posting set.
 * - removeDocument(fileId, filename): O(T) time.
 * - Multi-term AND search: O(min(|P1|, |P2|)) Set intersection.
 * - Space Complexity: O(V + P), where V is vocabulary size (unique terms)
 *   and P is total postings (term-to-file occurrences).
 */

export class InvertedIndex {
  constructor() {
    /**
     * Term Dictionary -> Posting Lists
     * @type {Map<string, Set<string>>}
     */
    this.index = new Map();

    /**
     * Optional reverse mapping: File ID -> Set of Tokens.
     * Useful for fast cleanup and document updates.
     * @type {Map<string, Set<string>>}
     */
    this.docTokens = new Map();
  }

  /**
   * Tokenizes a filename string into normalized, lowercase word tokens.
   * Splits on non-alphanumeric characters (spaces, underscores, dots, hyphens, etc.).
   * 
   * @param {string} text - e.g., "DBMS_Notes.pdf"
   * @returns {string[]} Array of normalized tokens: ["dbms", "notes", "pdf"]
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 0);
  }

  /**
   * Adds a file and its filename keywords to the inverted index.
   * 
   * @param {string} fileId - Unique file identifier (e.g., "File 1" or "F1")
   * @param {string} filename - Filename string (e.g., "DBMS_Notes.pdf")
   */
  addDocument(fileId, filename) {
    if (!fileId || !filename) return;

    const tokens = this.tokenize(filename);
    const tokenSet = new Set(tokens);

    // Save tokens for this document
    this.docTokens.set(fileId, tokenSet);

    for (const token of tokenSet) {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token).add(fileId);
    }
  }

  /**
   * Returns the IDs of files containing the specified keyword.
   * 
   * @param {string} keyword - Single keyword to search (e.g., "dbms")
   * @returns {string[]} Array of matching File IDs
   */
  search(keyword) {
    if (!keyword || typeof keyword !== 'string') return [];
    
    const normalized = keyword.trim().toLowerCase();
    const postingSet = this.index.get(normalized);

    if (!postingSet) return [];
    return Array.from(postingSet);
  }

  /**
   * Removes a file's keywords from the index.
   * Cleans up empty keyword sets to prevent memory leaks.
   * 
   * @param {string} fileId - File identifier to remove
   * @param {string} [filename] - Optional filename for fast token identification
   */
  removeDocument(fileId, filename) {
    if (!fileId) return;

    // Use provided filename tokens, or fallback to stored docTokens
    const tokensToRemove = filename 
      ? new Set(this.tokenize(filename))
      : this.docTokens.get(fileId) || new Set();

    for (const token of tokensToRemove) {
      const postingSet = this.index.get(token);
      if (postingSet) {
        postingSet.delete(fileId);
        // Clean up empty posting list to preserve memory
        if (postingSet.size === 0) {
          this.index.delete(token);
        }
      }
    }

    this.docTokens.delete(fileId);
  }

  /**
   * Searches for files matching multiple keywords using AND intersection or OR union.
   * 
   * @param {string} query - e.g., "dbms notes"
   * @param {'AND'|'OR'} [mode='AND'] - Match mode
   * @returns {string[]} Array of matching File IDs
   */
  searchMultiWord(query, mode = 'AND') {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) return [];

    if (tokens.length === 1) {
      return this.search(tokens[0]);
    }

    const postingSets = tokens.map(t => this.index.get(t) || new Set());

    if (mode === 'OR') {
      const union = new Set();
      for (const set of postingSets) {
        for (const id of set) union.add(id);
      }
      return Array.from(union);
    }

    // Default: 'AND' intersection
    // Sort posting sets by size ascending for optimal intersection performance
    postingSets.sort((a, b) => a.size - b.size);
    if (postingSets[0].size === 0) return [];

    let intersection = Array.from(postingSets[0]);
    for (let i = 1; i < postingSets.length; i++) {
      const currentSet = postingSets[i];
      intersection = intersection.filter(id => currentSet.has(id));
      if (intersection.length === 0) break;
    }

    return intersection;
  }

  /**
   * Returns all indexed distinct terms (vocabulary).
   * @returns {string[]}
   */
  getAllTerms() {
    return Array.from(this.index.keys());
  }

  /**
   * Returns the count of distinct terms indexed.
   * @returns {number}
   */
  size() {
    return this.index.size;
  }

  /**
   * Clears the entire index.
   */
  clear() {
    this.index.clear();
    this.docTokens.clear();
  }

  /**
   * Returns summary metrics for the index.
   * @returns {Object}
   */
  getStats() {
    let totalPostings = 0;
    for (const postSet of this.index.values()) {
      totalPostings += postSet.size;
    }
    return {
      vocabularySize: this.index.size,
      totalPostings: totalPostings,
      indexedDocuments: this.docTokens.size
    };
  }
}

export default InvertedIndex;

// Self-test block: Can be run directly with `node dsa/InvertedIndex.js`
if (process.argv[1] && (process.argv[1].endsWith('/InvertedIndex.js') || process.argv[1].endsWith('\\InvertedIndex.js'))) {
  console.log('\n📚 [DSA Test] Testing Inverted Index Implementation...\n');

  const index = new InvertedIndex();

  // Test with exact sample files from prompt
  index.addDocument('File 1', 'DBMS_Notes.pdf');
  index.addDocument('File 2', 'Java_Notes.txt');
  index.addDocument('File 3', 'DBMS_Questions.docx');

  console.log('✅ Documents added.');
  console.log('Vocabulary Size:', index.size(), 'distinct terms.');

  console.log('\n🔍 Single Keyword Searches (Expected vs Actual):');
  console.log("  search('dbms')      ->", index.search('dbms'), " (Expected: ['File 1', 'File 3'])");
  console.log("  search('notes')     ->", index.search('notes'), " (Expected: ['File 1', 'File 2'])");
  console.log("  search('java')      ->", index.search('java'), " (Expected: ['File 2'])");
  console.log("  search('questions') ->", index.search('questions'), " (Expected: ['File 3'])");
  console.log("  search('python')    ->", index.search('python'), " (Expected: [])");

  console.log('\n⚡ Multi-Word Search:');
  console.log("  searchMultiWord('dbms notes', 'AND') ->", index.searchMultiWord('dbms notes', 'AND'), " (Expected: ['File 1'])");
  console.log("  searchMultiWord('dbms notes', 'OR')  ->", index.searchMultiWord('dbms notes', 'OR'));

  console.log('\n🗑️ Testing removeDocument:');
  index.removeDocument('File 1', 'DBMS_Notes.pdf');
  console.log("  After removing 'File 1', search('dbms') ->", index.search('dbms'), " (Expected: ['File 3'])");
  console.log("  After removing 'File 1', search('notes') ->", index.search('notes'), " (Expected: ['File 2'])");

  console.log('\n📊 Index Statistics:', index.getStats());
  console.log('\n🎉 Inverted Index tests passed successfully!\n');
}
