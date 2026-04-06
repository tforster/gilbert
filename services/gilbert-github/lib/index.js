// Third party dependencies
import GilbertFile from "@tforster/gilbert-file";
import { Glob } from "@tforster/gilbert-glob";
import { createLogger } from "@tforster/gilbert-logger";

// Project dependencies
import TarStream from "./TarStream.js";

// Create async logger with environment-based debug control
const logger = createLogger(globalThis.GILBERT_DEBUG === "true");

/**
 * @typedef {Object} GilbertGitHubOptions
 * @property {string} repo - GitHub repository in format "owner/repo"
 * @property {string} [branch="main"] - Branch name to fetch (default: "main")
 * @property {string} [token] - GitHub personal access token for private repositories
 */

/**
 * @description GitHub repository adapter for Gilbert with constructor-based configuration
 * Provides read() for fetching files as ReadableStream and write() for uploading files as WritableStream
 * @class GilbertGitHub
 */
export default class GilbertGitHub {
  // Private fields for encapsulation
  #repo;
  #branch;
  #token;

  /**
   * Creates an instance of GilbertGitHub with repository configuration
   * @param {GilbertGitHubOptions} options - Configuration for this adapter instance
   */
  constructor(options) {
    if (!options?.repo) {
      throw new Error("GitHub repository is required in format 'owner/repo'");
    }

    this.#repo = options.repo;
    this.#branch = options.branch || "main";
    this.#token = options.token;
  }

  /**
   * @typedef {Object} ReadOptions
   * @property {string} [branch] - Override branch for this read operation (default: instance branch)
   * @property {string} [token] - Override token for this read operation (default: instance token)
   */

  /**
   * Creates a ReadableStream of GilbertFile objects from GitHub repository glob patterns.
   * Fetches the repository archive, extracts files, and filters by the specified patterns.
   * @param {string|string[]} patterns - Glob pattern(s) to match files against
   * @param {ReadOptions} [options={}] - Optional configuration overrides
   * @returns {ReadableStream<GilbertFile>} - Stream of GilbertFile objects
   */
  read(patterns = "**/*", options = {}) {
    // Use method options or fall back to instance configuration
    const branch = options.branch || this.#branch;
    const token = options.token || this.#token;

    // Normalize patterns to array for consistent handling
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    // Compile glob patterns once
    const compiledGlobs = patternArray.map((pattern) => new Glob(pattern));

    // Create a readable stream that will contain the filtered files
    let streamController;
    const readableStream = new ReadableStream({
      start(controller) {
        streamController = controller;
      },
    });

    // Start the pipeline processing in the background
    this.startFilteredPipeline(streamController, compiledGlobs, { branch, token });

    return readableStream;
  }

  /**
   * @description Starts the GitHub fetch and processing pipeline for read() method
   * @param {ReadableStreamDefaultController} streamController - Controller for the output stream
   * @param {Glob[]} compiledGlobs - Compiled glob patterns for file filtering
   * @param {Object} [overrides={}] - Optional branch/token overrides
   * @returns {Promise<void>}
   * @memberof GilbertGitHub
   */
  async startFilteredPipeline(streamController, compiledGlobs, overrides = {}) {
    try {
      // Use overrides or fall back to instance configuration
      const branch = overrides.branch || this.#branch;
      const token = overrides.token || this.#token;

      // Construct the URL for the GitHub archive
      const url = `https://github.com/${this.#repo}/archive/refs/heads/${branch}.tar.gz`;

      // Create fetch options
      /** @type {RequestInit} */
      const fetchOptions = {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        redirect: "follow", // Follow redirects
        signal: AbortSignal.timeout(30000), // 30 second timeout
      };

      logger.debug(`Fetching archive from: ${url}`);

      // Fetch the tar.gz archive from GitHub
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`GitHub archive request failed: ${response.status} ${response.statusText}`);
      }

      // Create processing pipeline
      const decompressionStream = new DecompressionStream("gzip");
      const untarStream = new TarStream().untar();

      logger.debug("Created filtered pipeline components, connecting...");

      // Stream the response through decompression and extraction
      await response.body
        .pipeThrough(decompressionStream)
        .pipeThrough(untarStream)
        .pipeTo(
          new WritableStream({
            async write(fileObject) {
              const gilbertFile = new GilbertFile(fileObject); // Convert to GilbertFile for consistency
              logger.debug(`Processing file: "${gilbertFile.path}" (type: ${gilbertFile.contentType}, size: ${gilbertFile.size})`);

              // Check if file matches any of the patterns
              if (compiledGlobs.some((glob) => glob.test(gilbertFile.path))) {
                logger.debug(`Matched pattern: ${gilbertFile.path}`);
                streamController.enqueue(gilbertFile);
              }
            },
            close() {
              logger.debug("Filtered pipeline processing complete.");
              streamController.close();
            },
          })
        );

      logger.debug("Filtered pipeline completed successfully.");
    } catch (error) {
      // Error the stream to signal consumers; do not re-throw since this method
      // is called without await in read() and a thrown rejection would be unhandled.
      streamController.error(error);
    }
  }

  /**
   * Creates a WritableStream for writing GilbertFile objects to GitHub repository
   * @param {string} destination - Destination configuration for GitHub uploads
   * @returns {WritableStream<GilbertFile>} - WritableStream for uploading files
   */
  write(destination) {
    return new WritableStream({
      /**
       * Start method called when the stream is created
       */
      start() {
        // Log initialization for debugging
        if (process.env.NODE_ENV !== "production") {
          logger.debug(`GilbertGitHub.write: Initialized for destination: ${destination}`);
        }
      },

      /**
       * Write method called for each file chunk
       * @param {GilbertFile} fileObject - GilbertFile object to upload to GitHub
       * @returns {Promise<void>}
       */
      async write(fileObject) {
        // For GitHub adapter, writing might involve pushing to GitHub API
        // For now, this is a placeholder that could be implemented for GitHub uploads
        logger.debug(`Would write ${fileObject.path} to ${destination}`);
        throw new Error("GitHub write operations not yet implemented");
      },
    });
  }
}
