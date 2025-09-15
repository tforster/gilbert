// Third party dependencies
// import mime from "mime";

// Project dependencies
import TemplatePipeline from "./TemplatePipeline.js";
import StaticFilesPipeline from "./StaticFilesPipeline.js";
import ScriptsPipeline from "./ScriptsPipeline.js";
import StylesheetsPipeline from "./StylesheetsPipeline.js";
import { createLogger } from "@tforster/gilbert-logger";

// Create async logger with environment-based debug control
const logger = createLogger(process.env.GILBERT_DEBUG === "true");

// Crude global exception handler
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("Uncaught Exception", err);
});

/**
 * @description: The entry point of the Gilbert compiler engine
 * @class Gilbert
 */
class Gilbert {
  // Private properties
  #options;
  #mergeController;
  #activePipelines;

  /**
   * Creates an instance of Gilbert.
   * @date 2024-08-25
   * @param {object} options: Hash of runtime options including the relative root of the project and the debug flag.
   * @memberof Gilbert
   */
  constructor(options) {
    // .produce was renamed to .compile. This is a temporary alias to maintain backwards compatibility.
    this.produce = this.compile;

    // Initialise private properties
    this.#options = options;

    // Public properties exposed to the calling application
    this.resources = 0;
    this.size = 0;

    // Initialize Web API streams coordinator
    this.#initializeMergeStream();
  }

  /**
   * Initialize the Web API streams merge coordinator
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
      // eslint-disable-next-line no-console
      console.error(`Stream ${streamId.toString()} processing failed:`, error);
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
      this.size += file.contents.length;
      this.resources++;

      // Set content type if missing - deprecated? Should be automatic in gilbert-file now
      // if (!file.contentType) {
      //   file.contentType = file.getMimeType(file.path);
      // }
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
      // eslint-disable-next-line no-console
      console.error(`Pipeline ${pipelineName} failed:`, error);
      throw error;
    } finally {
      this.#activePipelines.delete(pipelineId);

      // Note: Stream closing is now handled centrally in the compile() method
      // This prevents race conditions where fast pipelines close the stream
      // before slower pipelines can complete
    }
  }

  /**
   * @description: Compiles the contents from the various sources into a single stream.
   * @param {object} params:  Parameters describing the specifics of the pipelines as provided by the consuming application.
   * @memberof Gilbert
   */
  async compile(params) {
    const pipelinePromises = [];

    if (!params) {
      throw new Error("No parameters provided to compile method");
    }

    // For compiling data and templates, both streams must be present.
    if (params.uris && params.templates) {
      // Create a new instance of the TemplatePipeline
      const templatePipeline = new TemplatePipeline(this.#options, params.uris, params.templates);

      // Start building files into the stream
      await templatePipeline.build();

      // Process the template pipeline stream
      pipelinePromises.push(this.#processPipeline(templatePipeline.stream, "Templates"));

      if (this.#options.debug) {
        logger.debug("Templates pipeline started");
      }
    }

    // Static files processing
    if (params.staticFiles) {
      const staticFilesPipeline = new StaticFilesPipeline();

      // Connect static files stream through the pipeline to our merge coordinator
      const staticReader = params.staticFiles.pipeThrough(staticFilesPipeline.transformStream);
      pipelinePromises.push(this.#processPipeline(staticReader, "StaticFiles"));

      if (this.#options.debug) {
        logger.debug("Static files pipeline started");
      }
    }

    // Scripts (JavaScript bundling and optimization)
    if (params.scripts) {
      const scriptsPipeline = new ScriptsPipeline(params.scripts, params.scriptsOptions);
      const scriptsStream = await scriptsPipeline.getReadableStream();

      pipelinePromises.push(this.#processPipeline(scriptsStream, "Scripts"));

      if (this.#options.debug) {
        logger.debug("Scripts pipeline started");
      }
    }

    // Stylesheets (CSS bundling and optimization)
    if (params.stylesheets) {
      const stylesheetsPipeline = new StylesheetsPipeline(params.stylesheets, params.stylesheetsOptions);
      const stylesheetsStream = await stylesheetsPipeline.getReadableStream();

      pipelinePromises.push(this.#processPipeline(stylesheetsStream, "Stylesheets"));

      if (this.#options.debug) {
        logger.debug("Stylesheets pipeline started");
      }
    }

    // Start processing all pipelines concurrently
    // Wait for all pipelines to complete before closing the stream
    if (pipelinePromises.length > 0) {
      try {
        await Promise.all(pipelinePromises);

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
      } catch (error) {
        // Close the stream on error too
        if (this.#mergeController) {
          try {
            this.#mergeController.close();
          } catch {
            // Ignore close errors
          }
        }
        // eslint-disable-next-line no-console
        console.error("Pipeline processing failed:", error);
        throw error;
      }
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
  }
}

export default Gilbert;
