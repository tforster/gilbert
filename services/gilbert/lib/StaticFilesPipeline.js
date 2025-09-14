/**
 * @description: A Gilbert pipeline that passes files from input to output stream without any modification.
 * Simple pass-through transform stream for static files.
 * @class StaticFilesPipeline
 */
class StaticFilesPipeline {
  /**
   * Creates an instance of StaticFilesPipeline.
   * @memberof StaticFilesPipeline
   */
  constructor() {
    // Create a Web API TransformStream for file processing
    this.transformStream = new TransformStream({
      transform: (file, controller) => {
        // Files are already GilbertFile objects with correct paths, just pass them through
        // GilbertFS.dest() uses file.relative for output path structure
        controller.enqueue(file);
      },
    });
  }
}

export default StaticFilesPipeline;
