// Third-party imports
import mime from "mime";

// Constants
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

// Web API native path utilities
const webPath = {
  resolve(...paths) {
    // Convert relative paths to absolute using URL constructor
    const base = paths[0].startsWith("/") ? `file://${paths[0]}` : `file://${globalThis.process?.cwd?.() || "/"}/${paths[0]}`;
    let url = new URL(base);

    for (let i = 1; i < paths.length; i++) {
      if (paths[i].startsWith("/")) {
        url = new URL(`file://${paths[i]}`);
      } else {
        url = new URL(paths[i], url);
      }
    }

    return url.pathname;
  },

  relative(from, to) {
    const fromParts = from.split("/").filter(Boolean);
    const toParts = to.split("/").filter(Boolean);

    // Find common base
    let commonLength = 0;
    while (commonLength < fromParts.length && commonLength < toParts.length && fromParts[commonLength] === toParts[commonLength]) {
      commonLength++;
    }

    // Build relative path
    const upLevels = fromParts.length - commonLength;
    const downPath = toParts.slice(commonLength);

    return "../".repeat(upLevels) + downPath.join("/");
  },

  extname(filePath) {
    const lastDot = filePath.lastIndexOf(".");
    const lastSlash = filePath.lastIndexOf("/");
    return lastDot > lastSlash ? filePath.slice(lastDot) : "";
  },

  basename(filePath, ext = "") {
    const lastSlash = filePath.lastIndexOf("/");
    const name = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
    return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
  },

  dirname(filePath) {
    const lastSlash = filePath.lastIndexOf("/");
    return lastSlash > 0 ? filePath.slice(0, lastSlash) : lastSlash === 0 ? "/" : ".";
  },
};

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
  #symlink = null;
  #isDirectory = false;

  /**
   * Creates an instance of GilbertFile.
   * @param {Object} [options] - Configuration options for the file
   * @param {string} [options.base] - The base directory for relative path calculations
   * @param {string} [options.cwd] - The current working directory
   * @param {string} [options.path] - The file path
   * @param {Uint8Array|ReadableStream|null} [options.contents] - The file contents
   * @param {Object} [options.stat] - File system stats object
   * @memberof GilbertFile
   */
  constructor(options = {}) {
    // Merge default options with provided options
    options = { ...{ base: null, cwd: null, path: null, contents: null, stat: {} }, ...options };

    // Check path is a string if provided
    if (options.path !== null && typeof options.path !== "string") {
      throw new Error("Path must be a string or null.");
    }

    // Initialise private fields
    this.#cwd = options.cwd || globalThis.process?.cwd?.() || "/";
    this.#base = webPath.resolve(this.#cwd, options.base || this.#cwd);

    // Resolve path if it's a string, otherwise use options.path (e.g., null)
    this.#path = typeof options.path === "string" ? webPath.resolve(this.#cwd, options.path) : options.path;
    this.#stat = options.stat;

    // Initialize contents (uses the setter)
    this.contents = options.content;
    this.#isDirectory = options.type === "directory";
    this.size = options.size || (this.isBuffer() ? this.contents.length : this.isStream() ? null : 0);
    // Initialize MIME type (Uses the setter)
    this.contentType = mime.getType(this.path) || DEFAULT_CONTENT_TYPE;

    // Set Vinyl compatibility
    this._isVinyl = true;
    this._symlink = this.symlink;
    this._cwd = this.cwd;
    this._contents = this.contents;
    this.#history = [this.#path];
  }

  /**
   * @description Gets the current working directory.
   * @return {string}
   * @memberof GilbertFile
   */
  get cwd() {
    return this.#cwd;
  }

  /**
   * @description Sets the current working directory.
   * @param {string} val  The new current working directory to set.
   * @memberof GilbertFile
   */
  set cwd(val) {
    if (typeof val !== "string") {
      throw new Error("CWD must be a string.");
    }

    // Update base and path based on new cwd
    this.#base = webPath.resolve(val, this.#base);
    if (this.#path) {
      this.#path = webPath.relative(val, this.#path);
    }

    this.#cwd = val;
  }

  /**
   * @description Gets the absolute path of the file.
   * @return {string}
   * @memberof GilbertFile
   */
  get path() {
    return this.#path;
  }

  /**
   * @description Sets the absolute path of the file.
   * @param {string} val  The absolute path to set.
   * @memberof GilbertFile
   */
  set path(val) {
    if (typeof val !== "string") {
      throw new Error("Path must be a string.");
    }

    this.#path = webPath.resolve(this.#cwd, val);

    // The history getter is used by VinylFs
    this.#history = [this.#path];
  }

  /**
   * @description Gets the base directory for relative path calculations.
   * @return {string}
   * @memberof GilbertFile
   */
  get base() {
    return this.#base;
  }

  /**
   * @description Sets the base directory for relative path calculations.
   * @param {string} val  The base directory to set.
   * @memberof GilbertFile
   */
  set base(val) {
    if (typeof val !== "string") {
      throw new Error("Base must be a string.");
    }
    if (val !== this.#cwd) {
      this.#base = val;
    } else {
      this.#base = null;
    }
  }

  /**
   * @description Gets the symlink for the file
   * @return {string}
   * @memberof GilbertFile
   */
  get symlink() {
    return this.#symlink;
  }

  /**
   * @description Gets the history of paths for the file.
   * @return {string[]}
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get history() {
    return this.#history;
  }

  /**
   * @description Gets the contents of the file (Uint8Array, ReadableStream, or null).
   * @return {Uint8Array|ReadableStream|null}
   * @memberof GilbertFile
   */
  get contents() {
    return this.#contents;
  }

  /**
   * @description Sets the contents of the file (Uint8Array, ReadableStream, or null). Used by the constructor.
   * @param {Uint8Array|ReadableStream|null} newContents  The new contents to set.
   * @memberof GilbertFile
   */
  set contents(newContents) {
    if (newContents !== null && !(newContents instanceof Uint8Array) && typeof newContents.getReader !== "function") {
      throw new Error("Contents must be a Uint8Array, a ReadableStream, or null.");
    }
    this.#contents = newContents;

    // Determine #contentKind based on newContents
    if (newContents instanceof Uint8Array) {
      this.#contentKind = "buffer";
    } else if (newContents && typeof newContents.getReader === "function") {
      this.#contentKind = "stream";
    } else if (newContents === null) {
      this.#contentKind = "null";
    } else {
      this.#contentKind = "unknown";
    }
  }

  /**
   * @description Gets the file extension.
   * @return {string}
   * @vinylCompatibility
   * @readonly
   * @memberof GilbertFile
   */
  get extname() {
    return webPath.extname(this.path);
  }

  /**
   * @description Gets the MIME type of the file.
   * @return {string}
   * @memberof GilbertFile
   */
  get contentType() {
    return this.#contentType;
  }

  /**
   * @description Sets the MIME type of the file
   * @param {string} val  The MIME type to set.
   * @memberof GilbertFile
   */
  set contentType(val) {
    this.#contentType = val;
  }

  /**
   * @description Gets the relative path of the file from the base directory.
   * @return {string}
   * @memberof GilbertFile
   */
  get relative() {
    return webPath.relative(this.#base, this.path);
  }

  /**
   * @description Gets the stem (filename without suffix) of file.path.
   * @readonly
   * @memberof GilbertFile
   */
  get stem() {
    return webPath.basename(this.path, this.extname);
  }

  /**
   * @description Gets the directory name of file.path.
   * @readonly
   * @memberof GilbertFile
   */
  get dirname() {
    return webPath.dirname(this.path);
  }

  /**
   * @description
   * @readonly
   * @memberof GilbertFile
   */
  get basename() {
    return webPath.basename(this.path);
  }

  /**
   * @description Gets the fs.Stats-like object for the file.
   * This is typically null unless explicitly set or provided in the constructor.
   * @memberof GilbertFile
   */
  get stat() {
    return this.#stat;
  }

  /**
   * @description Sets the fs.Stats-like object for the file.
   * @memberof GilbertFile
   */
  set stat(newStat) {
    this.#stat = newStat;
  }

  /**
   * @description Checks if the contents are a Uint8Array.
   * @return {boolean}
   * @memberof GilbertFile
   */
  isBuffer() {
    return this.#contentKind === "buffer";
  }

  /**
   * @description Checks if the contents are a ReadableStream.
   * @return {boolean}
   * @memberof GilbertFile
   */
  isStream() {
    return this.#contentKind === "stream";
  }

  /**
   * @description Checks if the contents are null.
   * @return {boolean}
   * @memberof GilbertFile
   */
  isNull() {
    return this.#contentKind === "null";
  }

  /**
   * @description Checks if the GilbertFile object represents a directory.
   * @vinylCompatibility
   * @return {boolean}
   * @memberof GilbertFile
   */
  isDirectory() {
    return this.#isDirectory;
  }

  /**
   * @description Checks if the GilbertFile object represents a regular file.
   * @vinylCompatibility
   * @return {boolean}
   * @memberof GilbertFile
   */
  isFile() {
    return !this.isDirectory() && !this.isSymbolic();
  }

  /**
   * @description Checks if the GilbertFile object represents a symbolic link.
   * Mimics Vinyl's behavior based on README:
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
}
