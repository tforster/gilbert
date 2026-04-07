// Third party dependencies
// import mime from "mime";

// Project dependencies
import TemplatePipeline from "./TemplatePipeline.js";
import StaticFilesPipeline from "./StaticFilesPipeline.js";
import ScriptsPipeline from "./ScriptsPipeline.js";
import StylesheetsPipeline from "./StylesheetsPipeline.js";
import { createLogger } from "@tforster/gilbert-logger";

// Enable debug logging when the GILBERT_DEBUG global is set (WinterCG-compatible)
const logger = createLogger(globalThis.GILBERT_DEBUG === "true");

/**
 * @typedef {Function} DataMiddleware
 * @param {Array} files - Array of data files
 * @returns {Array} Transformed files array
 */

/**
 * @description: The entry point of the Gilbert compiler engine
 * @class Gilbert
 */
class Gilbert {
  // Private properties
  #streams;
  #options;
  #mergeController;
  #activePipelines;

  /**
   * Creates an instance of Gilbert.
   * @date 2024-08-25
   * @param {object} streams - Stream configuration object with pipelines and sources
   * @param {object} config - Processing configuration (debug, minify, etc.)
   * @memberof Gilbert
   */
  constructor(streams, config = {}) {
    // .produce was renamed to .compile. This is a temporary alias to maintain backwards compatibility.
    this.produce = this.compile;

    // Store streams and configuration separately
    this.#streams = streams || {};
    this.#options = config;

    // Public properties exposed to the calling application
    this.resources = 0;
    this.size = 0;

    // Initialise Web API streams coordinator
    this.#initializeMergeStream();
  }

  /**
   * Initialise the Web API streams merge coordinator
   */
  #initializeMergeStream() {
    const self = this;

    // Track active pipelines
    this.#activePipelines = new Set();

    this.stream = new ReadableStream({
      start(controller) {
        self.#mergeController = controller;
      },

      cancel() {
        if (self.#options.debug) {
          logger.debug("MergeStream cancelled");
        }
      },
    });
  }

  /**
   * Add a ReadableStream to be merged into the output
   */
  addStream(readableStream) {
    const streamId = Symbol("stream");
    this.#activePipelines.add(streamId);

    // Start reading from this stream
    this.#processStream(readableStream, streamId);
  }

  /**
   * Process a single stream and pipe its data to the merge output
   */
  async #processStream(readableStream, streamId) {
    try {
      const reader = readableStream.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Process the file through our enqueue method
        this.#enqueueFile(value);
      }

      reader.releaseLock();
    } catch (error) {
      logger.error(`Stream ${streamId.toString()} processing failed:`, error);
    } finally {
      // Remove this pipeline from active set
      this.#activePipelines.delete(streamId);

      // If no more active pipelines, close the merge stream
      if (this.#activePipelines.size === 0) {
        if (this.#mergeController) {
          // Check if controller is still open before closing
          try {
            this.#mergeController.close();

            if (this.#options.debug) {
              logger.debug(`MergeStream ended: ${this.resources} resources, ${this.size} bytes`);
            }
          } catch {
            // Controller might already be closed, ignore the error
            if (this.#options.debug) {
              logger.debug("MergeStream already closed");
            }
          }
        }
      }
    }
  }

  /**
   * Add a file to the merge stream and update statistics
   */
  #enqueueFile(file) {
    // Check for contents before incrementing the size
    if (file.contents) {
      // Use GilbertFile.size (null for ReadableStream, byte count for Uint8Array)
      this.size += file.size ?? 0;
      this.resources++;
    }

    // Add to output stream
    if (this.#mergeController) {
      this.#mergeController.enqueue(file);
    }
  }

  /**
   * Register a pipeline and handle its completion
   */
  async #processPipeline(pipelineStream, pipelineName) {
    const pipelineId = Symbol(pipelineName);
    this.#activePipelines.add(pipelineId);

    try {
      const reader = pipelineStream.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        this.#enqueueFile(value);
      }

      if (this.#options.debug) {
        logger.debug(`${pipelineName} completed`);
      }
    } catch (error) {
      logger.error(`Pipeline ${pipelineName} failed:`, error);
      throw error;
    } finally {
      this.#activePipelines.delete(pipelineId);

      // Note: Stream closing is now handled centrally in the compile() method
      // This prevents race conditions where fast pipelines close the stream
      // before slower pipelines can complete
    }
  }

  /**
   * Process data middleware by collecting all data files, applying middleware, and returning a stream
   * @param {ReadableStream} dataStream - The source data stream
   * @param {DataMiddleware[]} middlewareArray - Array of middleware functions
   * @returns {Promise<ReadableStream>} Processed data stream
   */
  async #processDataMiddleware(dataStream, middlewareArray) {
    if (!middlewareArray?.length) return dataStream;

    // Collect all data files into memory
    const files = [];
    const collector = new WritableStream({
      write(file) {
        files.push(file);
      },
    });
    await dataStream.pipeTo(collector);

    // Apply middleware functions in sequence
    let processedFiles = files;
    for (const middleware of middlewareArray) {
      processedFiles = await middleware(processedFiles);
    }

    // Convert back to stream
    return new ReadableStream({
      start(controller) {
        for (const file of processedFiles) {
          controller.enqueue(file);
        }
        controller.close();
      },
    });
  }

  /**
   * @description: Compiles the contents from the various sources into a single stream.
   * @returns {Promise<ReadableStream>} The Gilbert output stream
   * @memberof Gilbert
   */
  async compile() {
    const pipelinePromises = [];

    // Reset stream coordinator for each compile
    this.#initializeMergeStream();

    // For compiling data and templates, both streams must be present.
    if (this.#streams.templates && (this.#streams.data || this.#streams.uris)) {
      let dataStream;

      // Handle both new data configuration and legacy uris
      if (this.#streams.data) {
        // New data configuration with middleware support
        dataStream = await this.#processDataMiddleware(this.#streams.data.source, this.#streams.data.middleware);
      } else {
        // Legacy uris configuration (backward compatibility)
        dataStream = this.#streams.uris;
      }

      // Create a new instance of the TemplatePipeline
      const templatePipeline = new TemplatePipeline(this.#options, dataStream, this.#streams.templates);

      // Start building files into the stream
      await templatePipeline.build();

      // Process the template pipeline stream
      pipelinePromises.push(this.#processPipeline(templatePipeline.stream, "Templates"));

      if (this.#options.debug) {
        logger.debug("Templates pipeline started");
      }
    }

    // Static files processing — accepts a single ReadableStream or an array of ReadableStreams
    const staticInput = this.#streams.static || this.#streams.staticFiles;
    if (staticInput) {
      const staticStreams = Array.isArray(staticInput) ? staticInput : [staticInput];

      for (const staticStream of staticStreams) {
        const staticFilesPipeline = new StaticFilesPipeline();
        const staticReader = staticStream.pipeThrough(staticFilesPipeline.transformStream);
        pipelinePromises.push(this.#processPipeline(staticReader, "StaticFiles"));
      }

      if (this.#options.debug) {
        logger.debug(`Static files pipeline started (${staticStreams.length} stream(s))`);
      }
    }

    // Scripts (JavaScript bundling and optimisation)
    if (this.#streams.scripts) {
      const scriptsPipeline = new ScriptsPipeline(this.#streams.scripts, this.#streams.scriptsOptions);
      const scriptsStream = await scriptsPipeline.getReadableStream();

      pipelinePromises.push(this.#processPipeline(scriptsStream, "Scripts"));

      if (this.#options.debug) {
        logger.debug("Scripts pipeline started");
      }
    }

    // Stylesheets (CSS bundling and optimisation)
    if (this.#streams.stylesheets) {
      const stylesheetsPipeline = new StylesheetsPipeline(this.#streams.stylesheets, this.#streams.stylesheetsOptions);
      const stylesheetsStream = await stylesheetsPipeline.getReadableStream();

      pipelinePromises.push(this.#processPipeline(stylesheetsStream, "Stylesheets"));

      if (this.#options.debug) {
        logger.debug("Stylesheets pipeline started");
      }
    }

    // Start processing all pipelines concurrently
    // Wait for all pipelines to complete before closing the stream
    if (pipelinePromises.length > 0) {
      // Start all pipelines in the background
      Promise.all(pipelinePromises)
        .then(() => {
          // All pipelines completed successfully, close the merge stream
          if (this.#mergeController) {
            try {
              this.#mergeController.close();
              if (this.#options.debug) {
                logger.debug(`MergeStream ended: ${this.resources} resources, ${this.size} bytes`);
              }
            } catch {
              // Controller might already be closed, ignore the error
              if (this.#options.debug) {
                logger.debug("MergeStream already closed");
              }
            }
          }
        })
        .catch((error) => {
          // Close the stream on error too
          if (this.#mergeController) {
            try {
              this.#mergeController.close();
            } catch {
              // Ignore close errors
            }
          }
          logger.error("Pipeline processing failed:", error);
        });
    } else {
      // No pipelines to process, close immediately
      if (this.#mergeController) {
        try {
          this.#mergeController.close();
        } catch {
          // Controller might already be closed, ignore the error
        }
      }
    }

    // Return the stream directly
    return this.stream;
  }
}

export default Gilbert;
