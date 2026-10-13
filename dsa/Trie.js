/**
 * Trie (Prefix Tree) Implementation for Filename Autocomplete
 * 
 * Course: PAMCA501 — Data Structures and Algorithms
 * Module: dsa/Trie.js
 * 
 * Purpose:
 * Provides lightning-fast prefix search and autocomplete suggestions for filenames
 * as the user types in the search bar.
 * 
 * Why Trie instead of Linear Array search?
 * - Linear Array Search: O(N * L) where N is total files, L is string length.
 * - Trie Prefix Search: O(P + M) where P is prefix length, M is number of matching results.
 * As N grows to tens of thousands of files, Trie provides constant-feel response time.
 * 
 * Complexity:
 * - Insert: O(L) time, where L is filename length.
 * - Search (Exact): O(L) time.
 * - SearchPrefix: O(P + M) time, where P is prefix length and M is matches found.
 * - Space Complexity: O(ALPHABET_SIZE * L * N) in worst case, heavily compressed
 *   in practice due to common prefix sharing (e.g., 'data_' shared among datasets).
 */

export class TrieNode {
  constructor() {
    /**
     * Map of child character to child TrieNode.
     * We use a Map rather than a fixed 26-element array because filenames
     * can contain dots (.), underscores (_), hyphens (-), numbers (0-9),
     * and spaces.
     * @type {Map<string, TrieNode>}
     */
    this.children = new Map();

    /**
     * Marks whether a complete filename ends at this node.
     * @type {boolean}
     */
    this.isEndOfWord = false;

    /**
     * Stores original case-preserved filename(s) ending at this node.
     * Using a Set handles duplicates or multiple files with identical names in different paths.
     * @type {Set<string>}
     */
    this.originalWords = new Set();

    /**
     * Optional references to File IDs (e.g. 'F1', 'F2') registered in FileMetadataStore.
     * @type {Set<string>}
     */
    this.fileIds = new Set();
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
    this.totalWords = 0;
  }

  /**
   * Inserts a filename into the Trie.
   * Performs case-insensitive indexing while preserving original casing.
   * 
   * @param {string} filename - The filename to insert (e.g. "database.pdf")
   * @param {string} [fileId] - Optional unique file identifier (e.g. "F1")
   */
  insert(filename, fileId = null) {
    if (!filename || typeof filename !== 'string') {
      return;
    }

    const trimmed = filename.trim();
    if (!trimmed) return;

    const normalized = trimmed.toLowerCase();
    let current = this.root;

    for (const char of normalized) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char);
    }

    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      this.totalWords++;
    }

    current.originalWords.add(trimmed);
    if (fileId) {
      current.fileIds.add(fileId);
    }
  }

  /**
   * Checks whether an exact filename exists in the Trie.
   * 
   * @param {string} filename - The exact filename to check
   * @returns {boolean} True if the exact filename is present, false otherwise
   */
  search(filename) {
    if (!filename || typeof filename !== 'string') {
      return false;
    }

    const normalized = filename.trim().toLowerCase();
    if (!normalized) return false;

    let current = this.root;
    for (const char of normalized) {
      if (!current.children.has(char)) {
        return false;
      }
      current = current.children.get(char);
    }

    return current.isEndOfWord;
  }

  /**
   * Searches for all filenames that begin with the given prefix.
   * 
   * @param {string} prefix - The prefix typed by the user (e.g. "data")
   * @param {number} [limit=10] - Maximum number of suggestions to return
   * @returns {Array<string>} Array of matching filenames
   */
  searchPrefix(prefix, limit = 10) {
    if (!prefix || typeof prefix !== 'string') {
      return [];
    }

    const normalized = prefix.trim().toLowerCase();
    if (!normalized) return [];

    let current = this.root;

    // Step 1: Traverse to the node representing the prefix
    for (const char of normalized) {
      if (!current.children.has(char)) {
        return []; // Prefix does not exist in the Trie
      }
      current = current.children.get(char);
    }

    // Step 2: Perform Depth-First Search (DFS) from the prefix node
    // to collect all filenames in the subtree.
    const results = [];

    const dfs = (node) => {
      if (results.length >= limit) return;

      if (node.isEndOfWord) {
        for (const word of node.originalWords) {
          if (results.length >= limit) break;
          results.push(word);
        }
      }

      // Traverse children in alphabetical order for consistent suggestions
      const sortedKeys = Array.from(node.children.keys()).sort();
      for (const char of sortedKeys) {
        if (results.length >= limit) break;
        dfs(node.children.get(char));
      }
    };

    dfs(current);
    return results;
  }

  /**
   * Returns true if there is any word in the trie that starts with the given prefix.
   * 
   * @param {string} prefix 
   * @returns {boolean}
   */
  startsWith(prefix) {
    if (!prefix || typeof prefix !== 'string') return false;
    const normalized = prefix.trim().toLowerCase();
    let current = this.root;
    for (const char of normalized) {
      if (!current.children.has(char)) {
        return false;
      }
      current = current.children.get(char);
    }
    return true;
  }

  /**
   * Returns matching prefix results along with their associated File IDs.
   * Useful when integrating directly with FileMetadataStore.
   * 
   * @param {string} prefix 
   * @param {number} [limit=10] 
   * @returns {Array<{ filename: string, fileIds: string[] }>}
   */
  searchPrefixWithIds(prefix, limit = 10) {
    if (!prefix || typeof prefix !== 'string') return [];
    const normalized = prefix.trim().toLowerCase();
    let current = this.root;

    for (const char of normalized) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char);
    }

    const results = [];
    const dfs = (node) => {
      if (results.length >= limit) return;
      if (node.isEndOfWord) {
        for (const word of node.originalWords) {
          if (results.length >= limit) break;
          results.push({
            filename: word,
            fileIds: Array.from(node.fileIds)
          });
        }
      }
      const sortedKeys = Array.from(node.children.keys()).sort();
      for (const char of sortedKeys) {
        if (results.length >= limit) break;
        dfs(node.children.get(char));
      }
    };

    dfs(current);
    return results;
  }

  /**
   * Returns the count of distinct words inserted.
   * @returns {number}
   */
  size() {
    return this.totalWords;
  }

  /**
   * Clears the Trie.
   */
  clear() {
    this.root = new TrieNode();
    this.totalWords = 0;
  }
}

export default Trie;

// Self-test block: Can be run directly with `node dsa/Trie.js`
if (process.argv[1] && (process.argv[1].endsWith('/Trie.js') || process.argv[1].endsWith('\\Trie.js'))) {
  console.log('\n🌲 [DSA Test] Testing Trie (Prefix Tree) for Filename Autocomplete...\n');

  const trie = new Trie();

  const sampleFiles = [
    'database.pdf',
    'data_structures.pdf',
    'data_mining.docx',
    'dataset_raw.csv',
    'java_notes.txt',
    'joins.pdf',
    'trees_and_graphs.pdf'
  ];

  sampleFiles.forEach((file) => trie.insert(file));
  console.log(`✅ Inserted ${trie.size()} sample files into Trie.`);

  // Test 1: searchPrefix("data")
  const prefixMatches = trie.searchPrefix('data');
  console.log('\n🔍 Suggestions for prefix "data":', prefixMatches);

  // Test 2: searchPrefix("dat")
  const datMatches = trie.searchPrefix('dat');
  console.log('🔍 Suggestions for prefix "dat":', datMatches);

  // Test 3: searchPrefix("j")
  const jMatches = trie.searchPrefix('j');
  console.log('🔍 Suggestions for prefix "j":', jMatches);

  // Test 4: Exact search checks
  console.log('\n🎯 Exact Search Checks:');
  console.log('  search("database.pdf") ->', trie.search('database.pdf'), '(Expected: true)');
  console.log('  search("Database.PDF") [case-insensitive] ->', trie.search('Database.PDF'), '(Expected: true)');
  console.log('  search("data") ->', trie.search('data'), '(Expected: false, prefix only)');
  console.log('  search("algorithms.py") ->', trie.search('algorithms.py'), '(Expected: false, not inserted)');

  // Test 5: startsWith checks
  console.log('\n⚡ startsWith Checks:');
  console.log('  startsWith("tree") ->', trie.startsWith('tree'), '(Expected: true)');
  console.log('  startsWith("algo") ->', trie.startsWith('algo'), '(Expected: false)');

  console.log('\n🎉 All Trie operations passed successfully!\n');
}
