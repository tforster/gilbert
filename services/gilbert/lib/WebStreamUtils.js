// WebStreamUtils.js — Web API stream utility helpers for Gilbert
//
// WinterCG-compliant. No Node.js built-in imports.
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
        async write(chunk) {
          chunks.push(chunk);
          if (processor) {
            await processor(chunk);
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
    // TODO: Deprecate this in favour of using the stream's promises e.g., closed for WritableStream, locked for ReadableStream)
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
}
