import { Readable } from "node:stream";
export default class WebStreamUtils {
  /**
   * @description Creates a Web API WritableStream that processes file objects into an array
   * @static
   * @param {*} processor
   * @return {*}
   * @memberof WebStreamUtils
   */
  static createFileCollector(processor) {
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
