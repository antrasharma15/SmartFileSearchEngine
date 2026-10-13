import fs from 'fs';
import path from 'path';

/**
 * Default directories to ignore during recursive scanning
 * to avoid scanning millions of temporary or library files.
 */
const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.vscode',
  'dist',
  'build',
  'coverage',
  '$RECYCLE.BIN',
  'System Volume Information'
]);

/**
 * Scans a folder recursively and collects metadata for all files found.
 * 
 * @param {string} targetDir - The absolute or relative path of the directory to scan.
 * @param {Object} options - Configuration options.
 * @param {Set<string>} [options.ignoredDirs] - Folder names to skip.
 * @param {number} [options.maxFiles] - Optional limit on total files to scan (safety guard).
 * @returns {Promise<Array<Object>>} - Array of file metadata objects.
 */
export async function scanDirectory(targetDir, options = {}) {
  const ignoredDirs = options.ignoredDirs || DEFAULT_IGNORED_DIRS;
  const maxFiles = options.maxFiles || 50000;
  
  const resolvedDir = path.resolve(targetDir);
  const filesList = [];
  let fileCounter = 1;

  // Verify that the target directory exists and is a directory
  try {
    const rootStat = await fs.promises.stat(resolvedDir);
    if (!rootStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedDir}`);
    }
  } catch (err) {
    throw new Error(`Cannot access directory: ${resolvedDir} (${err.message})`);
  }

  /**
   * Recursive helper function to traverse directories (Depth-First Search)
   * @param {string} currentDir 
   */
  async function traverse(currentDir) {
    if (filesList.length >= maxFiles) return;

    let entries;
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch (err) {
      // Gracefully handle permission errors or locked folders
      console.warn(`[Scanner Warning] Skipping unreadable folder: ${currentDir} (${err.message})`);
      return;
    }

    for (const entry of entries) {
      if (filesList.length >= maxFiles) break;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          await traverse(fullPath);
        }
      } else if (entry.isFile()) {
        try {
          const stats = await fs.promises.stat(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          const baseName = path.basename(entry.name, ext);

          filesList.push({
            id: `F${fileCounter++}`,
            name: entry.name,
            baseName: baseName,
            extension: ext || 'none',
            path: fullPath,
            size: stats.size, // Size in bytes
            modifiedAt: stats.mtime.toISOString()
          });
        } catch (fileErr) {
          // File might be a broken symlink or temporarily locked
          console.warn(`[Scanner Warning] Skipping unreadable file: ${fullPath}`);
        }
      }
    }
  }

  await traverse(resolvedDir);
  return filesList;
}

export { scanDirectory as scanFolder };
export default scanDirectory;

// Self-test block: Can be run directly with `node backend/scanner.js`
if (process.argv[1] && (process.argv[1].endsWith('/scanner.js') || process.argv[1].endsWith('\\scanner.js'))) {
  const testPath = process.argv[2] || process.cwd();
  console.log(`\n🔍 [Scanner Test] Scanning directory: ${testPath}`);
  
  const startTime = Date.now();
  scanDirectory(testPath)
    .then((files) => {
      const elapsed = Date.now() - startTime;
      console.log(`✅ [Scanner Test] Completed in ${elapsed}ms`);
      console.log(`📁 Total files found: ${files.length}`);
      console.log('\n📄 Sample (first 5 files):');
      console.table(files.slice(0, 5).map(f => ({
        ID: f.id,
        Name: f.name,
        Ext: f.extension,
        Size: `${(f.size / 1024).toFixed(1)} KB`
      })));
    })
    .catch((err) => {
      console.error(`❌ [Scanner Test Error]:`, err.message);
    });
}
