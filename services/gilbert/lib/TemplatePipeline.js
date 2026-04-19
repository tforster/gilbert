// Third party dependencies
import handlebars from "handlebars";
// import mime from "mime";
import GilbertFile from "@tforster/gilbert-file";

// Gilbert HTML minifier
import SimpleHtmlMinifier from "./SimpleHtmlMinifier.js";

// Gilbert logger for async performance
import { createLogger } from "@tforster/gilbert-logger";

// Web API Streams utilities
import WebStreamUtils from "./WebStreamUtils.js";

class TemplatePipeline {
  // Private properties
  /** @type {ReadableStream} */
  #readableDataStream;
  /** @type {ReadableStream[]} */
  #readableTemplatesStreams;
  #templates = {};
  #logger;

  /**
   * Creates an instance of TemplatePipeline.
   * @param {*} options
   * @param {ReadableStream} readableDataStream
   * @param {ReadableStream|ReadableStream[]} readableTemplatesStream - One or more template streams
   * @memberof TemplatePipeline
   */
  constructor(options, readableDataStream, readableTemplatesStream) {
    this.#readableDataStream = readableDataStream;
    this.#readableTemplatesStreams = Array.isArray(readableTemplatesStream) ? readableTemplatesStream : [readableTemplatesStream];
    // Enable debug logging when the GILBERT_DEBUG global is set (WinterCG-compatible)
    this.#logger = createLogger(globalThis.GILBERT_DEBUG === "true");
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
    const logger = this.#logger;

    const transformStream = new TransformStream({
      async transform(file, controller) {
        if (!file.contents) {
          return;
        }
        const uriContent = await file.toString();
        logger.debug(`Processing URI file: ${file.path}`);
        logger.debug(`URI content: ${uriContent}`);
        const uri = JSON.parse(uriContent);
        logger.debug(`Parsed URI:`, uri);
        const path = uri.uri;

        // Initialise an empty GilbertFile
        let gilbertFile = new GilbertFile({});

        if (uri.webProducerKey && uri.webProducerKey !== "redirect") {
          const templateKey = uri.webProducerKey + ".hbs";
          logger.debug(`Looking for template: ${templateKey}`);
          logger.debug(`Available templates:`, Object.keys(templates));
          const template = templates[templateKey];
          if (!template) {
            logger.debug(`Template not found for webProducerKey: ${uri.webProducerKey}`);
            return;
          }
          const generatedContents = template({ ...uri });
          logger.debug(`Generated content preview:`, generatedContents.substring(0, 100));
          gilbertFile = new GilbertFile({
            path,
            contents: new TextEncoder().encode(generatedContents),
            // contentType: mime.getType(path),
            cwd: "/", // Virtual root - matches Utils.vinyl() behaviour
          });
          if (gilbertFile.extname === "" || gilbertFile.extname === ".html") {
            // Use generatedContents directly — avoids decoding what we just encoded
            const minifiedHtml = SimpleHtmlMinifier.minify(generatedContents, {
              keep_closing_tags: false,
              keep_html_and_head_opening_tags: false,
              allow_removing_spaces_between_attributes: true,
              keep_comments: false,
              minify_css: true,
              minify_js: true,
            });

            gilbertFile.contents = new TextEncoder().encode(minifiedHtml);
            gilbertFile.contentType = "text/html";
          }
        } else if (uri.webProducerKey === "redirect") {
          gilbertFile = new GilbertFile({
            path,
            contents: new TextEncoder().encode(uri.targetAddress),
            redirect: 301,
            contentType: "text/html",
            cwd: "/", // Virtual root - matches Utils.vinyl() behaviour
          });
        } else {
          logger.debug(`Unexpected condition: page and webProducerKey not found. ${path}, ${uri}`);
          return;
        }
        controller.enqueue(gilbertFile);
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
    // Fan-out over all template streams concurrently. Load time = max(individual stream
    // durations), not their sum — a strict performance win for multi-source scenarios.
    await Promise.all(
      this.#readableTemplatesStreams.map((stream) => {
        const collector = WebStreamUtils.createFileCollector(async (file) => {
          // Use file.relative directly as the template key since GilbertFS base path handling
          // ensures the relative path is already correctly calculated from the base
          if (!file.isDirectory()) {
            const templateKey = file.relative;

            // Collision guard: reserve the slot synchronously before awaiting file content.
            // This prevents a race where two concurrent streams both pass the check before
            // either writes, which would silently produce non-deterministic last-wins behaviour.
            if (templateKey in this.#templates) {
              throw new Error(
                `Template collision: "${templateKey}" is defined in multiple template sources. Each template key must be unique across all sources.`
              );
            }
            this.#templates[templateKey] = null; // reserve slot

            // Get the content of the template
            const content = await file.toString();

            // Compile as a template (Gilbert's approach for 10 years)
            this.#templates[templateKey] = handlebars.compile(content);
          }
        });
        return stream.pipeTo(collector.stream);
      })
    );

    // Set partials to templates (Gilbert's 10-year tradition)
    // This allows templates to reference each other via {{> templateName }}
    // @ts-ignore
    handlebars.partials = this.#templates;
  }
}

export default TemplatePipeline;
