// System dependencies

// Third party dependencies
import { build } from "esbuild";

// Project dependencies
import GilbertFile from "@tforster/gilbert-file";

/**
 * @description: A Gilbert pipeline that takes entrypoints and uses esbuild to bundle, tree-shake, and minify JavaScript files
 * @class ScriptsPipeline
 */
export default class ScriptsPipeline {
  // Private properties
  #entryPoints;
  #esbuildOptions;

  /**
   * Creates an instance of ScriptsPipeline.
   * @param {string[]} entryPoints: Array of entry point paths relative to app root
   * @param {object} esbuildOptions: Optional esbuild configuration to override defaults
   * @memberof ScriptsPipeline
   */
  constructor(entryPoints, esbuildOptions = {}) {
    this.#entryPoints = entryPoints || [];
    this.#esbuildOptions = esbuildOptions;
  }

  /**
   * @description: Processes JavaScript files through esbuild bundler for optimization
   * @return {Promise<ReadableStream>}: Web API ReadableStream of bundled files
   * @memberof ScriptsPipeline
   */
  async getReadableStream() {
    const outputFiles = await this.#buildScripts();

    return new ReadableStream({
      start(controller) {
        // Process each output file from esbuild
        for (const outputFile of outputFiles) {
          // Extract just the filename from the ESBuild output path
          // ESBuild outputs with absolute paths like "/main.js", we want just "main.js"
          const filename = outputFile.path.replace(/^\//, "");

          // Create a GilbertFile object matching TemplatePipeline pattern
          // Use virtual root cwd like Utils.vinyl() does
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
   * @description: Builds the minified JavaScript bundle(s) using esbuild
   * @return {Promise<Array>}: Array of output files from esbuild
   * @memberof ScriptsPipeline
   */
  async #buildScripts() {
    try {
      // Default esbuild configuration
      const defaultConfig = {
        entryPoints: this.#entryPoints,
        outdir: "/",
        bundle: true,
        sourcemap: true,
        target: ["esnext"], // Updated to esnext for latest features
        format: "iife",
        minify: true,
        write: false,
        metafile: true,
        treeShaking: true,
      };

      // Merge with user-provided esbuild options
      const config = { ...defaultConfig, ...this.#esbuildOptions };

      // Ensure entryPoints and essential options aren't overridden incorrectly
      config.entryPoints = this.#entryPoints;
      config.write = false; // Always false for Web API streams

      const result = await build(config);

      return result.outputFiles;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error in ScriptsPipeline.js", err);
      throw err;
    }
  }
}
