// System dependencies

// Third party dependencies
import { build } from "esbuild";
import autoprefixer from "autoprefixer";
import postcss from "postcss";

// Project dependencies
import GilbertFile from "@tforster/gilbert-file";

/**
 * @description: A Gilbert pipeline that takes entry points and uses esbuild to bundle, optimize, and minify CSS files
 * @class StylesheetsPipeline
 */
export default class StylesheetsPipeline {
  // Private properties
  #entryPoints;
  #esbuildOptions;

  /**
   * Creates an instance of StylesheetsPipeline.
   * @param {string[]} entryPoints: Array of entry point paths relative to app root
   * @param {object} esbuildOptions: Optional esbuild configuration to override defaults
   * @memberof StylesheetsPipeline
   */
  constructor(entryPoints, esbuildOptions = {}) {
    this.#entryPoints = entryPoints || [];
    this.#esbuildOptions = esbuildOptions;
  }

  /**
   * @description: Processes CSS files through esbuild bundler for optimization
   * @return {Promise<ReadableStream>}: Web API ReadableStream of bundled files
   * @memberof StylesheetsPipeline
   */
  async getReadableStream() {
    const outputFiles = await this.#buildStylesheets();

    return new ReadableStream({
      start(controller) {
        // Process each output file from esbuild
        for (const outputFile of outputFiles) {
          // Extract just the filename from the ESBuild output path
          // ESBuild outputs with absolute paths like "/main.css", we want just "main.css"
          const filename = outputFile.path.replace(/^\//, "");

          // Create a GilbertFile object with virtual root cwd like Utils.vinyl() does
          const gilbertFile = new GilbertFile({
            cwd: "/", // Virtual root - matches Utils.vinyl() behavior
            path: filename, // Just the filename
            contents: Buffer.from(outputFile.contents),
          });

          // Enqueue the file to the stream
          controller.enqueue(gilbertFile);
        }

        // Close the stream
        controller.close();
      },
    });
  }

  /**
   * @description: Builds the minified stylesheet(s) using esbuild
   * @return {Promise<Array>}: Array of output files from esbuild
   * @memberof StylesheetsPipeline
   */
  async #buildStylesheets() {
    try {
      // Default esbuild configuration for CSS
      const defaultConfig = {
        entryPoints: this.#entryPoints,
        outdir: "/",
        bundle: true,
        sourcemap: true,
        target: ["es2020"], // CSS target for browser compatibility
        minify: true,
        write: false,
        metafile: true,
        loader: { ".eot": "file", ".ttf": "dataurl", ".woff": "file", ".svg": "file" },
      };

      // Merge with user-provided esbuild options
      const config = { ...defaultConfig, ...this.#esbuildOptions };

      // Ensure entryPoints and essential options aren't overridden incorrectly
      config.entryPoints = this.#entryPoints;
      config.write = false; // Always false for Web API streams

      const result = await build(config);

      // Process output files for autoprefixing if needed
      const processedFiles = [];
      for (const outputFile of result.outputFiles) {
        let contents = outputFile.contents;

        // Check for autoprefixing on CSS files
        if (outputFile.path.endsWith(".css") && this.#esbuildOptions?.autoprefixCss) {
          const autoprefixed = await this.#autoPrefix(outputFile.text);
          contents = Buffer.from(autoprefixed);
        }

        processedFiles.push({
          path: outputFile.path,
          contents,
        });
      }

      return processedFiles;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error in StylesheetsPipeline.js", err);
      throw err;
    }
  }

  /**
   * @description: Wrapper around the autoPrefix function from autoprefixer dependency. Also requires postcss dependency
   * @param {string} css: The css to be autoprefixed
   * @return {Promise<string>}: The autoprefixed css
   * @memberof StylesheetsPipeline
   */
  async #autoPrefix(css) {
    // Only require if we choose to enable auto prefixing
    const result = await postcss([autoprefixer]).process(css, { from: undefined });
    return result.css;
  }
}
