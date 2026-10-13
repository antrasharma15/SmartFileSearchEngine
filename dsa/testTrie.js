import { Trie } from "./Trie.js";

const trie = new Trie();

// Insert sample files as specified in the prompt
trie.insert("database.pdf");
trie.insert("data_structures.pdf");
trie.insert("java_notes.txt");

console.log("--- Testing Prefix Search (Autocomplete) ---");
console.log("User types 'data':", trie.searchPrefix("data"));
console.log("User types 'java':", trie.searchPrefix("java"));
console.log("User types 'xyz':", trie.searchPrefix("xyz"));

console.log("\n--- Testing Exact Search ---");
console.log("search('database.pdf'):", trie.search("database.pdf")); // true
console.log("search('data'):", trie.search("data"));                 // false (prefix only)
console.log("search('unknown.txt'):", trie.search("unknown.txt"));   // false
