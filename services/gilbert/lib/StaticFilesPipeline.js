// Project dependencies
import { vinyl } from "./Utils.js";

/**
 * @description: A Gilbert pipeline that passes file from input to output stream without any modification.
 * @class StaticFilesPipeline
 */
class StaticFilesPipeline {
  // Private properties
  #options;

  /**
   * Creates an instance of StaticFilesPipeline.
   * @param {object} options: Hash of runtime options
   * @memberof StaticFilesPipeline
   */
  constructor(options) {
    this.#options = options;

    // Create a Web API TransformStream for file processing
    this.transformStream = new TransformStream({
      transform: (file, controller) => {
        // Just change the absolute project source path to the preferred virtual output path
        const v = vinyl({
          path: `${file.path.replace(this.#options.relativeRoot, "")}`,
          contents: file.contents,
        });

        controller.enqueue(v);
      },
    });

    // Don't return the stream - keep it as a property
  }
}

export default StaticFilesPipeline;
