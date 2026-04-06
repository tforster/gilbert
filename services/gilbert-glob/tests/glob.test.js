// glob.test.js — Unit tests for the Glob class

import { describe, it } from "node:test";
import assert from "node:assert";

import Glob from "../lib/Glob.js";

describe("Glob", { concurrency: 1 }, () => {
  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe("constructor", () => {
    it("should compile a dot pattern to match everything", () => {
      const glob = new Glob(".");
      assert.ok(glob.regex instanceof RegExp);
      assert.ok(glob.regex.test("anything"));
      assert.ok(glob.regex.test("nested/path/file.js"));
    });

    it("should compile a ** pattern that matches nested paths", () => {
      const glob = new Glob("**/*.js");
      assert.ok(glob.regex instanceof RegExp);
    });

    it("should compile an exact filename pattern", () => {
      const glob = new Glob("index.html");
      assert.ok(glob.regex instanceof RegExp);
    });

    it("should compile a leading-slash pattern by skipping the slash", () => {
      const withSlash = new Glob("/src/main.js");
      const withoutSlash = new Glob("src/main.js");
      // Both should match the same path
      assert.ok(withSlash.regex.test("src/main.js"));
      assert.ok(withoutSlash.regex.test("src/main.js"));
    });
  });

  // ---------------------------------------------------------------------------
  // test()
  // ---------------------------------------------------------------------------

  describe("test()", () => {
    it("should match a simple wildcard against filenames", () => {
      const glob = new Glob("*.hbs");
      assert.ok(glob.test("index.hbs"));
      assert.ok(glob.test("about.hbs"));
      assert.ok(!glob.test("index.html"));
      assert.ok(!glob.test("nested/index.hbs")); // * does not cross directory boundaries
    });

    it("should match ** across directory boundaries", () => {
      const glob = new Glob("**/*.hbs");
      assert.ok(glob.test("index.hbs"));
      assert.ok(glob.test("nested/index.hbs"));
      assert.ok(glob.test("deep/nested/path/layout.hbs"));
      assert.ok(!glob.test("deep/nested/path/layout.html"));
    });

    it("should match ** at end of pattern", () => {
      const glob = new Glob("src/**");
      assert.ok(glob.test("src/main.js"));
      assert.ok(glob.test("src/nested/util.js"));
    });

    it("should match a ? as any single non-slash character", () => {
      const glob = new Glob("file?.js");
      assert.ok(glob.test("file1.js"));
      assert.ok(glob.test("fileA.js"));
      assert.ok(!glob.test("file.js")); // no character
      assert.ok(!glob.test("file12.js")); // more than one character
    });

    it("should exclude dotfiles from * at segment start", () => {
      const glob = new Glob("*");
      assert.ok(!glob.test(".dotfile"));
      assert.ok(glob.test("regular.txt"));
    });

    it("should match an exact path with no wildcards", () => {
      const glob = new Glob("dist/main.css");
      assert.ok(glob.test("dist/main.css"));
      assert.ok(!glob.test("dist/main.js"));
      assert.ok(!glob.test("src/main.css"));
    });

    it("should return false for empty string when pattern is specific", () => {
      const glob = new Glob("*.js");
      assert.ok(!glob.test(""));
    });
  });

  // ---------------------------------------------------------------------------
  // testAny() static
  // ---------------------------------------------------------------------------

  describe("testAny()", () => {
    it("should return true if path matches any of the patterns", () => {
      assert.ok(Glob.testAny("style.css", ["*.html", "*.css", "*.js"]));
      assert.ok(Glob.testAny("index.html", ["*.html", "*.css"]));
    });

    it("should return false if path matches none of the patterns", () => {
      assert.ok(!Glob.testAny("image.png", ["*.html", "*.css", "*.js"]));
    });

    it("should return false for an empty patterns array", () => {
      assert.ok(!Glob.testAny("index.html", []));
    });
  });

  // ---------------------------------------------------------------------------
  // filter() static
  // ---------------------------------------------------------------------------

  describe("filter()", () => {
    it("should return only paths that match at least one pattern", () => {
      const paths = ["index.html", "style.css", "main.js", "image.png"];
      const result = Glob.filter(paths, ["*.html", "*.css"]);
      assert.deepStrictEqual(result, ["index.html", "style.css"]);
    });

    it("should return an empty array when no paths match", () => {
      const paths = ["image.png", "photo.jpg"];
      const result = Glob.filter(paths, ["*.html"]);
      assert.deepStrictEqual(result, []);
    });

    it("should return all paths when the pattern matches everything", () => {
      const paths = ["a.js", "b.js", "c.js"];
      const result = Glob.filter(paths, ["*.js"]);
      assert.deepStrictEqual(result, ["a.js", "b.js", "c.js"]);
    });

    it("should handle nested paths correctly", () => {
      const paths = ["src/main.js", "src/util.js", "dist/bundle.css"];
      const result = Glob.filter(paths, ["**/*.js"]);
      assert.deepStrictEqual(result, ["src/main.js", "src/util.js"]);
    });
  });
});
