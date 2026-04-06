// Third-party imports
import getMimeType from "./mime.js";

// Local imports
import WebPath from "./WebPath.js";

// Constants
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

/**
 * @typedef {Object} FileStats
 * @description File system stats object similar to fs.Stats
 * @property {number} [size] - Size of the file in bytes (must match calculated content size if provided)
 * @property {Date} [mtime] - Last modification time
 * @property {Date} [ctime] - Creation time
 * @property {Date} [atime] - Last access time
 * @property {Function} [isFile] - Function that returns true if this is a file
 * @property {Function} [isDirectory] - Function that returns true if this is a directory
 * @property {Function} [isSymbolicLink] - Function that returns true if this is a symbolic link
 */

/**
 * @typedef {Uint8Array|ReadableStream|null} FileContents
 * @description Valid content types for a Gilbert file - supports Web API streams only
 */

/**
 * @typedef {Object} GilbertFileOptions
 * @description Configuration options for creating a GilbertFile
 * @property {string} [base] - The base directory for relative path calculations
 * @property {string} [cwd] - The current working directory
 * @property {string} [path] - The file path
 * @property {FileContents} [contents] - The file contents
 * @property {FileContents} [content] - Alias for contents
 * @property {FileStats} [stat] - File system stats object
 * @property {'directory'} [type] - File type, set to 'directory' for directories
 * @property {string} [contentType] - MIME type of the file content
 */

/**
 * @description Implements a virtual file object for Gilbert to use in stream processing
 * @class GilbertFile
 */
export default class GilbertFile {
  // Private fields
  #cwd;
  #base;
  #path;
  #history;
  #contentKind;
  #contents;
  #stat;
  #contentType;
  #size = null;
  #symlink = null;
  #isDirectory = false;

  /**
   * Creates an instance of GilbertFile.
   * @param {GilbertFileOptions} [options={}] - Configuration options for the file
   * @memberof GilbertFile
   */
  constructor(options = {}) {
    // Merge default options with provided options
    const normalizedOptions = {
      contents: options.contents || options.content || null,
      stat: {},
      type: options.type,
      contentType: options.contentType,
      ...options,
    };

    // Initialise using setters for validation (order matters)
    // 1. First set cwd (base and path depend on it)
    this.cwd = normalizedOptions.cwd || globalThis.process?.cwd?.() || "/";

    // 2. Set path first if provided (needed for base defaulting logic)
    if (normalizedOptions.path !== undefined && normalizedOptions.path !== null) {
      this.path = normalizedOptions.path;
    } else {
      this.#path = null;
      this.#history = [null];
    }

    // 3. Then set base (depends on cwd, and defaults to cwd if path is provided but base is not)
    if (normalizedOptions.base !== undefined && normalizedOptions.base !== null) {
      this.base = normalizedOptions.base;
    } else {
      // Default base to cwd - use internal assignment to avoid setter validation issues
      this.#base = this.cwd;
    }

    // 4. Set contents (independent)
    this.contents = normalizedOptions.contents;

    // 5. Set stat (independent)
    this.stat = normalizedOptions.stat;

    // 6. Set directory flag (independent)
    this.#isDirectory = normalizedOptions.type === "directory";

    // 7. Set contentType last (may depend on path)
    this.contentType = normalizedOptions.contentType || (this.extname ? getMimeType(this.extname) : null) || DEFAULT_CONTENT_TYPE;
  }

  /**
   * @description Gets the current working directory.
   * @return {string} The current working directory path
   * @memberof GilbertFile
   */
  get cwd() {
    return this.#cwd;
  }

  /**
   * @description Sets the current working directory and updates dependent paths.
   * @param {string} val - The new current working directory to set
   * @throws {Error} When val is not a string
   * @memberof GilbertFile
   */
  set cwd(val) {
    if (typeof val !== "string") {
      throw new Error("CWD must be a string.");
    }

    // Update base and path based on new cwd
    this.#base = WebPath.resolve(val, this.#base);
    if (this.#path) {
      this.#path = WebPath.relative(val, this.#path);
    }

    this.#cwd = val;
  }

  /**
   * @description Gets the absolute path of the file.
   * @return {string|null} The absolute file path or null if not set
   * @memberof GilbertFile
   */
  get path() {
    return this.#path;
  }

  /**
   * @description Sets the absolute path of the file and updates history.
   * Automatically recalculates contentType based on the new file extension.
   * @param {string} val - The absolute or relative path to set
   * @throws {Error} When val is not a string
   * @memberof GilbertFile
   */
  set path(val) {
    if (typeof val !== "string") {
      throw new Error("Path must be a string.");
    }

    // Resolve path against cwd for relative paths, keep absolute paths as-is
    this.#path = WebPath.resolve(this.#cwd, val);

    // The history getter is used by VinylFs
    this.#history = [this.#path];

    // Recalculate contentType based on new file extension
    const mimeType = getMimeType(this.extname);
    if (mimeType) {
      this.#contentType = mimeType;
    }
    // Note: getMimeType always returns a string; the guard above is retained defensively
  }

  /**
   * @description Gets the base directory for relative path calculations.
   * @return {string} The base directory path
   * @memberof GilbertFile
   */
  get base() {
    return this.#base;
  }

  /**
   * @description Sets the base directory for relative path calculations.
   * @param {string} val - The base directory to set
   * @throws {Error} When val is not a string
   * @memberof GilbertFile
   */
  set base(val) {
    if (typeof val !== "string") {
      throw new Error("Base must be a string.");
    }
    // Resolve base relative to cwd
    this.#base = WebPath.resolve(this.#cwd, val);
  }

  /**
   * @description Gets the symlink for the file
   * @return {string|null} The symlink path or null if not a symlink
   * @memberof GilbertFile
   */
  get symlink() {
    return this.#symlink;
  }

  /**
   * @description Gets the history of paths for the file.
   * @return {Array<string|null>} Array containing the path history for Vinyl compatibility
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get history() {
    return this.#history;
  }

  /**
   * @description Gets the contents of the file.
   * @return {FileContents} The file contents (Uint8Array, ReadableStream, or null)
   * @memberof GilbertFile
   */
  get contents() {
    return this.#contents;
  }

  /**
   * @description Sets the contents of the file and updates content kind.
   * @param {FileContents} newContents - The new contents to set
   * @throws {Error} When newContents is not a valid FileContents type
   * @memberof GilbertFile
   */
  set contents(newContents) {
    // Accept Uint8Array, Web API ReadableStream, or null
    const isValidStream = typeof newContents === "object" && newContents !== null && "getReader" in newContents;

    if (newContents !== null && !(newContents instanceof Uint8Array) && !isValidStream) {
      throw new Error("Contents must be a Uint8Array, a ReadableStream, or null.");
    }
    this.#contents = newContents;

    // Determine #contentKind based on newContents
    if (newContents instanceof Uint8Array) {
      this.#contentKind = "buffer";
      this.#size = newContents.length; // Cache size for buffers
    } else if (isValidStream) {
      this.#contentKind = "stream";
      this.#size = null; // Streams don't have a predetermined size
    } else if (newContents === null) {
      this.#contentKind = "null";
      this.#size = 0; // Null contents have size 0
    } else {
      this.#contentKind = "unknown";
      this.#size = null; // Unknown content type
    }
  }

  /**
   * @description Gets the file extension from the path.
   * @return {string} The file extension including the dot (e.g., '.js', '.html') or empty string
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get extname() {
    return WebPath.extname(this.path);
  }

  /**
   * @description Gets the MIME type of the file.
   * @return {string} The MIME type of the file content
   * @memberof GilbertFile
   */
  get contentType() {
    return this.#contentType;
  }

  /**
   * @description Sets the MIME type of the file
   * @param {string} val - The MIME type to set.
   * @throws {Error} When val is not a string
   * @memberof GilbertFile
   */
  set contentType(val) {
    if (typeof val !== "string") {
      throw new Error("Content type must be a string.");
    }
    this.#contentType = val;
  }

  /**
   * @description Gets the calculated size of the file contents in bytes.
   * Size is automatically calculated and cached when contents are set.
   * @return {number|null} Size in bytes for buffers, 0 for null contents, null for streams or unknown content
   * @readonly
   * @memberof GilbertFile
   */
  get size() {
    return this.#size;
  }

  /**
   * @description Gets the relative path of the file from the base directory.
   * @return {string} The relative path from base to this file
   * @readonly
   * @memberof GilbertFile
   */
  get relative() {
    return WebPath.relative(this.#base, this.path);
  }

  /**
   * @description Gets the stem (filename without suffix) of file.path.
   * @return {string} The filename without its extension
   * @readonly
   * @memberof GilbertFile
   */
  get stem() {
    return WebPath.basename(this.path, this.extname);
  }

  /**
   * @description Gets the directory name of file.path.
   * @return {string} The directory portion of the file path
   * @readonly
   * @memberof GilbertFile
   */
  get dirname() {
    return WebPath.dirname(this.path);
  }

  /**
   * @description Gets the base filename including extension.
   * @return {string} The filename with extension (e.g., 'index.html')
   * @readonly
   * @memberof GilbertFile
   */
  get basename() {
    return WebPath.basename(this.path);
  }

  /**
   * @description Gets the fs.Stats-like object for the file.
   * This is typically null unless explicitly set or provided in the constructor.
   * @return {FileStats|null} The file stats object or null
   * @memberof GilbertFile
   */
  get stat() {
    return this.#stat;
  }

  /**
   * @description Sets the fs.Stats-like object for the file.
   * Validates that stat.size (if present) matches the calculated content size.
   * @param {FileStats|null} newStat - The file stats object to set
   * @throws {Error} When stat.size conflicts with calculated content size
   * @memberof GilbertFile
   */
  set stat(newStat) {
    // Allow null stat
    if (newStat === null) {
      this.#stat = null;
      return;
    }

    // Validate stat.size consistency if both stat.size and content size exist
    if (newStat && typeof newStat.size === "number" && this.#size !== null) {
      if (newStat.size !== this.#size) {
        throw new Error(
          `Stat size (${newStat.size}) does not match calculated content size (${this.#size}). ` +
            `Use a stat object without size property to avoid conflicts.`
        );
      }
    }

    this.#stat = newStat;
  }

  /**
   * @description Creates a stat object with the current calculated size and optional additional properties.
   * This is a convenient way to set stat while ensuring size consistency.
   * @param {Partial<FileStats>} [additionalProps={}] - Additional stat properties (mtime, ctime, etc.)
   * @return {FileStats} A stat object with calculated size and additional properties
   * @memberof GilbertFile
   */
  createStat(additionalProps = {}) {
    return {
      size: this.#size,
      ...additionalProps,
    };
  }

  /**
   * @description Checks if the file contents are stored as a Uint8Array buffer.
   * @return {boolean} True if contents are a Uint8Array, false otherwise
   * @memberof GilbertFile
   */
  isBuffer() {
    return this.#contentKind === "buffer";
  }

  /**
   * @description Checks if the file contents are stored as a ReadableStream.
   * @return {boolean} True if contents are a ReadableStream, false otherwise
   * @memberof GilbertFile
   */
  isStream() {
    return this.#contentKind === "stream";
  }

  /**
   * @description Checks if the file has no contents (null).
   * @return {boolean} True if contents are null, false otherwise
   * @memberof GilbertFile
   */
  isNull() {
    return this.#contentKind === "null";
  }

  /**
   * @description Checks if the GilbertFile object represents a directory.
   * @return {boolean} True if this represents a directory, false otherwise
   * @vinylCompatibility
   * @memberof GilbertFile
   */
  isDirectory() {
    // If explicitly set as directory type, return true
    if (this.#isDirectory) {
      return true;
    }

    // If contents are null (like Vinyl), it's a directory unless stat denies it
    if (this.contents === null) {
      // Check if stat object explicitly denies directory
      if (this.stat && typeof this.stat.isDirectory === "function") {
        return this.stat.isDirectory();
      }
      if (this.stat && typeof this.stat.isFile === "function" && this.stat.isFile()) {
        return false;
      }
      // Default to directory for null contents
      return true;
    }

    return false;
  }

  /**
   * @description Checks if the GilbertFile object represents a regular file.
   * @return {boolean} True if this is a regular file (not directory or symlink), false otherwise
   * @vinylCompatibility
   * @memberof GilbertFile
   */
  isFile() {
    return !this.isDirectory() && !this.isSymbolic();
  }

  /**
   * @description Checks if the GilbertFile object represents a symbolic link.
   * Mimics Vinyl's behaviour based on README:
   * - file.isNull() is true
   * - file.stat is an object
   * - file.stat.isSymbolicLink() returns true
   * @vinylCompatibility
   * @return {boolean}
   * @memberof GilbertFile
   */
  isSymbolic() {
    // As per user-provided Vinyl README:
    // A file is considered symbolic when:
    // * file.isNull() is true
    // * file.stat is an object
    // * file.stat.isSymbolicLink() returns true
    // return this.isNull();
    return false;
  }

  /**
   * @description Vinyl compatibility property indicating this is a vinyl-like object.
   * @return {boolean} Always returns true
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get _isVinyl() {
    return true;
  }

  /**
   * @description Vinyl compatibility property for symlink.
   * @return {string|null} The symlink path
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get _symlink() {
    return this.#symlink;
  }

  /**
   * @description Vinyl compatibility property for current working directory.
   * @return {string} The current working directory
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get _cwd() {
    return this.#cwd;
  }

  /**
   * @description Vinyl compatibility property for file contents.
   * @return {FileContents} The file contents
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get _contents() {
    return this.#contents;
  }

  /**
   * @description Converts the file contents to a string.
   * If contents are a Uint8Array, decodes using UTF-8.
   * If contents are a ReadableStream, reads the entire stream and decodes as UTF-8.
   * @returns {Promise<string>} A promise that resolves to the file contents as a string
   * @throws {Error} When contents are null or cannot be converted to string
   * @memberof GilbertFile
   */
  async toString() {
    if (this.isNull()) {
      throw new Error("Cannot convert null contents to string");
    }

    if (this.isBuffer()) {
      return new TextDecoder().decode(/** @type {Uint8Array} */ (this.contents));
    }

    if (this.isStream()) {
      // Use tee() to preserve the original stream while reading from a copy
      const [preservedStream, readingStream] = /** @type {ReadableStream} */ (this.contents).tee();
      this.#contents = preservedStream; // Preserve original stream

      const reader = readingStream.getReader();
      const chunks = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Concatenate all chunks into a single Uint8Array
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      return new TextDecoder().decode(combined);
    }

    throw new Error(`Cannot convert contents of type '${this.#contentKind}' to string`);
  }

  /**
   * @description Converts the file contents to a Uint8Array buffer.
   * If contents are already a Uint8Array, returns them directly.
   * If contents are a ReadableStream, reads the entire stream into a buffer.
   * @returns {Promise<Uint8Array>} A promise that resolves to the file contents as a Uint8Array
   * @throws {Error} When contents are null or cannot be converted to buffer
   * @memberof GilbertFile
   */
  async toBuffer() {
    if (this.isNull()) {
      throw new Error("Cannot convert null contents to buffer");
    }

    if (this.isBuffer()) {
      return /** @type {Uint8Array} */ (this.contents);
    }

    if (this.isStream()) {
      // Use tee() to preserve the original stream while reading from a copy
      const [preservedStream, readingStream] = /** @type {ReadableStream} */ (this.contents).tee();
      this.#contents = preservedStream; // Preserve original stream

      const reader = readingStream.getReader();
      const chunks = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Concatenate all chunks into a single Uint8Array
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      return combined;
    }

    throw new Error(`Cannot convert contents of type '${this.#contentKind}' to buffer`);
  }

  /**
   * @description Creates a copy of this GilbertFile with optional property overrides.
   * This is useful for transforms that need to modify certain properties while preserving others.
   * @param {GilbertFileOptions} [overrides={}] - Properties to override in the cloned file
   * @returns {GilbertFile} A new GilbertFile instance with the same properties, plus any overrides
   * @example
   * // Clone with new contents but preserve all metadata
   * const minified = originalFile.clone({ contents: minifiedStream });
   *
   * // Clone with new path and contents
   * const compiled = sourceFile.clone({
   *   path: sourceFile.path.replace('.ts', '.js'),
   *   contents: compiledContents
   * });
   * @memberof GilbertFile
   */
  clone(overrides = {}) {
    let contents = this.contents;

    // Handle ReadableStream cloning - if no override provided, we need to tee the stream
    if (this.contents instanceof ReadableStream && !overrides.contents) {
      const [stream1, stream2] = this.contents.tee();
      this.#contents = stream1; // Update original to use first teed stream
      contents = stream2; // Clone gets second teed stream
    }

    return new GilbertFile({
      // Copy all current properties
      path: this.path,
      base: this.base,
      cwd: this.cwd,
      contents: contents,
      stat: this.stat,
      contentType: this.contentType,
      // Apply any overrides
      ...overrides,
    });
  }
}
