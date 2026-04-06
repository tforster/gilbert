// System dependencies
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// Third-party dependencies
import GilbertFile from "@tforster/gilbert-file";
import { Glob } from "@tforster/gilbert-glob";
import { createLogger } from "@tforster/gilbert-logger";

// Create async logger with environment-based debug control
const logger = createLogger(globalThis.GILBERT_DEBUG === "true");

/**
 * @typedef {Object} GilbertFSOptions
 * @property {string} [cwd] - Working directory for relative patterns (default: process.cwd())
 * @property {string} [base] - Base directory for relative path calculation (default: cwd)
 * @property {boolean} [strict] - Fail fast on individual file errors (default: true in development, false in production)
 */

/**
 * @typedef {Object} ReadOptions
 * @property {string} [cwd] - Working directory for relative patterns (default: instance cwd)
 * @property {string} [base] - Base directory for relative path calculation (default: instance base)
 * @property {boolean} [strict] - Fail fast on individual file errors (default: instance strict)
 */

/**
 * @description Filesystem adapter for Gilbert with constructor-based configuration
 * Provides src() for reading files as ReadableStream and dest() for writing files as WritableStream
 * @class GilbertFS
 */
export default class GilbertFS {
  // Private fields for encapsulation
  #cwd;
  #base;
  #strict;

  /**
   * Creates an instance of GilbertFS with default configuration
   * @param {GilbertFSOptions} [options={}] - Default configuration for this adapter instance
   */
  constructor(options = {}) {
    this.#cwd = options.cwd || process.cwd();
    this.#base = options.base || this.#cwd;
    this.#strict = options.strict !== undefined ? options.strict : process.env.NODE_ENV !== "production";

    // Resolve paths to absolute
    this.#cwd = path.resolve(this.#cwd);
    this.#base = path.resolve(this.#base);

    if (process.env.NODE_ENV !== "production") {
      logger.debug(`GilbertFS: Initialized with cwd: ${this.#cwd}, base: ${this.#base}, strict: ${this.#strict}`);
    }
  }
  /**
   * Creates a WritableStream for writing GilbertFile objects to the filesystem
   * @param {string} destination - Destination directory (absolute or relative to cwd)
   * @param {Object} [options={}] - Optional stream configuration
   * @returns {WritableStream<GilbertFile>} - WritableStream for writing files
   */
  write(destination, options = {}) {
    const basePath = path.resolve(destination);

    return new WritableStream(
      {
        /**
         * Start method called when the stream is created
         */
        start() {
          // Log initialization for debugging
          if (process.env.NODE_ENV !== "production") {
            logger.debug(`GilbertFS.write: Initialized with base path: ${basePath}`);
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
            logger.error(`GilbertFS.write: Error writing file ${file.path}:`, error);
            controller.error(error);
          }
        },

        /**
         * Close method called when the stream is closed
         */
        close() {
          if (process.env.NODE_ENV !== "production") {
            logger.debug("GilbertFS.write: Stream closed successfully");
          }
        },

        /**
         * Abort method called when the stream is aborted
         * @param {any} reason - Reason for abort
         */
        abort(reason) {
          logger.error("GilbertFS.write: Stream aborted:", reason);
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

    // TODO: Check performance of this vs wrapping file saving in try/catch and creating path on error
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
      logger.debug(`GilbertFS.write: Wrote ${outputPath} (${contents.length} bytes)`);
    }
  }

  /**
   * Creates a ReadableStream of GilbertFile objects from filesystem glob patterns.
   * Uses instance configuration as defaults, with method options taking precedence.
   * Handles both absolute and relative glob patterns intelligently:
   * - Absolute patterns (e.g., "/home/user/files/*.js") use their own base path
   * - Relative patterns (e.g., "src/*.js") are resolved against instance base
   * @param {string|string[]} patterns - Glob pattern(s) to match files
   * @param {ReadOptions} [options={}] - Optional configuration overrides
   * @returns {ReadableStream<GilbertFile>} - Stream of GilbertFile objects
   */
  read(patterns, options = {}) {
    // Merge instance configuration with method options (method options take precedence)
    const base = options.base ? path.resolve(options.base) : this.#base;
    const strict = options.strict !== undefined ? options.strict : this.#strict;

    // Ensure patterns is an array
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    // Bind instance methods for use in ReadableStream
    const createGilbertFile = this.#createGilbertFile.bind(this);

    return new ReadableStream({
      async start(controller) {
        // Track visited files to avoid duplicates
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
              searchDir = base;
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
                    const file = await createGilbertFile(filePath, base);
                    if (file && !hasErrored) {
                      controller.enqueue(file);
                    }
                  } catch (error) {
                    // In strict mode, fail fast
                    if (strict) {
                      hasErrored = true;
                      controller.error(new Error(`Failed to read file ${filePath}: ${error.message}`));
                      return;
                    }
                    // In non-strict mode, log and continue
                    // eslint-disable-next-line no-console
                    console.warn(`GilbertFS: Skipping file ${filePath}: ${error.message}`);
                  }
                }
              }
            } catch (error) {
              // In strict mode, fail fast
              if (strict) {
                hasErrored = true;
                controller.error(new Error(`Failed to process pattern ${searchPattern}: ${error.message}`));
                return;
              }
              // In non-strict mode, log and continue
              // eslint-disable-next-line no-console
              console.warn(`GilbertFS: Skipping pattern ${searchPattern}: ${error.message}`);
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
  async #createGilbertFile(filePath, base) {
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
      // Use instance strict setting for error handling
      if (this.#strict) {
        throw new Error(`Failed to create GilbertFile for ${filePath}: ${error.message}`);
      } else {
        // In non-strict mode, log and return null
        // eslint-disable-next-line no-console
        console.warn(`GilbertFS: Skipping file ${filePath}: ${error.message}`);
        return null;
      }
    }
  }
}
