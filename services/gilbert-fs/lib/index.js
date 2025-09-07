// System dependencies
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * @description A Web API WritableStream implementation for writing GilbertFile objects to the filesystem
 * @class GilbertFS
 */
class GilbertFS extends WritableStream {
  /**
   * Creates an instance of GilbertFS WritableStream for writing files to filesystem
   * @param {Object} options - Configuration options
   * @param {string} options.base - Base directory path for writing files
   * @memberof GilbertFS
   */
  constructor(options = { base: "./dist" }) {
    const { base = "./dist" } = options;

    // Resolve base path to absolute path
    const basePath = path.resolve(base);

    super({
      /**
       * Start method called when the stream is created
       */
      start() {
        // Log initialization for debugging
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log(`GilbertFS: Initialized with base path: ${basePath}`);
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

          // Resolve the full output path
          const outputPath = path.join(basePath, file.path);

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
            console.log(`GilbertFS: Wrote ${outputPath} (${contents.length} bytes)`);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`GilbertFS: Error writing file ${file.path}:`, error);
          controller.error(error);
        }
      },

      /**
       * Close method called when the stream is closed
       */
      close() {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("GilbertFS: Stream closed successfully");
        }
      },

      /**
       * Abort method called when the stream is aborted
       * @param {any} reason - Reason for abort
       */
      abort(reason) {
        // eslint-disable-next-line no-console
        console.error("GilbertFS: Stream aborted:", reason);
      },
    });

    // Store options for potential future use
    this.options = { base: basePath };
  }

  /**
   * Static method for reading files from filesystem (not yet implemented)
   * @returns {ReadableStream} - Stream of GilbertFile objects
   * @throws {Error} - Always throws as not yet implemented
   * @static
   */
  static src() {
    throw new Error("GilbertFS.src() is not yet implemented");
  }

  /**
   * Static method for creating a destination WritableStream
   * @param {string} base - Base directory path for writing files
   * @param {Object} options - Additional options
   * @returns {GilbertFS} - WritableStream for writing files
   * @static
   */
  static dest(base, options = {}) {
    return new GilbertFS({ base, ...options });
  }
}

export default GilbertFS;
