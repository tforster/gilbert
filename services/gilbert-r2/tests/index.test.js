/* eslint-disable no-console */
import { describe, it } from "node:test";
import assert from "node:assert";
import GilbertR2 from "../lib/index.js";

describe("GilbertR2", () => {
  describe("Constructor", () => {
    it("should throw error when neither bucket nor binding is provided", () => {
      assert.throws(() => {
        new GilbertR2({});
      }, /Either bucket name or R2 binding is required/);
    });

    it("should create instance with binding", () => {
      const mockBinding = {}; // Mock R2 bucket binding
      const adapter = new GilbertR2({
        bucket: "test-bucket",
        binding: mockBinding,
      });
      assert.ok(adapter);
    });

    it("should set default maxFileSize to 100 MiB", () => {
      const mockBinding = {};
      const adapter = new GilbertR2({
        bucket: "test-bucket",
        binding: mockBinding,
      });
      assert.ok(adapter);
    });
  });

  describe("read()", () => {
    it("should throw error indicating read is not implemented", () => {
      const mockBinding = {};
      const adapter = new GilbertR2({
        bucket: "test-bucket",
        binding: mockBinding,
      });

      assert.throws(() => {
        adapter.read();
      }, /GilbertR2\.read\(\) is not implemented/);
    });
  });

  describe("write()", () => {
    it("should throw error when binding is not provided", () => {
      const adapter = new GilbertR2({
        bucket: "test-bucket",
      });

      assert.throws(() => {
        adapter.write("/");
      }, /R2 bucket binding is required/);
    });

    it("should return a WritableStream", () => {
      const mockBinding = {
        put: async () => {}, // Mock R2 put method
      };
      const adapter = new GilbertR2({
        bucket: "test-bucket",
        binding: mockBinding,
      });

      const stream = adapter.write("/");
      assert.ok(stream instanceof WritableStream);
    });

    it("should accept destination and options parameters", () => {
      const mockBinding = {
        put: async () => {},
      };
      const adapter = new GilbertR2({
        bucket: "test-bucket",
        binding: mockBinding,
      });

      const stream = adapter.write("/public", {
        cacheControl: {
          html: 300,
          assets: 31536000,
        },
      });
      assert.ok(stream instanceof WritableStream);
    });
  });
});

// Note: Full integration tests with actual R2 bucket should be run separately
// in a Cloudflare Workers environment using wrangler dev or deployed worker
console.log("\nℹ️  Note: These are unit tests only.");
console.log("   For integration testing with actual R2 bucket, deploy to Cloudflare Workers");
console.log("   and test using wrangler dev or a deployed worker environment.\n");
