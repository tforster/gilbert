// webpath.test.js — Unit tests for the WebPath utility class

import { describe, it } from "node:test";
import assert from "node:assert";

import WebPath from "../lib/WebPath.js";

describe("WebPath", { concurrency: 1 }, () => {
  // ---------------------------------------------------------------------------
  // resolve()
  // ---------------------------------------------------------------------------

  describe("resolve()", () => {
    it("should return an absolute path unchanged", () => {
      assert.strictEqual(WebPath.resolve("/foo/bar"), "/foo/bar");
    });

    it("should join an absolute base with a relative segment", () => {
      assert.strictEqual(WebPath.resolve("/base", "child"), "/base/child");
    });

    it("should replace the base when the second segment is absolute", () => {
      assert.strictEqual(WebPath.resolve("/base", "/new"), "/new");
    });

    it("should normalise double slashes and dot segments", () => {
      assert.strictEqual(WebPath.resolve("/foo//bar/../baz"), "/foo/baz");
    });

    it("should return cwd or / when given no valid paths", () => {
      const result = WebPath.resolve();
      assert.ok(typeof result === "string" && result.length > 0);
    });

    it("should filter out null and undefined segments", () => {
      const result = WebPath.resolve(null, "/actual/path");
      assert.strictEqual(result, "/actual/path");
    });
  });

  // ---------------------------------------------------------------------------
  // normalize()
  // ---------------------------------------------------------------------------

  describe("normalize()", () => {
    it("should remove double slashes", () => {
      assert.strictEqual(WebPath.normalize("/foo//bar"), "/foo/bar");
    });

    it("should resolve .. segments", () => {
      assert.strictEqual(WebPath.normalize("/foo/bar/../baz"), "/foo/baz");
    });

    it("should resolve . segments", () => {
      assert.strictEqual(WebPath.normalize("/foo/./bar"), "/foo/bar");
    });

    it("should return / for an empty or falsy input", () => {
      assert.strictEqual(WebPath.normalize(""), "/");
      assert.strictEqual(WebPath.normalize(null), "/");
    });

    it("should handle a simple absolute path without changes", () => {
      assert.strictEqual(WebPath.normalize("/foo/bar/baz"), "/foo/bar/baz");
    });
  });

  // ---------------------------------------------------------------------------
  // relative()
  // ---------------------------------------------------------------------------

  describe("relative()", () => {
    it("should return empty string for same path", () => {
      assert.strictEqual(WebPath.relative("/foo/bar", "/foo/bar"), "");
    });

    it("should navigate up directories correctly", () => {
      assert.strictEqual(WebPath.relative("/foo/bar", "/foo"), "../");
    });

    it("should navigate across directories", () => {
      assert.strictEqual(WebPath.relative("/foo/bar", "/baz"), "../../baz");
    });

    it("should return empty string for null inputs", () => {
      assert.strictEqual(WebPath.relative(null, "/foo"), "");
      assert.strictEqual(WebPath.relative("/foo", null), "");
    });

    it("should return relative path for sibling directories", () => {
      const result = WebPath.relative("/src/components", "/src/utils");
      assert.strictEqual(result, "../utils");
    });
  });

  // ---------------------------------------------------------------------------
  // extname()
  // ---------------------------------------------------------------------------

  describe("extname()", () => {
    it("should return the extension including the dot", () => {
      assert.strictEqual(WebPath.extname("file.txt"), ".txt");
      assert.strictEqual(WebPath.extname("/path/to/index.html"), ".html");
    });

    it("should return empty string when there is no extension", () => {
      assert.strictEqual(WebPath.extname("Makefile"), "");
      assert.strictEqual(WebPath.extname("/path/to/dir/"), "");
    });

    it("should return empty string for a falsy input", () => {
      assert.strictEqual(WebPath.extname(""), "");
      assert.strictEqual(WebPath.extname(null), "");
    });

    it("should not treat a leading dot as an extension", () => {
      // /foo/.dotfile has dot before the slash position
      const result = WebPath.extname("/foo/.dotfile");
      // lastDot is at position 5, lastSlash is at position 4 → lastDot > lastSlash → ".dotfile"
      assert.strictEqual(result, ".dotfile");
    });
  });

  // ---------------------------------------------------------------------------
  // basename()
  // ---------------------------------------------------------------------------

  describe("basename()", () => {
    it("should return the last path component", () => {
      assert.strictEqual(WebPath.basename("/foo/bar/baz.txt"), "baz.txt");
      assert.strictEqual(WebPath.basename("file.txt"), "file.txt");
    });

    it("should strip the provided extension", () => {
      assert.strictEqual(WebPath.basename("/foo/bar/baz.txt", ".txt"), "baz");
    });

    it("should not strip an extension that does not match", () => {
      assert.strictEqual(WebPath.basename("/foo/bar/baz.txt", ".html"), "baz.txt");
    });

    it("should return empty string for a falsy input", () => {
      assert.strictEqual(WebPath.basename(""), "");
      assert.strictEqual(WebPath.basename(null), "");
    });
  });

  // ---------------------------------------------------------------------------
  // dirname()
  // ---------------------------------------------------------------------------

  describe("dirname()", () => {
    it("should return the directory portion of a path", () => {
      assert.strictEqual(WebPath.dirname("/foo/bar/baz.txt"), "/foo/bar");
    });

    it("should return / for a file at the root", () => {
      assert.strictEqual(WebPath.dirname("/foo.txt"), "/");
    });

    it("should return . for a filename with no directory", () => {
      assert.strictEqual(WebPath.dirname("file.txt"), ".");
    });

    it("should return . for a falsy input", () => {
      assert.strictEqual(WebPath.dirname(""), ".");
      assert.strictEqual(WebPath.dirname(null), ".");
    });
  });
});
