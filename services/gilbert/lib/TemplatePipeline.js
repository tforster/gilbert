// Third party dependencies
import handlebars from "handlebars";
import { minify as htmlMinify } from "html-minifier";
import { log, vinyl } from "./Utils.js";
import mime from "mime";

// Web API Streams utilities
import WebStreamUtils from "./WebStreamUtils.js";

// TODO: 1. Expect dataStream to be type object of individual URI objects;
// TODO: 2. Wait for themeStream to complete loading to memory and THEN pipe dataStream to themeStream

class TemplatePipeline {
  // Private properties
  /** @type {ReadableStream} */
  #readableDataStream;
  /** @type {ReadableStream} */
  #readableTemplatesStream;
  #templates = {};

  /**
   * Creates an instance of TemplatePipeline.
   * @param {*} options
   * @param {*} readableDataStream
   * @param {*} readableTemplatesStream
   * @memberof TemplatePipeline
   */
  constructor(options, readableDataStream, readableTemplatesStream) {
    this.#readableDataStream = readableDataStream;
    this.#readableTemplatesStream = readableTemplatesStream;
  }

  /**
   * @description: -
   *   - Data is a stream of one or more JSON files where each file implements a URI object with at least uri and webProducerKey
   * properties.
   *  - Templates is an array of one or more Handlebars (.hbs) files where each file name matches a webProducerKey value in the
   * data.
   * - Each URI object is processed in turn, applying the matching Handlebars template to generate a final HTML file.
   * - Critical: All templates must be loaded into memory before processing any data URIs.
   * @return {Promise<void>}:
   * @memberof TemplatePipeline
   */
  async build() {
    await this.#loadTemplates();

    const templates = this.#templates;

    const transformStream = new TransformStream({
      async transform(file, controller) {
        if (!file.contents) {
          return;
        }
        const uri = JSON.parse(new TextDecoder().decode(file.contents));
        const path = uri.uri;
        let vinylFile = {};
        if (uri.webProducerKey && uri.webProducerKey !== "redirect") {
          const template = templates[uri.webProducerKey + ".hbs"];
          if (!template) {
            log(`Template not found for webProducerKey: ${uri.webProducerKey}`);
            return;
          }
          const generatedContents = template({ ...uri });
          vinylFile = vinyl({
            path,
            contents: Buffer.from(generatedContents),
            contentType: mime.getType(path),
          });
          if (vinylFile.extname === "" || vinylFile.extname === ".html") {
            vinylFile.contents = Buffer.from(
              htmlMinify(vinylFile.contents.toString(), {
                collapseWhitespace: true,
                removeComments: true,
                minifyCSS: true,
                minifyJS: true,
              })
            );
            vinylFile.contentType = "text/html";
          }
        } else if (uri.webProducerKey === "redirect") {
          vinylFile = vinyl({
            path,
            contents: Buffer.from(uri.targetAddress),
            redirect: 301,
            contentType: "text/html",
          });
        } else {
          log(`Unexpected condition: page and webProducerKey not found. ${path}, ${uri}`);
          return;
        }
        controller.enqueue(vinylFile);
      },
    });

    // Assign the readable side of the transform stream as the output
    this.stream = this.#readableDataStream.pipeThrough(transformStream);
  }

  /**
   * @description
   * @date 2025-09-06
   * @typedef {File} file
   * @memberof TemplatePipeline
   */
  async #loadTemplates() {
    console.log("DEBUG: loadTemplates starting");

    // Create a collector function for processing Web API streams
    const collector = WebStreamUtils.createFileCollector((file) => {
      // Strip the parent folder (templates/, theme/, etc.) from file.relative
      // to give developers control over folder naming while maintaining consistent lookup
      if (!file.isDirectory()) {
        let templateKey = file.relative;

        // Remove the first path segment (parent folder) to get the actual template key
        const pathParts = templateKey.split("/");
        if (pathParts.length > 1) {
          // Remove first segment: "templates/homepage.hbs" → "homepage.hbs"
          // Preserve subdirectories: "templates/components/head.hbs" → "components/head.hbs"
          templateKey = pathParts.slice(1).join("/");
        }

        // Compile the theme file into the handlebars.templates hash
        this.#templates[templateKey] = handlebars.compile(file.contents.toString());
      }
    });
    // Pipe the templates stream to the collector to load all templates into memory
    await this.#readableTemplatesStream.pipeTo(collector.stream);
  }
}

export default TemplatePipeline;
