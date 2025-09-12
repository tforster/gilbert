// System dependencies
import { mkdir, writeFile, readFile, stat, readdir } from "node:fs/promises";
import path from "node:path";

// Third-party dependencies
import { Glob } from "@tforster/gilbert-glob";
import GilbertFile from "@tforster/gilbert-file";

/**
 * @typedef {Object} SrcOptions
 * @property {string} [cwd] - Working directory for relative patterns (default: process.cwd())
 * @property {string} [base] - Base directory for relative path calculation (default: cwd)
 * @property {boolean} [strict] - Fail fast on individual file errors (default: true in development, false in production)
 */

/**
 * @description Static utility methods for filesystem operations with GilbertFile objects
 * Provides src() for reading files as ReadableStream and dest() for writing files as WritableStream
 * @class GilbertFS
 */
class GilbertFS {
  /**
   * Creates a WritableStream for writing GilbertFile objects to the filesystem
   * @param {string} destination - Destination directory (absolute or relative to cwd)
   * @param {Object} [options={}] - Optional stream configuration
   * @returns {WritableStream<GilbertFile>} - WritableStream for writing files
   * @static
   */
  static dest(destination, options = {}) {
    const basePath = path.resolve(destination);

    return new WritableStream(
      {
        /**
         * Start method called when the stream is created
         */
        start() {
          // Log initialization for debugging
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log(`GilbertFS.dest: Initialized with base path: ${basePath}`);
          }
        },

        /**
         * Write method called for each file chunk
         * @param {Object} file - GilbertFile object to write to filesystem
         * @param {WritableStreamDefaultController} controller - Stream controller
         * @returns {Promise<void>}
         */
        async write(file, controller) {
          try {
            await GilbertFS.#writeFile(file, basePath);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`GilbertFS.dest: Error writing file ${file.path}:`, error);
            controller.error(error);
          }
        },

        /**
         * Close method called when the stream is closed
         */
        close() {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log("GilbertFS.dest: Stream closed successfully");
          }
        },

        /**
         * Abort method called when the stream is aborted
         * @param {any} reason - Reason for abort
         */
        abort(reason) {
          // eslint-disable-next-line no-console
          console.error("GilbertFS.dest: Stream aborted:", reason);
        },
      },
      options
    );
  }

  /**
   * Private method for writing a single file to the filesystem
   * @param {GilbertFile} file - The file to write
   * @param {string} basePath - Base directory path
   * @returns {Promise<void>}
   */
  static async #writeFile(file, basePath) {
    // Validate that we have a file object with required properties
    if (!file || typeof file !== "object") {
      throw new Error("GilbertFS: Invalid file object received");
    }

    if (!file.path) {
      throw new Error("GilbertFS: File object missing path property");
    }

    // Skip directories (files with null contents)
    if (file.isDirectory && file.isDirectory()) {
      return;
    }

    // Resolve the full output path using relative path (Vinyl convention)
    const outputPath = path.join(basePath, file.relative);

    // Ensure the directory exists
    const dirPath = path.dirname(outputPath);
    await mkdir(dirPath, { recursive: true });

    // Get file contents
    let contents;
    if (file.contents instanceof Uint8Array) {
      contents = file.contents;
    } else if (file.contents instanceof ReadableStream) {
      // Handle ReadableStream contents
      const chunks = [];
      const reader = file.contents.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Concatenate all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      contents = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        contents.set(chunk, offset);
        offset += chunk.length;
      }
    } else if (file.contents === null || file.contents === undefined) {
      // Handle null contents (empty files)
      contents = new Uint8Array(0);
    } else {
      throw new Error(`GilbertFS: Unsupported contents type: ${typeof file.contents}`);
    }

    // Write the file
    await writeFile(outputPath, contents);

    // Log successful write in debug mode
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`GilbertFS.dest: Wrote ${outputPath} (${contents.length} bytes)`);
    }
  }

  /**
   * Static method for reading files from filesystem using glob patterns
   * Handles both absolute and relative glob patterns intelligently:
   * - Absolute patterns (e.g., "/home/user/files/*.js") use their own base path
   * - Relative patterns (e.g., "src/*.js") are resolved against cwd
   * @param {string|string[]} patterns - Glob pattern(s) to match files
   * @param {SrcOptions} [options={}] - Optional configuration
   * @returns {ReadableStream<GilbertFile>} - Stream of GilbertFile objects
   */
  static src(patterns, options = {}) {
    const { cwd = process.cwd(), base } = options;
    const resolvedCwd = path.resolve(cwd);
    const resolvedBase = base ? path.resolve(base) : resolvedCwd;

    // Ensure patterns is an array
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    return new ReadableStream({
      async start(controller) {
        const visited = new Set();
        let hasErrored = false;

        try {
          // Process each pattern, determining base directory intelligently
          for (const pattern of patternArray) {
            if (hasErrored) break; // Stop processing if we've encountered an error

            // Determine search directory for this pattern (for file finding)
            let searchDir;
            let searchPattern;

            if (path.isAbsolute(pattern)) {
              // Absolute pattern: extract search directory from pattern
              const parts = pattern.split(/[*?[\]{}]/)[0]; // Get part before first glob character
              searchDir = path.dirname(parts);
              searchPattern = pattern;
            } else {
              // Relative pattern: search in base directory
              searchDir = resolvedBase;
              searchPattern = pattern;
            }

            try {
              // Stream files for this pattern
              const fileIterator = GilbertFS.#walkDirectoryStream(searchDir, searchPattern, searchDir);
              for await (const filePath of fileIterator) {
                if (hasErrored) break; // Stop if we've encountered an error

                if (!visited.has(filePath)) {
                  visited.add(filePath);
                  try {
                    const file = await GilbertFS.#createGilbertFile(filePath, resolvedBase);
                    if (file && !hasErrored) {
                      controller.enqueue(file);
                    }
                  } catch (error) {
                    // In strict mode, fail fast
                    hasErrored = true;
                    controller.error(new Error(`Failed to read file ${filePath}: ${error.message}`));
                    return;
                  }
                }
              }
            } catch (error) {
              // In strict mode, fail fast
              hasErrored = true;
              controller.error(new Error(`Failed to process pattern ${searchPattern}: ${error.message}`));
              return;
            }
          }

          // Only close if we haven't errored
          if (!hasErrored) {
            controller.close();
          }
        } catch (error) {
          hasErrored = true;
          controller.error(error);
        }
      },
    });
  }

  /**
   * Private async generator for streaming directory traversal
   * @param {string} dir - Directory to walk
   * @param {string} pattern - Glob pattern to match
   * @param {string} [baseDir] - Original base directory for relative path calculation
   * @yields {string} - Matching file paths as they're discovered
   */
  static async *#walkDirectoryStream(dir, pattern, baseDir = dir) {
    const glob = new Glob(pattern);

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          // Recursively stream subdirectories (yields files immediately as found)
          yield* GilbertFS.#walkDirectoryStream(fullPath, pattern, baseDir);
        } else if (entry.isFile()) {
          // Test file against glob pattern and yield immediately if match
          if (glob.test(relativePath) || glob.test("/" + relativePath)) {
            yield fullPath;
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible, skip it
      if (error.code !== "ENOENT" && error.code !== "EACCES") {
        throw error;
      }
    }
  }

  /**
   * Private method to create a GilbertFile from a filesystem path
   * @param {string} filePath - Absolute path to the file
   * @param {string} base - Base directory for relative path calculation
   * @returns {Promise<GilbertFile|null>} - GilbertFile instance or null if file should be skipped
   */
  static async #createGilbertFile(filePath, base) {
    try {
      const stats = await stat(filePath);

      // Skip directories
      if (stats.isDirectory()) {
        return null;
      }

      // Create a ReadableStream for the file contents
      const contents = new ReadableStream({
        async start(controller) {
          try {
            const buffer = await readFile(filePath);
            controller.enqueue(new Uint8Array(buffer));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      // Create GilbertFile instance following Vinyl conventions:
      // - path: absolute path
      // - base: base directory for relative calculations
      // - relative: computed as path.relative(base, path)
      return new GilbertFile({
        path: filePath, // Keep absolute path (Vinyl convention)
        base, // Set base directory for relative path calculation
        contents,
        stat: stats,
      });
    } catch (error) {
      // Log error but don't throw - let caller decide how to handle
      throw new Error(`Failed to create GilbertFile for ${filePath}: ${error.message}`);
    }
  }
}

export default GilbertFS;
