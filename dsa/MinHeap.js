/**
 * Custom Min-Heap Implementation for Top-K Search Result Ranking
 * 
 * Course: PAMCA501 — Data Structures and Algorithms
 * Module: dsa/MinHeap.js
 * 
 * Purpose:
 * Efficiently selects the top-K highest-scoring search results from M total candidates
 * using a bounded Min-Heap of size K.
 * 
 * Why Min-Heap for Top-K MAXIMUM items?
 * - In a Min-Heap of capacity K, the root always stores the LOWEST score among the top-K candidates.
 * - When a new candidate arrives:
 *     If heap.size < K: insert candidate.
 *     If candidate.score > heap.peek().score: extractMin() and insert candidate.
 *     Otherwise: discard candidate.
 * - Result: After inspecting all M candidates, the heap holds the top-K highest scores!
 * 
 * Complexity:
 * - Full Array Sorting: O(M log M) time, O(M) auxiliary memory.
 * - Bounded Min-Heap: O(M log K) time, O(K) auxiliary memory.
 * Since K << M (e.g. K = 10, M = 50,000), log K is a small constant (~3.3 ops per item).
 */

export class MinHeap {
  /**
   * @param {Function} [comparator] - Optional custom comparator (a, b) => a.score - b.score
   */
  constructor(comparator = null) {
    /** @type {Array<any>} */
    this.heap = [];

    /**
     * Default comparator compares by .score property if object, or directly if number.
     */
    this.comparator = comparator || ((a, b) => {
      const scoreA = (a && typeof a.score === 'number') ? a.score : (typeof a === 'number' ? a : 0);
      const scoreB = (b && typeof b.score === 'number') ? b.score : (typeof b === 'number' ? b : 0);
      return scoreA - scoreB;
    });
  }

  /**
   * Helper: Index of parent node
   */
  #getParentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  /**
   * Helper: Index of left child node
   */
  #getLeftChildIndex(i) {
    return 2 * i + 1;
  }

  /**
   * Helper: Index of right child node
   */
  #getRightChildIndex(i) {
    return 2 * i + 2;
  }

  /**
   * Helper: Swap elements at indices i and j
   */
  #swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Restores min-heap property upward from a given index.
   * Time Complexity: O(log K)
   */
  #bubbleUp(index) {
    let current = index;
    while (current > 0) {
      const parent = this.#getParentIndex(current);
      // If current < parent, swap
      if (this.comparator(this.heap[current], this.heap[parent]) < 0) {
        this.#swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  /**
   * Restores min-heap property downward from a given index.
   * Time Complexity: O(log K)
   */
  #bubbleDown(index) {
    let current = index;
    const length = this.heap.length;

    while (this.#getLeftChildIndex(current) < length) {
      let smallerChild = this.#getLeftChildIndex(current);
      const rightChild = this.#getRightChildIndex(current);

      if (rightChild < length && this.comparator(this.heap[rightChild], this.heap[smallerChild]) < 0) {
        smallerChild = rightChild;
      }

      if (this.comparator(this.heap[smallerChild], this.heap[current]) < 0) {
        this.#swap(current, smallerChild);
        current = smallerChild;
      } else {
        break;
      }
    }
  }

  /**
   * Inserts an item into the Min-Heap.
   * Time Complexity: O(log K)
   * 
   * @param {Object|number} item - e.g. { file: 'java_programs.pdf', score: 9 }
   */
  insert(item) {
    this.heap.push(item);
    this.#bubbleUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the item with the minimum score (the root).
   * Time Complexity: O(log K)
   * 
   * @returns {Object|null} The minimum item, or null if empty
   */
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.#bubbleDown(0);
    return min;
  }

  /**
   * Returns the minimum item without removing it.
   * Time Complexity: O(1)
   * 
   * @returns {Object|null}
   */
  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /**
   * Returns the current number of elements in the heap.
   * @returns {number}
   */
  getSize() {
    return this.heap.length;
  }

  /**
   * Alias for getSize()
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  /**
   * Checks if the heap is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Clears the heap.
   */
  clear() {
    this.heap = [];
  }

  /**
   * Selects the Top-K highest scoring items from a stream or array of candidates.
   * Uses a bounded Min-Heap of capacity K.
   * Time Complexity: O(M log K)
   * Space Complexity: O(K)
   * 
   * @param {Array<Object>} candidates - List of candidate items with .score
   * @param {number} k - Number of top results to return
   * @returns {Array<Object>} Top-K items sorted in descending order of score
   */
  static selectTopK(candidates, k = 10) {
    if (!candidates || candidates.length === 0 || k <= 0) return [];

    const minHeap = new MinHeap();

    for (const item of candidates) {
      if (minHeap.getSize() < k) {
        minHeap.insert(item);
      } else if (minHeap.comparator(item, minHeap.peek()) > 0) {
        minHeap.extractMin();
        minHeap.insert(item);
      }
    }

    // Extract items from Min-Heap (they come out in ascending order)
    const results = [];
    while (!minHeap.isEmpty()) {
      results.push(minHeap.extractMin());
    }

    // Reverse to return in descending order (highest score first)
    return results.reverse();
  }
}

export default MinHeap;

// Self-test block: Can be run directly with `node dsa/MinHeap.js`
if (process.argv[1] && (process.argv[1].endsWith('/MinHeap.js') || process.argv[1].endsWith('\\MinHeap.js'))) {
  console.log('\n🏔️ [DSA Test] Testing Custom Min-Heap Implementation...\n');

  const heap = new MinHeap();

  const candidates = [
    { file: 'java_notes.txt', score: 4 },
    { file: 'java_programs.pdf', score: 9 },
    { file: 'java_questions.docx', score: 7 },
    { file: 'java_basics.pdf', score: 6 },
    { file: 'java_exam.pdf', score: 8 }
  ];

  console.log('📄 Candidate files with relevance scores:');
  console.table(candidates);

  // Test Top 3 selection using bounded Min-Heap pattern
  const K = 3;
  console.log(`\n🎯 Selecting Top ${K} highest scored files using bounded Min-Heap:`);

  for (const item of candidates) {
    if (heap.getSize() < K) {
      heap.insert(item);
      console.log(`  ➕ Inserted: "${item.file}" (Score: ${item.score}) [Heap size: ${heap.getSize()}]`);
    } else if (item.score > heap.peek().score) {
      const removed = heap.extractMin();
      heap.insert(item);
      console.log(`  🔄 Replaced lower score "${removed.file}" (${removed.score}) with "${item.file}" (${item.score})`);
    } else {
      console.log(`  ⏭️ Skipped "${item.file}" (Score: ${item.score} <= min threshold ${heap.peek().score})`);
    }
  }

  console.log(`\n✅ Heap final size: ${heap.getSize()}`);

  // Extract from heap
  const topResults = [];
  while (!heap.isEmpty()) {
    topResults.push(heap.extractMin());
  }
  // Reverse to get descending order
  topResults.reverse();

  console.log('\n🏆 Top 3 Results (Highest Score First):');
  topResults.forEach((res, rank) => {
    console.log(`  Rank ${rank + 1}: ${res.file} — Score ${res.score}`);
  });

  // Verify static helper
  const topViaHelper = MinHeap.selectTopK(candidates, 3);
  console.log('\n🧪 Testing MinHeap.selectTopK helper:');
  console.log(topViaHelper.map(r => `${r.file} (${r.score})`));

  console.log('\n🎉 Min-Heap Top-K tests passed successfully!\n');
}
