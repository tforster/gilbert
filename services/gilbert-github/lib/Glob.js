/**
 * A utility class for converting glob patterns to regular expressions and testing paths against them
 * @class Glob
 */
export default class Glob {
  /**
   * Creates a new Glob instance from a glob pattern
   * @param {string} glob - The glob pattern to compile into a regular expression
   * @memberof Glob
   */
  constructor(glob) {
    /**
     * The compiled regular expression from the glob pattern
     * @type {RegExp}
     * @memberof Glob
     */
    // Special case: "." should match everything (current directory contents)
    if (glob === ".") {
      this.regex = new RegExp("^.*$");
    } else {
      // Convert glob pattern to regex string
      const regexString = this.#globToRegex(glob);
      this.regex = new RegExp(`^${regexString}$`);
    }
  }

  /**
   * Converts a glob pattern to a regular expression string
   * @param {string} glob - The glob pattern to convert
   * @returns {string} A regular expression pattern string
   * @memberof Glob
   */
  #globToRegex(glob) {
    let result = "";
    let i = 0;

    // Handle leading slash specially - treat as optional
    if (glob.startsWith("/")) {
      i = 1; // Skip the leading slash
    }

    while (i < glob.length) {
      const char = glob[i];

      if (char === "*") {
        if (i + 1 < glob.length && glob[i + 1] === "*") {
          // Handle **
          if (i + 2 < glob.length && glob[i + 2] === "/") {
            // **/ - match any directory depth including zero directories
            if (i === 0 || (i === 1 && glob[0] === "/")) {
              // Leading **/ - make directory optional
              result += "(?:.*/)?";
            } else {
              // Middle **/ - match zero or more directories
              result += "(?:.*/)?";
            }
            i += 3; // Skip **/
          } else if (i + 2 === glob.length) {
            // ** at end - match everything remaining
            result += ".*";
            i += 2; // Skip **
          } else {
            // ** followed by non-slash - treat as globstar for everything
            result += ".*";
            i += 2; // Skip **
          }
        } else {
          // Single * - match anything except /
          result += "[^/]*";
          i += 1;
        }
      } else if (char === "?") {
        // ? matches any single character except /
        result += "[^/]";
        i += 1;
      } else {
        // Escape special regex characters
        if (".+^$[]\\(){}|-".includes(char)) {
          result += "\\" + char;
        } else {
          result += char;
        }
        i += 1;
      }
    }

    return result;
  }

  /**
   * Tests whether a given path matches the compiled glob pattern
   * @param {string} path - The file path to test against the glob pattern
   * @returns {boolean} True if the path matches the pattern, false otherwise
   * @memberof Glob
   */
  test(path) {
    return this.regex.test(path);
  }
}
