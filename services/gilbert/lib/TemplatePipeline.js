// Third party dependencies
import handlebars from "handlebars";
import { minify as htmlMinify } from "html-minifier";
import { log, vinyl } from "./Utils.js";
import mime from "mime";
import { Readable } from "stream";

// Web API Streams utilities
class WebStreamUtils {
  /**
   * Creates a WritableStream that processes vinyl files into an array
   */
  static createVinylCollector(processor) {
    const chunks = [];
    return {
      stream: new WritableStream({
        write(chunk) {
          chunks.push(chunk);
          if (processor) {
            processor(chunk);
          }
        },
      }),
      chunks,
      getResult() {
        return chunks;
      },
    };
  }

  /**
   * Waits for Web API streams to complete
   */
  static async streamsFinish(streams) {
    const promises = streams.map((stream) => {
      if (stream.closed !== undefined) {
        // WritableStream
        return stream.closed;
      } else if (stream.locked !== undefined) {
        // ReadableStream - consume it completely
        return stream.cancel();
      }
      return Promise.resolve();
    });
    return Promise.all(promises);
  }

  /**
   * Pipes a ReadableStream to a WritableStream (Web API equivalent of .pipe())
   */
  static async pipeStreams(readable, writable) {
    const reader = readable.getReader();
    const writer = writable.getWriter();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } finally {
      await writer.close();
      reader.releaseLock();
    }
  }

  /**
   * Converts a Web API ReadableStream to a Node.js Readable stream for compatibility
   */
  static webStreamToNodeStream(webStream) {
    const reader = webStream.getReader();

    return new Readable({
      objectMode: true,
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null); // End the stream
          } else {
            this.push(value);
          }
        } catch (error) {
          this.destroy(error);
        }
      },
    });
  }
}

// TODO: 1. Expect dataStream to be type object of individual URI objects;
// TODO: 2. Wait for themeStream to complete loading to memory and THEN pipe dataStream to themeStream

class TemplatePipeline {
  // Private properties
  #dataStreamR;
  #themeStreamR;

  /**
   * Creates a Web API ReadableStream as pipable output (replaces Node.js Readable)
   */
  constructor(options, dataStreamR, themeStreamR) {
    this.#dataStreamR = dataStreamR;
    this.#themeStreamR = themeStreamR;

    // Create a TransformStream instead of Readable for Web API compatibility
    const { readable, writable } = new TransformStream({
      start() {
        // Initialize if needed
      },
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

    this.stream = readable;
    this._writer = writable.getWriter(); // Keep writer for pushing data
  }

  /**
   * @description
   * @return {stream}:  A steam of Vinyl files
   * @memberof TemplatePipeline
   */
  async prep() {
    const { data, templates } = await this.parseFiles();
    this.data = data;
    this.templates = templates;
  }

  /**
   * @description: Builds files by combining templates and data
   * @return {void}:
   * @memberof TemplatePipeline
   */
  async build() {
    const data = this.data;
    const templates = this.templates;

    // Check for data and exit if non present
    if (!data.uris) {
      const msg = "TemplatePipeline: Empty or missing data.uris.";
      log(msg);
      await this._writer.close();
      return;
    }

    try {
      // Iterate through each URI
      for (const [key, uri] of Object.entries(data.uris)) {
        let vinylFile = {};
        // Use the URI key directly - developer controls the final file path and extension
        const path = key;

        if (uri.webProducerKey && uri.webProducerKey !== "redirect") {
          // Get the handlebars template - parent folder is already stripped during indexing
          const template = templates[uri.webProducerKey + ".hbs"];

          if (!template) {
            log(`Template not found for webProducerKey: ${uri.webProducerKey}`);
            continue;
          }

          // Generate the page contents with handlebars and the current URI data
          const generatedContents = template({ ...data, ...uri });

          vinylFile = vinyl({
            path,
            contents: Buffer.from(generatedContents),
            // TODO: Refactor so this is entirely handled in gilbert-file

            contentType: mime.getType(path),
          });

          if (vinylFile.extname === "" || vinylFile.extname === ".html") {
            // This generated file in HTML and the contents should be minified
            vinylFile.contents = Buffer.from(
              htmlMinify(vinylFile.contents.toString(), {
                collapseWhitespace: true,
                removeComments: true,
                minifyCSS: true,
                minifyJS: true,
              })
            );
            // Force extensionless to HTML mime type
            vinylFile.contentType = "text/html";
          }
        } else if (uri.webProducerKey === "redirect") {
          // Redirects are pseudo-virtual text files that are not created via a handlebars template
          vinylFile = vinyl({
            path,
            contents: Buffer.from(uri.targetAddress),
            redirect: 301,
            // Note: AWS S3 will convert this to the specific header x-amz-website-redirect-location
            // targetAddress: uri.targetAddress,
            contentType: "text/html",
          });
        } else {
          log(`Unexpected condition: page and webProducerKey not found. ${key}, ${uri}`);
          continue;
        }

        // Write the vinyl file to the Web API stream instead of pushing
        await this._writer.write(vinylFile);
      }

      // Close the writer when done
      await this._writer.close();
    } catch (error) {
      await this._writer.abort(error);
      throw error;
    }
  }

  /**
   * @description:  Parses out the data as a file from dataStreamR and, compiles all the handlebars templates found in themeStreamR.
   * @return {object}:  An object containing a data property and a compiled handlebars templates property
   * @memberof TemplatePipeline
   */
  async parseFiles() {
    // Cache the streams to make them easier to reference in this method
    const dataStreamR = this.#dataStreamR;
    const themeStreamR = this.#themeStreamR;

    // Declare the in-memory objects to be returned
    const templates = {};
    const data = {};

    // Create collectors for processing Web API streams
    const themeCollector = WebStreamUtils.createVinylCollector((file) => {
      // Strip the parent folder (templates/, theme/, etc.) from file.relative
      // to give developers control over folder naming while maintaining consistent lookup
      let templateKey = file.relative;

      // Remove the first path segment (parent folder) to get the actual template key
      const pathParts = templateKey.split("/");
      if (pathParts.length > 1) {
        // Remove first segment: "templates/homepage.hbs" → "homepage.hbs"
        // Preserve subdirectories: "templates/components/head.hbs" → "components/head.hbs"
        templateKey = pathParts.slice(1).join("/");
      }

      // Compile the theme file into the handlebars.templates hash
      templates[templateKey] = handlebars.compile(file.contents.toString());
    });

    const dataCollector = WebStreamUtils.createVinylCollector((file) => {
      // Process each individual JSON file
      let rawData = "";

      if (file.contents) {
        // A Vinyl file object will have a .contents property
        rawData = file.contents.toString();
      } else {
        // A non Vinyl file, e.g. result of a fetch() response, should be a vanilla buffer
        rawData = file.toString();
      }

      try {
        const fileData = JSON.parse(rawData);

        // Check if this file represents a URI (has uri and webProducerKey properties)
        if (fileData.uri && fileData.webProducerKey) {
          // Initialize uris object if it doesn't exist
          if (!data.uris) {
            data.uris = {};
          }

          // Add this URI to the uris collection, using the uri as the key
          data.uris[fileData.uri] = fileData;
        } else {
          // This is shared data (like site.json), merge it into the data object
          Object.assign(data, fileData);
        }
      } catch (error) {
        log("Unexpected condition: Valid JSON not found in file", file.path || "unknown", ":", rawData);
      }
    });

    // Pipe both streams to their respective collectors
    await Promise.all([
      WebStreamUtils.pipeStreams(dataStreamR, dataCollector.stream),
      WebStreamUtils.pipeStreams(themeStreamR, themeCollector.stream),
    ]);

    return { data, templates };
  }
}

export default TemplatePipeline;
