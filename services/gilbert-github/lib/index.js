/* eslint-disable no-console */

// Third party dependencies
import GilbertFile from "@tforster/gilbert-file";
import { Glob } from "@tforster/gilbert-glob";
import { createLogger } from "@tforster/gilbert-logger";

// Project dependencies
import TarStream from "./TarStream.js";

/**
 * @description Creates one or more streams of files from the named Github branch after fetching the archive
 * @export
 * @class GilbertGitHub
 */
export default class GilbertGitHub {
  #repo;
  #branch;
  #token;
  #options;

  /**
   * Creates an instance of GilbertGitHub.
   * @param {Object} options
   * @memberof GilbertGitHub
   */
  constructor(options) {
    this.#repo = options.repo;
    this.#branch = options.branch;
    this.#token = options.token;
    this.#options = options;
  }

  /**
   * @description Creates ReadableStreams that start the GitHub fetch pipeline immediately
   * @returns {Object}
   * @memberof GilbertGitHub
   */
  initialize(streamsConfig = {}) {
    this.#options.streams = streamsConfig;
    const outputStreams = {};

    // Create TransformStreams for each configured output stream
    const streamTransforms = {};
    for (const streamName of Object.keys(streamsConfig)) {
      const transform = new TransformStream();
      outputStreams[streamName] = transform.readable;
      streamTransforms[streamName] = transform.writable.getWriter();
    }

    // Start the pipeline immediately to avoid deadlocks
    this.startPipeline(streamTransforms).catch((error) => {
      // Rethrow the error to be handled by the caller
      throw error;
    });

    return outputStreams;
  }

  /**
   * @description Starts the GitHub fetch and processing pipeline
   * @param {Object} streamControllers - Writers for each output stream
   * @returns {Promise<void>}
   * @memberof GilbertGitHub
   */
  async startPipeline(streamControllers) {
    try {
      // Construct the URL for the GitHub archive
      const url = `https://github.com/${this.#repo}/archive/refs/heads/${this.#branch}.tar.gz`;

      // Create fetch options
      /** @type {RequestInit} */
      const fetchOptions = {
        headers: this.#token ? { Authorization: `Bearer ${this.#token}` } : {},
        redirect: "follow", // Follow redirects
        signal: AbortSignal.timeout(30000), // 30 second timeout
      };

      console.log(`Fetching archive from: ${url}`);

      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`Status: ${response.status}. Has your GitHub PAT expired?`);
      }

      // Create processing pipeline
      const decompressionStream = new DecompressionStream("gzip");
      const untarStream = new TarStream().untar();
      const routerStream = this.createRouterStream(streamControllers);

      console.log("Created pipeline components, connecting...");

      // Connect and run the pipeline
      await response.body
        .pipeThrough(decompressionStream)
        .pipeThrough(untarStream)
        .pipeThrough(routerStream)
        .pipeTo(
          new WritableStream({
            write() {
              // Router handles all the writing, this is just to complete the pipeline
            },
            close() {
              console.log("Pipeline processing complete.");
            },
          })
        );

      console.log("Pipeline completed successfully.");
    } catch (error) {
      // Close all stream controllers with error
      for (const writer of Object.values(streamControllers)) {
        try {
          await writer.abort(error);
        } catch {
          // Ignore errors when aborting
        }
      }
      // Rethrow the error to be handled by the caller
      throw error;
    }
  }

  /**
   * @description Creates the router transform stream that distributes files to output streams
   * @param {Object} streamControllers - Writers for each output stream
   * @returns {TransformStream}
   * @memberof GilbertGitHub
   */
  createRouterStream(streamControllers) {
    // Compile glob patterns once
    const streamGlobs = {};
    for (const [streamName, globs] of Object.entries(this.#options.streams)) {
      // Handle both string and array glob patterns
      const globArray = Array.isArray(globs) ? globs : [globs];
      streamGlobs[streamName] = globArray.map((glob) => new Glob(glob));
    }

    return new TransformStream({
      async transform(fileObject) {
        fileObject = new GilbertFile(fileObject); // Convert to GilbertFile for consistency
        // Log all files being processed to understand the archive contents
        console.log(`Processing file: "${fileObject.path}" (type: ${fileObject.contentType}, size: ${fileObject.size})`);

        // Route file to appropriate streams based on glob matching
        for (const [streamName, globs] of Object.entries(streamGlobs)) {
          if (globs.some((glob) => glob.test(fileObject.path))) {
            console.log(`Routing ${fileObject.path} to ${streamName} stream`);
            try {
              await streamControllers[streamName].write(fileObject);
            } catch (error) {
              console.error(`Error writing to ${streamName} stream:`, error);
            }
          }
        }
      },

      async flush() {
        // Close all stream controllers when pipeline is complete
        for (const [streamName, writer] of Object.entries(streamControllers)) {
          try {
            await writer.close();
            console.log(`Closed ${streamName} stream`);
          } catch (error) {
            console.error(`Error closing ${streamName} stream:`, error);
          }
        }
      },
    });
  }
}
