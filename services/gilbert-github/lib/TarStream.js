/**
 * @typedef {Object} TarEntry
 * @property {string} path - The file path within the archive
 * @property {Uint8Array} content - The file content as bytes
 * @property {number} size - The size of the file in bytes
 * @property {string} type - The type of entry ('file' or 'directory')
 * @property {string} originalPath - The original full path from the archive
 */

/**
 * @typedef {Object} TarHeader
 * @property {string} name - The name/path of the entry
 * @property {number} size - The size of the entry in bytes
 * @property {string} type - The type of entry
 */

/**
 * @typedef {Object} TransformStreamState
 * @property {Uint8Array} buffer - Buffer for accumulated data
 * @property {number} headerSize - Size of tar header (512 bytes)
 * @property {TarHeader|null} currentEntry - Currently processing entry
 * @property {number} bytesToRead - Remaining bytes to read for current entry
 * @property {Map<string, Uint8Array[]>} entryBuffers - Buffers for entry data chunks
 * @property {Object} paxHeaders - PAX headers that affect subsequent entries
 */

/**
 * @description Pure tar stream extraction utility using WinterCG web streams
 * @export
 * @class TarStream
 */
export default class TarStream {
  constructor() {}

  /**
   * Creates a TransformStream that extracts tar entries from a compressed stream
   * @returns {TransformStream<Uint8Array, TarEntry>} Stream of tar entries with {path, content, size, type} objects
   * @memberof TarStream
   */
  untar() {
    // Bind the parseHeader method to the current instance
    const parseHeader = this.parseHeader;

    // State for the transform stream.
    // We use a separate object for state because 'this' in a TransformStream's methods
    // refers to the stream's context, not the TarStream instance.
    const state = {
      buffer: new Uint8Array(0),
      headerSize: 512,
      currentEntry: null,
      bytesToRead: 0,
      entryBuffers: new Map(),
      paxHeaders: {}, // Object to store PAX headers that affect subsequent entries
    };

    return new TransformStream({
      /**
       * Initialize the transform stream with state
       * @this {TransformStreamState}
       */
      start() {
        // Initialize state on the TransformStream's context
        Object.assign(this, state);
      },

      /**
       * Transform incoming chunks into tar entries
       * @this {TransformStreamState}
       * @param {Uint8Array} chunk - Input chunk
       * @param {TransformStreamDefaultController<TarEntry>} controller - Stream controller
       */
      async transform(chunk, controller) {
        // const parseHeader = this.#parseHeader;
        // Concatenate new chunk with existing buffer
        const newBuffer = new Uint8Array(this.buffer.length + chunk.length);
        newBuffer.set(this.buffer);
        newBuffer.set(chunk, this.buffer.length);
        this.buffer = newBuffer;

        while (this.buffer.length > 0) {
          if (!this.currentEntry) {
            // Check for end of archive (two 512-byte blocks of nulls)
            if (this.buffer.length >= this.headerSize * 2) {
              const isEndOfArchive = this.buffer.slice(0, this.headerSize * 2).every((byte) => byte === 0);
              if (isEndOfArchive) {
                // Terminate the stream to signal the end of data
                controller.terminate();
                break;
              }
            }

            // Try to read header
            if (this.buffer.length < this.headerSize) {
              break; // Need more data
            }

            const header = parseHeader(this.buffer.slice(0, this.headerSize));
            this.buffer = this.buffer.slice(this.headerSize);

            // If the header name is empty and it's not the end, it's malformed.
            if (!header.name && header.type !== "end-of-archive") {
              controller.error(new Error("Malformed tar archive: Invalid header detected."));
              return;
            }

            this.currentEntry = header;
            this.bytesToRead = header.size;

            // Handle special entry types first
            if (this.currentEntry.type === "pax-global-header" || this.currentEntry.type === "pax-extended-header") {
              // Read the PAX header content
              // const toRead = Math.min(this.buffer.length, this.bytesToRead);

              // Uncomment the following line if access to the paxContent is ever required
              // const paxContent = new TextDecoder().decode(this.buffer.slice(0, toRead));

              // Skip the content and any padding
              const padding = (512 - (this.currentEntry.size % 512)) % 512;
              const skipSize = this.currentEntry.size + padding;
              if (this.buffer.length >= skipSize) {
                this.buffer = this.buffer.slice(skipSize);
              }

              // Reset for the next header
              this.currentEntry = null;
              continue;
            }

            // Skip directories and other non-file types that we don't need
            if (header.type === "directory" || header.type === "file") {
              this.currentEntry = header;
              // If the entry is a file, the `bytesToRead` is the size from the header
              this.bytesToRead = header.size;
            } else {
              // If it's another type, skip its content block
              const padding = (512 - (header.size % 512)) % 512;
              const skipSize = header.size + padding;
              if (this.buffer.length >= skipSize) {
                this.buffer = this.buffer.slice(skipSize);
              }
              this.currentEntry = null;
              continue;
            }

            // Handle 0-byte files immediately
            if (header.size === 0) {
              const finalPath = this.paxHeaders.path || header.name;
              const strippedPath = finalPath.substring(finalPath.indexOf("/") + 1);

              controller.enqueue({
                path: strippedPath,
                content: new Uint8Array(0),
                size: 0,
                type: header.type,
                originalPath: finalPath,
              });

              this.paxHeaders = {}; // Clear PAX headers after use
              this.currentEntry = null;
              continue;
            }
          }

          if (this.currentEntry && this.bytesToRead > 0) {
            const toRead = Math.min(this.buffer.length, this.bytesToRead);
            const data = this.buffer.slice(0, toRead);
            this.buffer = this.buffer.slice(toRead);
            this.bytesToRead -= toRead;

            // Store data chunk for current entry
            this.entryBuffers.set(this.currentEntry.name, this.entryBuffers.get(this.currentEntry.name) || []);
            this.entryBuffers.get(this.currentEntry.name).push(data);

            if (this.bytesToRead === 0) {
              // Entry complete, align to 512-byte boundary
              const padding = (512 - (this.currentEntry.size % 512)) % 512;
              if (this.buffer.length >= padding) {
                this.buffer = this.buffer.slice(padding);
              }

              // Combine all chunks for this entry
              const chunks = this.entryBuffers.get(this.currentEntry.name);
              const totalLength = chunks.reduce((sum, chunkData) => sum + chunkData.length, 0);
              const content = new Uint8Array(totalLength);
              let offset = 0;
              for (const chunkData of chunks) {
                content.set(chunkData, offset);
                offset += chunkData.length;
              }

              // Apply any stored PAX headers here before enqueuing
              const finalPath = this.paxHeaders.path || this.currentEntry.name;
              const strippedPath = finalPath.substring(finalPath.indexOf("/") + 1);

              controller.enqueue({
                path: strippedPath,
                content: content,
                size: this.currentEntry.size,
                type: this.currentEntry.type,
                originalPath: finalPath,
              });

              // Clean up
              this.entryBuffers.delete(this.currentEntry.name);
              this.paxHeaders = {}; // Clear PAX headers after use
              this.currentEntry = null;
            }
          }
        }
      },

      /**
       * Handle end of stream and cleanup
       * @this {TransformStreamState}
       * @param {TransformStreamDefaultController<TarEntry>} controller - Stream controller
       */
      flush(controller) {
        // Check for malformed or incomplete archives
        if (this.currentEntry) {
          controller.error(new Error(`Malformed tar archive: Stream ended with a partial entry for "${this.currentEntry.name}".`));
        } else if (this.buffer.length > 0) {
          controller.error(new Error("Malformed tar archive: Trailing data found."));
        }
        this.entryBuffers.clear();
      },
    });
  }

  /**
   * Parses a tar header from a 512-byte buffer
   * @param {Uint8Array} headerBuffer - The header buffer
   * @returns {TarHeader} Parsed header with name, size, and type
   * @memberof TarStream
   */
  parseHeader(headerBuffer) {
    // Check for end of archive (a block of nulls)
    if (headerBuffer.every((byte) => byte === 0)) {
      return { name: "", size: 0, type: "end-of-archive" };
    }

    const decoder = new TextDecoder("ascii");
    const name = decoder.decode(headerBuffer.slice(0, 100)).replace(/\0.*$/, "");
    const sizeStr = decoder.decode(headerBuffer.slice(124, 136)).replace(/\0.*$/, "");
    const typeFlag = headerBuffer[156];

    let type;
    switch (typeFlag) {
      case 53: // ASCII '5'
        type = "directory";
        break;
      case 103: // ASCII 'g'
        type = "pax-global-header";
        break;
      case 120: // ASCII 'x'
        type = "pax-extended-header";
        break;
      case 48: // ASCII '0' or a null byte
      default:
        type = "file";
        break;
    }

    return {
      name: name,
      size: parseInt(sizeStr, 8) || 0,
      type: type,
    };
  }
}
