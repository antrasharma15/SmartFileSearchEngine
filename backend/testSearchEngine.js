import SearchEngine from "./searchEngine.js";

const engine = new SearchEngine();

const files = [
    {
        name: "Java Notes.pdf",
        path: "C:/Test/Java Notes.pdf",
        extension: ".pdf",
        size: 1200
    },
    {
        name: "Java Programming.docx",
        path: "C:/Test/Java Programming.docx",
        extension: ".docx",
        size: 2500
    },
    {
        name: "Python Basics.txt",
        path: "C:/Test/Python Basics.txt",
        extension: ".txt",
        size: 800
    },
    {
        name: "JavaScript Tutorial.pdf",
        path: "C:/Test/JavaScript Tutorial.pdf",
        extension: ".pdf",
        size: 1800
    }
];

console.log("Building index...");

const stats = engine.buildIndex(files);
console.log("Index Statistics:", stats);

console.log("\nSearching for Java:");
console.log(engine.search("Java"));

console.log("\nAutocomplete for 'Ja':");
console.log(engine.autocomplete("Ja"));

console.log("\nProject Statistics:");
console.log(engine.getStats());
