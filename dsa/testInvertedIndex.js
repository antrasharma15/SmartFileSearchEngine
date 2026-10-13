import { InvertedIndex } from "./InvertedIndex.js";

const index = new InvertedIndex();

// 1. Add documents as per example
index.addDocument("File 1", "DBMS_Notes.pdf");
index.addDocument("File 2", "Java_Notes.txt");
index.addDocument("File 3", "DBMS_Questions.docx");

console.log("--- Inverted Index Search Results ---");
console.log("search('dbms'):", index.search("dbms"));           // [ 'File 1', 'File 3' ]
console.log("search('notes'):", index.search("notes"));         // [ 'File 1', 'File 2' ]
console.log("search('java'):", index.search("java"));           // [ 'File 2' ]
console.log("search('questions'):", index.search("questions")); // [ 'File 3' ]
console.log("search('python'):", index.search("python"));       // []

console.log("\n--- Testing Document Removal ---");
index.removeDocument("File 1", "DBMS_Notes.pdf");
console.log("After removing 'File 1', search('dbms'):", index.search("dbms"));   // [ 'File 3' ]
console.log("After removing 'File 1', search('notes'):", index.search("notes")); // [ 'File 2' ]
