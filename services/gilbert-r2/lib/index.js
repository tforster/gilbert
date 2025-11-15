/* eslint-disable no-console */
/// <reference types="@cloudflare/workers-types" />

// Third party dependencies
import { createLogger } from "@tforster/gilbert-logger";

// Create async logger with environment-based debug control
const logger = createLogger(globalThis.GILBERT_DEBUG === "true");

/**
 * @typedef {Object} GilbertFile
 * @description Gilbert file object with streaming contents
 * @property {string} path - Full file path
 * @property {string} relative - Relative path from base
 * @property {ReadableStream|Uint8Array|null} contents - File contents
 * @property {string} [contentType] - MIME type
 * @property {Object} [stat] - File statistics
 * @property {number} [stat.size] - File size in bytes
 * @property {number|null} [size] - Calculated file size
 * @property {Function} [isDirectory] - Check if this is a directory
 */

/**
 * @typedef {Object} GilbertR2Options
 * @property {string} bucket - R2 bucket name
 * @property {string} [accountId] - Cloudflare account ID (not needed when using worker bindings)
 * @property {string} [accessKeyId] - R2 access key ID (not needed when using worker bindings)
 * @property {string} [secretAccessKey] - R2 secret access key (not needed when using worker bindings)
 * @property {R2Bucket} [binding] - R2 bucket binding from Cloudflare Worker environment
 * @property {number} [maxFileSize=104857600] - Maximum file size in bytes (default: 100 MiB)
 */

/**
 * @description Cloudflare R2 adapter for Gilbert with constructor-based configuration
 * Provides write() for uploading files as WritableStream to R2
 * Uses native Cloudflare R2 API with worker bindings for optimal performance
 * @class GilbertR2
 */
export default class GilbertR2 {
  // Private fields for encapsulation
  #bucket;
  #binding;
  #maxFileSize;

  /**
   * Creates an instance of GilbertR2 with bucket configuration
   * @param {GilbertR2Options} options - Configuration for this adapter instance
   */
  constructor(options) {
    if (!options?.bucket && !options?.binding) {
      throw new Error("Either bucket name or R2 binding is required");
    }

    this.#bucket = options.bucket;
    this.#binding = options.binding;
    this.#maxFileSize = options.maxFileSize || 104857600; // 100 MiB default

    if (globalThis.GILBERT_DEBUG === "true") {
      logger.debug(`GilbertR2: Initialized with bucket: ${this.#bucket}, maxFileSize: ${this.#maxFileSize}`);
    }
  }

  /**
   * Creates a ReadableStream for reading files from R2
   * @throws {Error} Always throws - read operations not implemented in initial version
   * @returns {never}
   */
  read() {
    throw new Error("GilbertR2.read() is not implemented. This adapter is write-only for the initial version.");
  }

  /**
   * @typedef {Object} WriteOptions
   * @property {string} [prefix] - Optional prefix to prepend to all file paths in R2
   * @property {Object} [cacheControl] - Cache control headers configuration
   * @property {number} [cacheControl.html=3600] - Cache duration for HTML files in seconds (default: 1 hour)
   * @property {number} [cacheControl.assets=31536000] - Cache duration for static assets in seconds (default: 1 year)
   * @property {Object} [customMetadata] - Custom metadata to attach to all uploaded objects
   */

  /**
   * Creates a WritableStream for writing GilbertFile objects to R2
   * Uses native R2 streaming API for optimal performance
   * @param {string} [destination="/"] - Destination path prefix in R2 bucket
   * @param {WriteOptions} [options={}] - Optional configuration for writes
   * @returns {WritableStream<GilbertFile>} - WritableStream for uploading files
   */
  write(destination = "/", options = {}) {
    const prefix = options.prefix || destination.replace(/^\//, "");
    const cacheControl = options.cacheControl || {};
    const customMetadata = options.customMetadata || {};

    // Get the R2 bucket binding
    const bucket = this.#binding;
    const maxFileSize = this.#maxFileSize;

    if (!bucket) {
      throw new Error("GilbertR2: R2 bucket binding is required for write operations. Pass binding in constructor options.");
    }

    return new WritableStream({
      /**
       * Start method called when the stream is created
       */
      start() {
        if (globalThis.GILBERT_DEBUG === "true") {
          logger.debug(`GilbertR2.write: Initialized with prefix: ${prefix}`);
        }
      },

      /**
       * Write method called for each file chunk
       * @param {GilbertFile} file - GilbertFile object to upload to R2
       * @param {WritableStreamDefaultController} controller - Stream controller
       * @returns {Promise<void>}
       */
      async write(file, controller) {
        try {
          await GilbertR2.#writeFile(file, bucket, prefix, maxFileSize, cacheControl, customMetadata);
        } catch (error) {
          console.error(`GilbertR2.write: Error writing file ${file.path}: ${error.message}`);
          controller.error(error);
        }
      },

      /**
       * Close method called when the stream is closed
       */
      close() {
        if (globalThis.GILBERT_DEBUG === "true") {
          logger.debug("GilbertR2.write: Stream closed successfully");
        }
      },

      /**
       * Abort method called when the stream is aborted
       * @param {any} reason - Reason for abort
       */
      abort(reason) {
        console.error("GilbertR2.write: Stream aborted:", reason);
      },
    });
  }

  /**
   * Private method for writing a single file to R2
   * @param {GilbertFile} file - The file to write
   * @param {R2Bucket} bucket - R2 bucket binding
   * @param {string} prefix - Path prefix for the file
   * @param {number} maxFileSize - Maximum allowed file size
   * @param {Object} cacheControl - Cache control configuration
   * @param {Object} customMetadata - Custom metadata for the object
   * @returns {Promise<void>}
   */
  static async #writeFile(file, bucket, prefix, maxFileSize, cacheControl, customMetadata) {
    // Validate file object
    if (!file || typeof file !== "object") {
      throw new Error("GilbertR2: Invalid file object received");
    }

    if (!file.path) {
      throw new Error("GilbertR2: File object missing path property");
    }

    // Skip directories (files with null contents or isDirectory flag)
    if (file.isDirectory && file.isDirectory()) {
      return;
    }

    // Construct the R2 key using the file's relative path
    const key = prefix ? `${prefix}/${file.relative}`.replace(/\/+/g, "/") : file.relative;

    if (globalThis.GILBERT_DEBUG === "true") {
      logger.debug(`GilbertR2.#writeFile: prefix="${prefix}", relative="${file.relative}", key="${key}"`);
    }

    // Get file contents as ReadableStream
    let contentStream;
    let contentLength = 0;

    if (file.contents instanceof ReadableStream) {
      // Check if we have a known size from the file's stat or size property
      const knownSize = file.stat?.size ?? file.size;

      if (knownSize !== null && knownSize !== undefined && knownSize > 0) {
        // Use the known size and wrap in FixedLengthStream for R2
        contentLength = knownSize;
        const { readable, writable } = new FixedLengthStream(contentLength);

        // Pipe the original stream through the FixedLengthStream
        // Don't await - let it run in the background
        file.contents.pipeTo(writable).catch((error) => {
          console.error(`GilbertR2: Error piping stream for ${file.path}:`, error);
        });

        // Use the readable side for R2
        contentStream = readable;
      } else {
        // No size available - we must read the entire stream into memory
        // to determine length (R2 requirement)
        const chunks = [];
        const reader = file.contents.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            contentLength += value.byteLength;
          }
        } finally {
          reader.releaseLock();
        }

        // Combine all chunks into a single Uint8Array
        const combined = new Uint8Array(contentLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.byteLength;
        }

        // Create a new stream with the combined content
        contentStream = new ReadableStream({
          start(controller) {
            controller.enqueue(combined);
            controller.close();
          },
        });
      }
    } else if (file.contents instanceof Uint8Array) {
      // Convert Uint8Array to ReadableStream
      contentStream = new ReadableStream({
        start(controller) {
          controller.enqueue(file.contents);
          controller.close();
        },
      });
      contentLength = file.contents.length;
    } else if (file.contents === null || file.contents === undefined) {
      // Empty file
      contentStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      contentLength = 0;
    } else {
      throw new Error(`GilbertR2: Unsupported contents type: ${typeof file.contents}`);
    }

    // Enforce file size limit
    if (contentLength > maxFileSize) {
      throw new Error(`GilbertR2: File ${file.path} exceeds maximum size of ${maxFileSize} bytes (${contentLength} bytes)`);
    }

    // Determine cache control based on content type
    const isHtml = file.contentType === "text/html" || file.path.endsWith(".html");
    const cacheSeconds = isHtml ? cacheControl.html || 3600 : cacheControl.assets || 31536000;

    // Prepare HTTP metadata for R2
    const httpMetadata = {
      contentType: file.contentType || "application/octet-stream",
      cacheControl: `public, max-age=${cacheSeconds}`,
    };

    // Merge custom metadata with file metadata
    const metadata = {
      ...customMetadata,
      originalPath: file.path,
      uploadedAt: new Date().toISOString(),
    };

    try {
      // Use R2's native put() method with streaming
      await bucket.put(key, contentStream, {
        httpMetadata,
        customMetadata: metadata,
      });

      if (globalThis.GILBERT_DEBUG === "true") {
        logger.debug(`GilbertR2.write: Uploaded ${key} (${contentLength} bytes, cache: ${cacheSeconds}s)`);
      }
    } catch (error) {
      throw new Error(`GilbertR2: Failed to upload ${key} to R2: ${error.message}`);
    }
  }
}
