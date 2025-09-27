import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "node:path";

import GilbertFile from "../lib/index.js";

describe("GilbertFile", { concurrency: 1 }, () => {
  describe("Constructor", () => {
    it("should create a file with minimal options", () => {
      const file = new GilbertFile();
      assert.ok(file instanceof GilbertFile);
      assert.strictEqual(file.contents, null);
      assert.strictEqual(file.path, null);
      assert.strictEqual(typeof file.cwd, "string");
      assert.strictEqual(file.size, 0); // null contents = size 0
    });

    it("should create a file with path", () => {
      const file = new GilbertFile({ path: "/test.txt" });
      assert.strictEqual(file.path, "/test.txt");
      assert.strictEqual(file.extname, ".txt");
      assert.strictEqual(file.basename, "test.txt");
      assert.strictEqual(file.stem, "test");
      assert.strictEqual(file.dirname, "/");
    });

    it("should create a file with Uint8Array contents", () => {
      const contents = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const file = new GilbertFile({ contents });
      assert.strictEqual(file.contents, contents);
      assert.strictEqual(file.size, 5);
      assert.strictEqual(file.isBuffer(), true);
      assert.strictEqual(file.isStream(), false);
      assert.strictEqual(file.isNull(), false);
    });

    it("should create a file with Web API ReadableStream", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });
      const file = new GilbertFile({ contents: stream });
      assert.strictEqual(file.contents, stream);
      assert.strictEqual(file.size, null); // streams have no predetermined size
      assert.strictEqual(file.isStream(), true);
      assert.strictEqual(file.isBuffer(), false);
      assert.strictEqual(file.isNull(), false);
    });

    it("should set contentType from file extension", () => {
      const file = new GilbertFile({ path: "/test.json" });
      assert.strictEqual(file.contentType, "application/json");
    });

    it("should use provided contentType over extension detection", () => {
      const file = new GilbertFile({ path: "/test.json", contentType: "text/plain" });
      assert.strictEqual(file.contentType, "text/plain");
    });

    it("should handle directory type", () => {
      const file = new GilbertFile({ path: "/dir", type: "directory" });
      assert.strictEqual(file.isDirectory(), true);
      assert.strictEqual(file.isFile(), false);
    });

    it("should handle content vs contents alias", () => {
      const contents = new Uint8Array([1, 2, 3]);
      const file = new GilbertFile({ content: contents }); // using 'content' alias
      assert.strictEqual(file.contents, contents);
      assert.strictEqual(file.size, 3);
    });
  });

  describe("Path Management", () => {
    it("should resolve relative paths", () => {
      const file = new GilbertFile({ cwd: "/home", path: "file.txt" });
      assert.strictEqual(file.path, "/home/file.txt");
    });

    it("should update path and recalculate contentType", () => {
      const file = new GilbertFile({ path: "/test.txt" });
      assert.strictEqual(file.contentType, "text/plain");

      file.path = "/test.json";
      assert.strictEqual(file.path, "/test.json");
      assert.strictEqual(file.contentType, "application/json");
    });

    it("should update history when path changes", () => {
      const file = new GilbertFile({ path: "/original.txt" });
      assert.deepStrictEqual(file.history, ["/original.txt"]);

      file.path = "/updated.txt";
      assert.deepStrictEqual(file.history, ["/updated.txt"]);
    });

    it("should throw error for non-string path", () => {
      const file = new GilbertFile();
      assert.throws(() => {
        file.path = 123;
      }, /Path must be a string/);
    });

    it("should calculate relative path correctly", () => {
      const file = new GilbertFile({
        cwd: "/",
        base: "/home/user",
        path: "/home/user/docs/file.txt",
      });
      assert.strictEqual(file.relative, "docs/file.txt");
    });
  });

  describe("Contents and Size Management", () => {
    it("should calculate size for Uint8Array", () => {
      const file = new GilbertFile();
      const contents = new Uint8Array(100);
      file.contents = contents;
      assert.strictEqual(file.size, 100);
    });

    it("should recalculate size when contents change", () => {
      const file = new GilbertFile({ contents: new Uint8Array(50) });
      assert.strictEqual(file.size, 50);

      file.contents = new Uint8Array(75);
      assert.strictEqual(file.size, 75);

      file.contents = null;
      assert.strictEqual(file.size, 0);
    });

    it("should return null size for streams", () => {
      const stream = new ReadableStream();
      const file = new GilbertFile({ contents: stream });
      assert.strictEqual(file.size, null);
    });

    it("should validate contents type", () => {
      const file = new GilbertFile();
      assert.throws(() => {
        file.contents = "invalid string";
      }, /Contents must be a Uint8Array, a ReadableStream, or null/);
    });

    it("should handle null contents", () => {
      const file = new GilbertFile({ contents: null });
      assert.strictEqual(file.contents, null);
      assert.strictEqual(file.size, 0);
      assert.strictEqual(file.isNull(), true);
    });
  });

  describe("ContentType Management", () => {
    it("should get and set contentType", () => {
      const file = new GilbertFile();
      file.contentType = "application/json";
      assert.strictEqual(file.contentType, "application/json");
    });

    it("should validate contentType is string", () => {
      const file = new GilbertFile();
      assert.throws(() => {
        file.contentType = 123;
      }, /Content type must be a string/);
    });

    it("should switch the contentType for unknown extensions", () => {
      const file = new GilbertFile({ path: "/test.json" });
      assert.strictEqual(file.contentType, "application/json");

      file.path = "/test.unknownext";
      assert.strictEqual(file.contentType, "application/octet-stream");
    });
  });

  describe("Stat Management", () => {
    it("should get and set stat object", () => {
      const file = new GilbertFile();
      const stat = { mtime: new Date(), ctime: new Date() };
      file.stat = stat;
      assert.strictEqual(file.stat, stat);
    });

    it("should allow null stat", () => {
      const file = new GilbertFile();
      file.stat = null;
      assert.strictEqual(file.stat, null);
    });

    it("should validate stat.size matches content size", () => {
      const file = new GilbertFile({ contents: new Uint8Array(100) });
      assert.throws(() => {
        file.stat = { size: 50 }; // conflicts with calculated size of 100
      }, /Stat size \(50\) does not match calculated content size \(100\)/);
    });

    it("should allow stat.size that matches content size", () => {
      const file = new GilbertFile({ contents: new Uint8Array(100) });
      file.stat = { size: 100, mtime: new Date() };
      assert.strictEqual(file.stat.size, 100);
    });

    it("should allow stat without size property", () => {
      const file = new GilbertFile({ contents: new Uint8Array(100) });
      const stat = { mtime: new Date(), ctime: new Date() };
      file.stat = stat;
      assert.strictEqual(file.stat, stat);
    });

    it("should create stat with createStat helper", () => {
      const file = new GilbertFile({ contents: new Uint8Array(50) });
      const mtime = new Date();
      const stat = file.createStat({ mtime });

      assert.strictEqual(stat.size, 50);
      assert.strictEqual(stat.mtime, mtime);

      // Should be able to set this stat without error
      file.stat = stat;
      assert.strictEqual(file.stat.size, 50);
    });
  });

  describe("File Type Detection", () => {
    it("should detect buffer contents", () => {
      const file = new GilbertFile({ contents: new Uint8Array([1, 2, 3]) });
      assert.strictEqual(file.isBuffer(), true);
      assert.strictEqual(file.isStream(), false);
      assert.strictEqual(file.isNull(), false);
    });

    it("should detect stream contents", () => {
      const stream = new ReadableStream();
      const file = new GilbertFile({ contents: stream });
      assert.strictEqual(file.isStream(), true);
      assert.strictEqual(file.isBuffer(), false);
      assert.strictEqual(file.isNull(), false);
    });

    it("should detect null contents", () => {
      const file = new GilbertFile({ contents: null });
      assert.strictEqual(file.isNull(), true);
      assert.strictEqual(file.isBuffer(), false);
      assert.strictEqual(file.isStream(), false);
    });

    it("should detect directory", () => {
      const file = new GilbertFile({ type: "directory" });
      assert.strictEqual(file.isDirectory(), true);
      assert.strictEqual(file.isFile(), false);
      assert.strictEqual(file.isSymbolic(), false);
    });

    it("should detect regular file", () => {
      const file = new GilbertFile({ contents: new Uint8Array([1, 2, 3]) });
      assert.strictEqual(file.isFile(), true);
      assert.strictEqual(file.isDirectory(), false);
      assert.strictEqual(file.isSymbolic(), false);
    });

    it("should handle symbolic links", () => {
      const file = new GilbertFile();
      assert.strictEqual(file.isSymbolic(), false); // currently always false
    });
  });

  describe("Vinyl Compatibility", () => {
    it("should have _isVinyl property", () => {
      const file = new GilbertFile();
      assert.strictEqual(file._isVinyl, true);
    });

    it("should have _cwd property that maps to cwd", () => {
      const file = new GilbertFile({ cwd: "/custom" });
      assert.strictEqual(file._cwd, "/custom");
      assert.strictEqual(file._cwd, file.cwd);
    });

    it("should have _contents property that maps to contents", () => {
      const contents = new Uint8Array([1, 2, 3]);
      const file = new GilbertFile({ contents });
      assert.strictEqual(file._contents, contents);
      assert.strictEqual(file._contents, file.contents);
    });

    it("should have _symlink property", () => {
      const file = new GilbertFile();
      assert.strictEqual(file._symlink, null);
    });

    it("should maintain vinyl compatibility properties as readonly", () => {
      const file = new GilbertFile();
      // These should be getters only, not settable
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(file), "_isVinyl");
      assert.ok(descriptor);
      assert.strictEqual(typeof descriptor.get, "function");
      assert.strictEqual(descriptor.set, undefined);
    });
  });

  describe("Working Directory Management", () => {
    it("should get and set cwd", () => {
      const file = new GilbertFile();
      file.cwd = "/new/cwd";
      assert.strictEqual(file.cwd, "/new/cwd");
    });

    it("should validate cwd is string", () => {
      const file = new GilbertFile();
      assert.throws(() => {
        file.cwd = 123;
      }, /CWD must be a string/);
    });

    it("should get and set base", () => {
      const file = new GilbertFile({ cwd: "/home" });
      file.base = "/home/user";
      assert.strictEqual(file.base, "/home/user");
    });

    it("should validate base is string", () => {
      const file = new GilbertFile();
      assert.throws(() => {
        file.base = 123;
      }, /Base must be a string/);
    });
  });

  describe("Path Utilities", () => {
    it("should handle null paths gracefully", () => {
      const file = new GilbertFile({ path: null });
      assert.strictEqual(file.path, null);
      assert.strictEqual(file.extname, "");
      assert.strictEqual(file.basename, "");
      assert.strictEqual(file.stem, "");
      assert.strictEqual(file.dirname, ".");
    });

    it("should calculate path properties correctly", () => {
      const file = new GilbertFile({ path: "/home/user/docs/file.txt" });
      assert.strictEqual(file.extname, ".txt");
      assert.strictEqual(file.basename, "file.txt");
      assert.strictEqual(file.stem, "file");
      assert.strictEqual(file.dirname, "/home/user/docs");
    });

    it("should handle paths without extensions", () => {
      const file = new GilbertFile({ path: "/home/user/README" });
      assert.strictEqual(file.extname, "");
      assert.strictEqual(file.basename, "README");
      assert.strictEqual(file.stem, "README");
    });

    it("should handle root paths", () => {
      const file = new GilbertFile({ path: "/file.txt" });
      assert.strictEqual(file.dirname, "/");
      assert.strictEqual(file.basename, "file.txt");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty Uint8Array", () => {
      const file = new GilbertFile({ contents: new Uint8Array(0) });
      assert.strictEqual(file.size, 0);
      assert.strictEqual(file.isBuffer(), true);
    });

    it("should handle constructor with no options", () => {
      const file = new GilbertFile();
      assert.ok(file instanceof GilbertFile);
      assert.strictEqual(file.contents, null);
      assert.strictEqual(file.size, 0);
    });

    it("should handle complex path resolution", () => {
      const file = new GilbertFile({
        cwd: "/home/user",
        path: "../other/file.txt",
      });
      assert.strictEqual(file.path, "/home/other/file.txt");
    });

    it("should maintain consistency when properties change", () => {
      const file = new GilbertFile({ path: "/test.txt", contents: new Uint8Array(10) });

      // Change path - should update contentType
      file.path = "/test.json";
      assert.strictEqual(file.contentType, "application/json");

      // Change contents - should update size
      file.contents = new Uint8Array(20);
      assert.strictEqual(file.size, 20);

      // Verify everything is still consistent
      assert.strictEqual(file.isBuffer(), true);
      assert.strictEqual(file.extname, ".json");
    });
  });
});

describe("GilbertFile", () => {
  describe("Constructor", () => {
    it("should create a new GilbertFile with defaults", () => {
      const file = new GilbertFile({ path: "test.txt", contents: Buffer.from("test") });
      assert.ok(file instanceof GilbertFile, "file should be an instance of GilbertFile");
      assert.strictEqual(file.path, path.resolve(process.cwd(), "test.txt"), "Path should be resolved");
      assert.ok(Buffer.isBuffer(file.contents), "Contents should be a Buffer");
      assert.strictEqual(file.contents.toString(), "test", "Contents should match");
      assert.strictEqual(file.cwd, process.cwd(), "CWD should default to process.cwd()");
      assert.strictEqual(file.base, process.cwd(), "Base should default to CWD");
      assert.ok(file.stat, "Stat object should exist");
      assert.deepStrictEqual(file.history, [path.resolve(process.cwd(), "test.txt")], "History should contain initial path");
      assert.strictEqual(file._isVinyl, true, "_isVinyl flag should be true");
    });

    it("should create a file with null contents (directory-like)", () => {
      const file = new GilbertFile({ path: "test-dir" }); // No contents, implies null
      assert.strictEqual(file.contents, null, "Contents should be null");
      assert.ok(file.stat, "Stat object should exist");
      assert.strictEqual(file.isNull(), true, "isNull() should be true");
      assert.strictEqual(file.isDirectory(), true, "isDirectory() should be true for null contents by default");
    });

    it("should accept custom cwd and base", () => {
      const customCwd = "/custom/cwd";
      const customBase = "base"; // relative to customCwd
      const file = new GilbertFile({ path: "file.txt", cwd: customCwd, base: customBase });
      assert.strictEqual(file.cwd, customCwd, "CWD should be custom CWD");
      assert.strictEqual(file.base, path.resolve(customCwd, customBase), "Base should be resolved relative to custom CWD");
      assert.strictEqual(file.path, path.resolve(customCwd, "file.txt"), "Path should be resolved relative to custom CWD");
    });

    it("should accept a Buffer for contents", () => {
      const buffer = Buffer.from("hello world");
      const file = new GilbertFile({ path: "file.txt", contents: buffer });
      assert.strictEqual(file.contents, buffer, "Contents should be the provided Buffer");
      assert.strictEqual(file.isBuffer(), true, "isBuffer() should be true");
    });

    it("should accept a Stream for contents", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });
      const file = new GilbertFile({ path: "file.txt", contents: stream });
      assert.strictEqual(file.contents, stream, "Contents should be the provided Stream");
      assert.strictEqual(file.isStream(), true, "isStream() should be true");
    });

    it("should throw if path is not a string when provided", () => {
      assert.throws(() => new GilbertFile({ path: 123 }), Error, "Should throw if path is not a string");
    });

    it("should throw if cwd is not a string when provided", () => {
      assert.throws(() => new GilbertFile({ path: "file.txt", cwd: 123 }), Error, "Should throw if cwd is not a string");
    });

    it("should throw if base is not a string when provided", () => {
      assert.throws(() => new GilbertFile({ path: "file.txt", base: 123 }), Error, "Should throw if base is not a string");
    });

    it("should throw if contents are invalid", () => {
      assert.throws(() => new GilbertFile({ path: "file.txt", contents: 123 }), Error, "Should throw for invalid contents type");
    });

    it("should initialize history with the initial path", () => {
      const p = "initial/path.txt";
      const file = new GilbertFile({ path: p });
      assert.deepStrictEqual(file.history, [path.resolve(process.cwd(), p)], "History should contain the initial resolved path");
    });

    it("should handle path resolution correctly when cwd is provided", () => {
      const file = new GilbertFile({ cwd: "/foo/bar", path: "baz/file.txt" });
      assert.strictEqual(file.path, "/foo/bar/baz/file.txt");
    });

    it("should handle path resolution correctly when path is absolute", () => {
      const file = new GilbertFile({ cwd: "/foo/bar", path: "/abs/path/file.txt" });
      assert.strictEqual(file.path, "/abs/path/file.txt");
    });

    it("should handle base path resolution correctly", () => {
      const file = new GilbertFile({ cwd: "/foo/bar", base: "baz", path: "baz/qux/file.txt" });
      assert.strictEqual(file.base, "/foo/bar/baz");
      assert.strictEqual(file.relative, "qux/file.txt");
    });

    it("should default base to cwd if path is supplied and base is not", () => {
      const file = new GilbertFile({ cwd: "/app", path: "src/file.js" });
      assert.strictEqual(file.base, "/app");
    });
  });

  describe("Properties", () => {
    const filePath = "dir/file.txt";
    const resolvedPath = path.resolve(process.cwd(), filePath);
    const cwd = process.cwd();
    const base = path.resolve(cwd, "dir");
    let file;

    beforeEach(() => {
      file = new GilbertFile({ path: filePath, base: "dir", contents: Buffer.from("test") });
    });

    it("should get cwd", () => {
      assert.strictEqual(file.cwd, cwd);
    });

    it("should get base", () => {
      assert.strictEqual(file.base, base);
    });

    it("should get path", () => {
      assert.strictEqual(file.path, resolvedPath);
    });

    it("should get contents", () => {
      assert.ok(Buffer.isBuffer(file.contents));
      assert.strictEqual(file.contents.toString(), "test");
    });

    it("should set contents (Buffer)", () => {
      const newBuffer = Buffer.from("new content");
      file.contents = newBuffer;
      assert.strictEqual(file.contents, newBuffer);
      assert.strictEqual(file.isBuffer(), true);
    });

    it("should set contents (Stream)", () => {
      const newStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });
      file.contents = newStream;
      assert.strictEqual(file.contents, newStream);
      assert.strictEqual(file.isStream(), true);
    });

    it("should set contents (null)", () => {
      file.contents = null;
      assert.strictEqual(file.contents, null);
      assert.strictEqual(file.isNull(), true);
    });

    it("should get stat", () => {
      assert.ok(file.stat);
    });

    it("should get history", () => {
      assert.deepStrictEqual(file.history, [resolvedPath]);
    });

    it("should get _isVinyl", () => {
      assert.strictEqual(file._isVinyl, true);
    });

    it("should get relative path", () => {
      assert.strictEqual(file.relative, "file.txt");
    });

    it("should get dirname", () => {
      assert.strictEqual(file.dirname, base); // Since base is 'dir'
    });

    it("should get basename", () => {
      assert.strictEqual(file.basename, "file.txt");
    });

    it("should get extname", () => {
      assert.strictEqual(file.extname, ".txt");
    });

    it("should get stem", () => {
      assert.strictEqual(file.stem, "file");
    });

    it("should get contentType (MIME type)", () => {
      const txtFile = new GilbertFile({ path: "doc.txt", contents: Buffer.from("") });
      assert.strictEqual(txtFile.contentType, "text/plain");
      const htmlFile = new GilbertFile({ path: "index.html", contents: Buffer.from("") });
      assert.strictEqual(htmlFile.contentType, "text/html");
      const unknownFile = new GilbertFile({ path: "file.unknown", contents: Buffer.from("") });
      assert.strictEqual(unknownFile.contentType, "application/octet-stream", "Should be null for unknown extension by default");
    });

    it("should set contentType (MIME type)", () => {
      file.contentType = "application/json";
      assert.strictEqual(file.contentType, "application/json");
    });
  });

  describe("Methods", () => {
    it("isBuffer() should return true for Buffer contents", () => {
      const file = new GilbertFile({ contents: Buffer.from("test") });
      assert.strictEqual(file.isBuffer(), true);
      assert.strictEqual(file.isStream(), false);
      assert.strictEqual(file.isNull(), false);
    });

    it("isStream() should return true for Stream contents", () => {
      const file = new GilbertFile({
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
            controller.close();
          },
        }),
      });
      assert.strictEqual(file.isStream(), true);
      assert.strictEqual(file.isBuffer(), false);
      assert.strictEqual(file.isNull(), false);
    });

    it("isNull() should return true for null contents", () => {
      const file = new GilbertFile({ contents: null });
      assert.strictEqual(file.isNull(), true);
      assert.strictEqual(file.isBuffer(), false);
      assert.strictEqual(file.isStream(), false);
    });

    describe("isDirectory()", () => {
      it("should be true if contents are null and stat does not deny it", () => {
        const file = new GilbertFile({ path: "dir", contents: null });
        assert.strictEqual(file.isDirectory(), true);
      });

      it("should be false for file with buffer contents", () => {
        const file = new GilbertFile({ path: "file.txt", contents: Buffer.from("data") });
        assert.strictEqual(file.isDirectory(), false);
      });
    });

    describe("isFile()", () => {
      it("should be true for buffer contents if not a directory or symlink", () => {
        const file = new GilbertFile({ path: "file.txt", contents: Buffer.from("data") });
        assert.strictEqual(file.isFile(), true);
      });

      it("should be false for null contents (defaulting to directory)", () => {
        const file = new GilbertFile({ path: "dir", contents: null });
        assert.strictEqual(file.isFile(), false);
      });
    });

    describe("isSymbolic()", () => {
      it("should be false if contents are not null", () => {
        const file = new GilbertFile({ path: "link", contents: Buffer.from(""), stat: { isSymbolicLink: () => true } });
        assert.strictEqual(file.isSymbolic(), false);
      });
    });
  });

  describe("clone()", () => {
    it("should create an exact copy when called with no overrides", () => {
      const contents = new Uint8Array([1, 2, 3, 4]);
      const stat = { size: 4, mtime: new Date() };
      const original = new GilbertFile({
        path: "/test/file.txt",
        base: "/test",
        cwd: "/project",
        contents,
        stat,
        contentType: "text/plain",
      });

      const cloned = original.clone();

      // Should be a different instance
      assert.notStrictEqual(cloned, original);

      // But have the same properties
      assert.strictEqual(cloned.path, original.path);
      assert.strictEqual(cloned.base, original.base);
      assert.strictEqual(cloned.cwd, original.cwd);
      assert.strictEqual(cloned.contents, original.contents);
      assert.strictEqual(cloned.stat, original.stat);
      assert.strictEqual(cloned.contentType, original.contentType);
    });

    it("should override specified properties", () => {
      const originalContents = new Uint8Array([1, 2, 3]);
      const newContents = new Uint8Array([4, 5, 6]);

      const original = new GilbertFile({
        path: "/test/file.txt",
        base: "/test",
        contents: originalContents,
        contentType: "text/plain",
      });

      const cloned = original.clone({
        path: "/test/modified.js",
        contents: newContents,
        contentType: "application/javascript",
      });

      // Overridden properties should be different
      assert.strictEqual(cloned.path, "/test/modified.js");
      assert.strictEqual(cloned.contents, newContents);
      assert.strictEqual(cloned.contentType, "application/javascript");

      // Non-overridden properties should be the same
      assert.strictEqual(cloned.base, original.base);
    });

    it("should work with ReadableStream contents", () => {
      const originalStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });

      const newStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([4, 5, 6]));
          controller.close();
        },
      });

      const original = new GilbertFile({
        path: "/test/file.txt",
        contents: originalStream,
      });

      const cloned = original.clone({ contents: newStream });

      assert.strictEqual(cloned.contents, newStream);
      assert.strictEqual(cloned.isStream(), true);
      assert.strictEqual(original.contents, originalStream);
    });

    it("should preserve null contents when cloning", () => {
      const original = new GilbertFile({
        path: "/test/empty.txt",
        contents: null,
      });

      const cloned = original.clone({ path: "/test/also-empty.txt" });

      assert.strictEqual(cloned.contents, null);
      assert.strictEqual(cloned.isNull(), true);
      assert.strictEqual(cloned.path, "/test/also-empty.txt");
    });

    it("should handle directory files correctly", () => {
      const original = new GilbertFile({
        path: "/test/dir",
        type: "directory",
        contents: null,
      });

      const cloned = original.clone({ path: "/test/other-dir" });

      assert.strictEqual(cloned.isDirectory(), true);
      assert.strictEqual(cloned.path, "/test/other-dir");
      assert.strictEqual(cloned.contents, null);
    });

    it("should work in transform scenarios", () => {
      // Simulate a typical transform use case
      const source = new GilbertFile({
        path: "/src/index.ts",
        base: "/src",
        contents: new Uint8Array(Buffer.from("const x: number = 42;")),
        contentType: "text/typescript",
      });

      // Transform: TypeScript → JavaScript
      const compiled = source.clone({
        path: "/src/index.js",
        contents: new Uint8Array(Buffer.from("const x = 42;")),
        contentType: "application/javascript",
      });

      assert.strictEqual(compiled.path, "/src/index.js");
      assert.strictEqual(compiled.base, "/src"); // Preserved
      assert.strictEqual(compiled.contentType, "application/javascript");
      assert.strictEqual(new TextDecoder().decode(compiled.contents), "const x = 42;");

      // Original should be unchanged
      assert.strictEqual(source.path, "/src/index.ts");
      assert.strictEqual(new TextDecoder().decode(source.contents), "const x: number = 42;");
    });

    it("should create independent streams when cloning ReadableStream contents", async () => {
      // Create a file with ReadableStream contents
      const testData = "Hello, streaming world!";
      const original = new GilbertFile({
        path: "/test/stream.txt",
        contents: new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(testData));
            controller.close();
          },
        }),
      });

      // Clone without providing new contents (should use tee())
      const cloned = original.clone({ path: "/test/stream-copy.txt" });

      // Both files should have independent streams
      assert.notStrictEqual(cloned.contents, original.contents, "Cloned stream should be different object");
      assert.strictEqual(cloned.isStream(), true, "Cloned file should still be a stream");
      assert.strictEqual(original.isStream(), true, "Original file should still be a stream");

      // Both streams should be readable independently
      const originalContent = await original.toString();
      const clonedContent = await cloned.toString();

      assert.strictEqual(originalContent, testData, "Original stream should be readable");
      assert.strictEqual(clonedContent, testData, "Cloned stream should be readable");
      assert.strictEqual(originalContent, clonedContent, "Both streams should have same content");

      // Verify path override worked
      assert.strictEqual(cloned.path, "/test/stream-copy.txt");
      assert.strictEqual(original.path, "/test/stream.txt");
    });

    it("should handle concurrent reads from cloned streams", async () => {
      // Create a file with larger ReadableStream contents
      const testData = "A".repeat(1000); // 1KB of data
      const original = new GilbertFile({
        path: "/test/large-stream.txt",
        contents: new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            // Simulate chunked data
            const chunkSize = 100;
            for (let i = 0; i < testData.length; i += chunkSize) {
              controller.enqueue(encoder.encode(testData.slice(i, i + chunkSize)));
            }
            controller.close();
          },
        }),
      });

      // Clone the file
      const cloned = original.clone();

      // Read both streams concurrently
      const [originalContent, clonedContent] = await Promise.all([original.toString(), cloned.toString()]);

      // Both should have the complete content
      assert.strictEqual(originalContent.length, 1000, "Original should have full content");
      assert.strictEqual(clonedContent.length, 1000, "Clone should have full content");
      assert.strictEqual(originalContent, testData, "Original content should match");
      assert.strictEqual(clonedContent, testData, "Cloned content should match");
    });

    it("should not interfere with stream when overriding contents in clone", () => {
      // Create original with stream
      const original = new GilbertFile({
        path: "/test/original-stream.txt",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("original"));
            controller.close();
          },
        }),
      });

      // Clone with new contents (should not tee original stream)
      const newContents = new Uint8Array(Buffer.from("replacement"));
      const cloned = original.clone({ contents: newContents });

      // Original should still have its stream, clone should have the new contents
      assert.strictEqual(original.isStream(), true, "Original should still be a stream");
      assert.strictEqual(cloned.isBuffer(), true, "Clone should be a buffer");
      assert.strictEqual(cloned.contents, newContents, "Clone should have the override contents");
    });
  });

  describe("Idempotent Stream Operations", () => {
    it("should preserve stream after toString() calls", async () => {
      const testData = "Hello, idempotent world!";
      const file = new GilbertFile({
        path: "/test/idempotent.txt",
        contents: new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(testData));
            controller.close();
          },
        }),
      });

      // Call toString() multiple times
      const result1 = await file.toString();
      const result2 = await file.toString();
      const result3 = await file.toString();

      // All results should be identical
      assert.strictEqual(result1, testData, "First toString() should work");
      assert.strictEqual(result2, testData, "Second toString() should work");
      assert.strictEqual(result3, testData, "Third toString() should work");

      // File should still be a stream
      assert.strictEqual(file.isStream(), true, "File should still be a stream");
    });

    it("should preserve stream after toBuffer() calls", async () => {
      const testData = "Buffer test data";
      const expectedBuffer = new TextEncoder().encode(testData);
      const file = new GilbertFile({
        path: "/test/buffer-idempotent.txt",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(expectedBuffer);
            controller.close();
          },
        }),
      });

      // Call toBuffer() multiple times
      const buffer1 = await file.toBuffer();
      const buffer2 = await file.toBuffer();

      // All results should be identical
      assert.deepStrictEqual(buffer1, expectedBuffer, "First toBuffer() should work");
      assert.deepStrictEqual(buffer2, expectedBuffer, "Second toBuffer() should work");

      // File should still be a stream
      assert.strictEqual(file.isStream(), true, "File should still be a stream");
    });

    it("should allow mixed toString() and toBuffer() calls", async () => {
      const testData = "Mixed operations test";
      const expectedBuffer = new TextEncoder().encode(testData);
      const file = new GilbertFile({
        path: "/test/mixed-ops.txt",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(expectedBuffer);
            controller.close();
          },
        }),
      });

      // Alternate between toString() and toBuffer() calls
      const string1 = await file.toString();
      const buffer1 = await file.toBuffer();
      const string2 = await file.toString();
      const buffer2 = await file.toBuffer();

      // All results should be correct
      assert.strictEqual(string1, testData);
      assert.strictEqual(string2, testData);
      assert.deepStrictEqual(buffer1, expectedBuffer);
      assert.deepStrictEqual(buffer2, expectedBuffer);

      // File should still be a stream
      assert.strictEqual(file.isStream(), true, "File should still be a stream after mixed operations");
    });

    it("should work with concurrent toString() calls", async () => {
      const testData = "Concurrent test data";
      const file = new GilbertFile({
        path: "/test/concurrent.txt",
        contents: new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(testData));
            controller.close();
          },
        }),
      });

      // Make concurrent toString() calls
      const [result1, result2, result3] = await Promise.all([file.toString(), file.toString(), file.toString()]);

      // All results should be identical
      assert.strictEqual(result1, testData);
      assert.strictEqual(result2, testData);
      assert.strictEqual(result3, testData);

      // File should still be a stream
      assert.strictEqual(file.isStream(), true, "File should still be a stream after concurrent operations");
    });
  });
});
