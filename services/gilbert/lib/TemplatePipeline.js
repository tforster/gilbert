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
        const uriContent = await file.toString();
        console.log(`DEBUG: Processing URI file: ${file.path}`);
        console.log(`DEBUG: URI content: ${uriContent}`);
        const uri = JSON.parse(uriContent);
        console.log(`DEBUG: Parsed URI:`, uri);
        const path = uri.uri;
        let vinylFile = {};
        if (uri.webProducerKey && uri.webProducerKey !== "redirect") {
          const templateKey = uri.webProducerKey + ".hbs";
          console.log(`DEBUG: Looking for template: ${templateKey}`);
          console.log(`DEBUG: Available templates:`, Object.keys(templates));
          const template = templates[templateKey];
          if (!template) {
            log(`Template not found for webProducerKey: ${uri.webProducerKey}`);
            return;
          }
          const generatedContents = template({ ...uri });
          console.log(`DEBUG: Generated content preview:`, generatedContents.substring(0, 100));
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
    // Create a collector function for processing Web API streams
    const collector = WebStreamUtils.createFileCollector(async (file) => {
      // Use file.relative directly as the template key since GilbertFS base path handling
      // ensures the relative path is already correctly calculated from the base
      if (!file.isDirectory()) {
        const templateKey = file.relative;

        // Get the content of the template
        const content = await file.toString();

        // Compile as a template (Gilbert's approach for 10 years)
        this.#templates[templateKey] = handlebars.compile(content);
      }
    });
    // Pipe the templates stream to the collector to load all templates into memory
    await this.#readableTemplatesStream.pipeTo(collector.stream);
  }
}

export default TemplatePipeline;
