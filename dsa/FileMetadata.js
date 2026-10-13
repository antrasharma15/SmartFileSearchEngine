/**
 * FileMetadata Store (HashMap Implementation)
 * 
 * Purpose:
 * Stores and manages detailed file metadata keyed by compact File IDs (e.g., 'F1', 'F2').
 * Provides O(1) average-time complexity for looking up complete file details
 * (name, path, extension, size, modified timestamp) once the Inverted Index
 * retrieves matching File IDs.
 * 
 * Complexity:
 * - Insert (set): O(1) average
 * - Lookup (get): O(1) average
 * - Deletion: O(1) average
 * - Space: O(N) where N is the total number of indexed files.
 */
export class FileMetadataStore {
  constructor() {
    /** @type {Map<string, Object>} */
    this.store = new Map();
  }

  /**
   * Stores metadata for a given file ID.
   * @param {string} fileId - e.g., 'F1'
   * @param {Object} metadata - File details
   * @param {string} metadata.name - Filename with extension
   * @param {string} metadata.baseName - Filename without extension
   * @param {string} metadata.extension - File extension (e.g., '.txt')
   * @param {string} metadata.path - Absolute path
   * @param {number} metadata.size - Size in bytes
   * @param {string} metadata.modifiedAt - ISO date string
   */
  set(fileId, metadata) {
    if (!fileId || typeof fileId !== 'string') {
      throw new Error('File ID must be a non-empty string.');
    }
    this.store.set(fileId, {
      id: fileId,
      ...metadata
    });
  }

  /**
   * Retrieves metadata for a file ID in O(1) time.
   * @param {string} fileId 
   * @returns {Object|null}
   */
  get(fileId) {
    return this.store.get(fileId) || null;
  }

  /**
   * Checks if a file ID exists in the store in O(1) time.
   * @param {string} fileId 
   * @returns {boolean}
   */
  has(fileId) {
    return this.store.has(fileId);
  }

  /**
   * Deletes a file's metadata by its ID in O(1) time.
   * @param {string} fileId 
   * @returns {boolean}
   */
  delete(fileId) {
    return this.store.delete(fileId);
  }

  /**
   * Retrieves multiple files' metadata given an array or Set of IDs.
   * Complexity: O(K) where K is the number of requested IDs.
   * @param {Array<string>|Set<string>} fileIds 
   * @returns {Array<Object>}
   */
  getByIds(fileIds) {
    const results = [];
    for (const id of fileIds) {
      const meta = this.store.get(id);
      if (meta) {
        results.push(meta);
      }
    }
    return results;
  }

  /**
   * Returns an array of all stored file metadata objects.
   * @returns {Array<Object>}
   */
  getAll() {
    return Array.from(this.store.values());
  }

  /**
   * Returns the total number of files registered.
   * Complexity: O(1)
   * @returns {number}
   */
  size() {
    return this.store.size;
  }

  /**
   * Clears all stored metadata.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Returns aggregated statistics about the indexed files.
   * Useful for the frontend dashboard overview cards.
   * @returns {Object}
   */
  getStats() {
    let totalBytes = 0;
    const extensionCounts = {};

    for (const file of this.store.values()) {
      totalBytes += file.size || 0;
      const ext = file.extension || 'none';
      extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    }

    return {
      totalFiles: this.store.size,
      totalSizeBytes: totalBytes,
      totalSizeFormatted: `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`,
      extensionCounts
    };
  }

  /**
   * Helper methods compatible with standard lab tutorial nomenclature:
   */
  addFile(file) {
    const key = file.path || file.id;
    this.store.set(key, file);
    if (file.id && file.path && file.id !== file.path) {
      if (!this.idIndex) this.idIndex = new Map();
      this.idIndex.set(file.id, file);
    }
    return key;
  }

  getFile(key) {
    return this.store.get(key) || (this.idIndex ? this.idIndex.get(key) : null) || null;
  }

  removeFile(key) {
    const file = this.getFile(key);
    if (file) {
      if (file.path) this.store.delete(file.path);
      if (file.id) {
        this.store.delete(file.id);
        if (this.idIndex) this.idIndex.delete(file.id);
      }
      return true;
    }
    return false;
  }

  getAllFiles() {
    return Array.from(this.store.values());
  }

  getSize() {
    return this.store.size;
  }
}

export default FileMetadataStore;
export { FileMetadataStore as FileMetadata };

// Self-test block: Can be run directly with `node dsa/FileMetadata.js`
if (process.argv[1] && (process.argv[1].endsWith('/FileMetadata.js') || process.argv[1].endsWith('\\FileMetadata.js'))) {
  console.log('\n🧪 [DSA Test] Testing FileMetadataStore (HashMap)...');
  
  const metadataStore = new FileMetadataStore();

  // Test insertion
  metadataStore.set('F1', {
    name: 'Java_Notes.pdf',
    baseName: 'Java_Notes',
    extension: '.pdf',
    path: '/docs/Java_Notes.pdf',
    size: 2048576,
    modifiedAt: new Date().toISOString()
  });

  metadataStore.set('F2', {
    name: 'DSA_Assignment.docx',
    baseName: 'DSA_Assignment',
    extension: '.docx',
    path: '/docs/DSA_Assignment.docx',
    size: 512000,
    modifiedAt: new Date().toISOString()
  });

  console.log(`✅ Stored ${metadataStore.size()} files.`);
  console.log(`🔍 Lookup 'F1' O(1):`, metadataStore.get('F1').name);
  console.log(`🔍 Lookup 'F2' O(1):`, metadataStore.get('F2').name);
  console.log(`📊 Stats:`, metadataStore.getStats());
  console.log('🎉 FileMetadataStore tests passed successfully!\n');
}
