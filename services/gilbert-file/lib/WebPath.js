/**
 * @fileoverview Web API-compatible path manipulation utilities
 * @description Runtime-agnostic path utilities that work in Node.js, Bun, Deno, and Cloudflare Workers
 */

/**
 * @class WebPath
 * @description Web API-compatible path manipulation utilities for runtime-agnostic environments
 */
export default class WebPath {
  /**
   * @description Resolves a sequence of paths into an absolute path
   * @param {...string} paths - Path segments to resolve
   * @return {string} The resolved absolute path
   * @static
   */
  static resolve(...paths) {
    // Filter out null/undefined paths and ensure we have at least one valid path
    const validPaths = paths.filter((p) => p != null && typeof p === "string");
    if (validPaths.length === 0) {
      return globalThis.process?.cwd?.() || "/";
    }

    // Start with first path - if relative, resolve against process.cwd()
    let resolved = validPaths[0];
    if (!resolved.startsWith("/")) {
      resolved = `${globalThis.process?.cwd?.() || "/"}/${resolved}`;
    }

    // Process remaining paths
    for (let i = 1; i < validPaths.length; i++) {
      const segment = validPaths[i];
      if (segment.startsWith("/")) {
        // Absolute path - replace current resolved path
        resolved = segment;
      } else {
        // Relative path - append to current resolved path
        resolved = `${resolved}/${segment}`;
      }
    }

    // Clean up the path (remove double slashes, resolve . and ..)
    return this.normalize(resolved);
  }

  /**
   * @description Normalizes a path, resolving '..' and '.' segments
   * @param {string} path - The path to normalize
   * @return {string} The normalized path
   * @static
   */
  static normalize(path) {
    if (!path) return "/";

    // Split path into segments
    const segments = path.split("/").filter(Boolean);
    const result = [];

    for (const segment of segments) {
      if (segment === "..") {
        result.pop();
      } else if (segment !== ".") {
        result.push(segment);
      }
    }

    return "/" + result.join("/");
  }

  /**
   * @description Returns the relative path from 'from' to 'to'
   * @param {string} from - The source path
   * @param {string} to - The destination path
   * @return {string} The relative path
   * @static
   */
  static relative(from, to) {
    // Handle null/undefined inputs
    if (!from || !to) return "";

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
  }

  /**
   * @description Returns the extension of the path, from the last '.' to end of string
   * @param {string} filePath - The file path
   * @return {string} The file extension (including the '.')
   * @static
   */
  static extname(filePath) {
    if (!filePath) return "";
    const lastDot = filePath.lastIndexOf(".");
    const lastSlash = filePath.lastIndexOf("/");
    return lastDot > lastSlash ? filePath.slice(lastDot) : "";
  }

  /**
   * @description Returns the last portion of a path
   * @param {string} filePath - The file path
   * @param {string} [ext=""] - An optional file extension to remove
   * @return {string} The basename of the path
   * @static
   */
  static basename(filePath, ext = "") {
    if (!filePath) return "";
    const lastSlash = filePath.lastIndexOf("/");
    const name = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
    return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
  }

  /**
   * @description Returns the directory name of a path
   * @param {string} filePath - The file path
   * @return {string} The directory name
   * @static
   */
  static dirname(filePath) {
    if (!filePath) return ".";
    const lastSlash = filePath.lastIndexOf("/");
    return lastSlash > 0 ? filePath.slice(0, lastSlash) : lastSlash === 0 ? "/" : ".";
  }
}
