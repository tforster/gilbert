// Third party dependencies
import mime from "mime";

// Project dependencies
import TemplatePipeline from "./TemplatePipeline.js";
import StaticFilesPipeline from "./StaticFilesPipeline.js";
// import ScriptsPipeline from "./ScriptsPipeline.js"; // TODO: Re-enable after Web API streams conversion
// import StylesheetsPipeline from "./StylesheetsPipeline.js"; // TODO: Re-enable after Web API streams conversion

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
          // eslint-disable-next-line no-console
          console.log("MergeStream cancelled");
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
          this.#mergeController.close();

          if (this.#options.debug) {
            // eslint-disable-next-line no-console
            console.log(`MergeStream ended: ${this.resources} resources, ${this.size} bytes`);
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

      // Set content type if missing
      if (!file.contentType) {
        file.contentType = mime.getType(file.path);
      }
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
        // eslint-disable-next-line no-console
        console.log(`${pipelineName} completed`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Pipeline ${pipelineName} failed:`, error);
      throw error;
    } finally {
      this.#activePipelines.delete(pipelineId);

      // If this was the last pipeline, close the merge stream
      if (this.#activePipelines.size === 0) {
        if (this.#mergeController) {
          this.#mergeController.close();
          if (this.#options.debug) {
            // eslint-disable-next-line no-console
            console.log(`MergeStream ended: ${this.resources} resources, ${this.size} bytes`);
          }
        }
      }
    }
  }

  /**
   * @description: Compiles the contents from the various sources into a single stream.
   * @param {object} params:  Parameters describing the specifics of the pipelines as provided by the consuming application.
   * @memberof Gilbert
   */
  async compile(params) {
    const pipelinePromises = [];

    // For compiling data and templates, both streams must be present.
    if (params?.uris?.data?.stream && params?.uris?.theme?.stream) {
      // Create a new instance of the TemplatePipeline
      const templatePipeline = new TemplatePipeline(this.#options, params.uris.data.stream, params.uris.theme.stream);

      // Start building files into the stream
      await templatePipeline.build();

      // Process the template pipeline stream
      pipelinePromises.push(this.#processPipeline(templatePipeline.stream, "Templates"));

      if (this.#options.debug) {
        // eslint-disable-next-line no-console
        console.log("Templates pipeline started");
      }
    }

    // Static files processing
    if (params?.files?.stream) {
      const staticFilesPipeline = new StaticFilesPipeline(this.#options);

      // Connect static files stream through the pipeline to our merge coordinator
      const staticReader = params.files.stream.pipeThrough(staticFilesPipeline.transformStream);
      this.addStream(staticReader);
    }

    // Scripts processing - temporarily disabled during Web API streams conversion
    /*
    if (params?.scripts?.entryPoints) {
      const scriptsPipeline = new ScriptsPipeline(this.#options, params.scripts.entryPoints);
      
      // Building is asynchronous because esbuild has to read from the filesystem
      const results = await scriptsPipeline.build();
      
      // TODO: Convert ScriptsPipeline to Web API streams
      // For now, assume it will return a Web API ReadableStream
      pipelinePromises.push(this.#processPipeline(scriptsPipeline.stream, "Scripts"));

      if (this.#options.debug) {
        // eslint-disable-next-line no-console
        console.log("Scripts pipeline started", results);
      }
    }
    */

    // Stylesheets processing - temporarily disabled during Web API streams conversion
    /*
    if (params?.stylesheets?.entryPoints) {
      const stylesheetsPipeline = new StylesheetsPipeline(this.#options, params.stylesheets.entryPoints);

      // Building is asynchronous because esbuild has to read from the filesystem
      const results = await stylesheetsPipeline.build();

      // TODO: Convert StylesheetsPipeline to Web API streams
      // For now, assume it will return a Web API ReadableStream
      pipelinePromises.push(this.#processPipeline(stylesheetsPipeline.stream, "Stylesheets"));

      if (this.#options.debug) {
        // eslint-disable-next-line no-console
        console.log("Stylesheets pipeline started", results);
      }
    }
    */

    // Start processing all pipelines concurrently
    // The individual pipelines will close the merge stream when they're all done
    if (pipelinePromises.length > 0) {
      // Don't await here - let pipelines run concurrently
      // The merge stream will close automatically when all pipelines complete
      Promise.all(pipelinePromises).catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Pipeline processing failed:", error);
      });
    } else {
      // No pipelines to process, close immediately
      if (this.#mergeController) {
        this.#mergeController.close();
      }
    }
  }
}

export default Gilbert;
