import { MinHeap } from "./MinHeap.js";

const heap = new MinHeap();

const candidates = [
  { file: "java_notes.txt", score: 4 },
  { file: "java_programs.pdf", score: 9 },
  { file: "java_questions.docx", score: 7 },
  { file: "java_basics.pdf", score: 6 },
  { file: "java_exam.pdf", score: 8 }
];

const K = 3;

console.log("--- Bounded Min-Heap: Selecting Top 3 Results ---");

for (const item of candidates) {
  if (heap.getSize() < K) {
    heap.insert(item);
  } else if (item.score > heap.peek().score) {
    heap.extractMin();
    heap.insert(item);
  }
}

console.log("Final heap size:", heap.getSize()); // 3

// Extract results (ascending from heap)
const results = [];
while (!heap.isEmpty()) {
  results.push(heap.extractMin());
}
// Reverse to get highest first
results.reverse();

console.log("\nTop 3 results:");
results.forEach(r => {
  console.log(`${r.file} — ${r.score}`);
});
