// tarstream.test.js — Unit tests for the TarStream class

import { describe, it } from "node:test";
import assert from "node:assert";

import TarStream from "../lib/TarStream.js";

// ---------------------------------------------------------------------------
// Test helpers — build minimal but valid tar archives in-memory
// ---------------------------------------------------------------------------

/**
 * Builds a single 512-byte tar header block for a regular file.
 * @param {string} filename - The filename to store in the header
 * @param {number} contentLength - The byte length of the file content
 * @returns {Uint8Array} A 512-byte header block
 */
function buildTarHeader(filename, contentLength) {
  const encoder = new TextEncoder();
  const header = new Uint8Array(512);

  // Filename — max 100 bytes at offset 0
  header.set(encoder.encode(filename).slice(0, 100), 0);

  // Mode — 8 bytes at offset 100 (use a sensible default)
  header.set(encoder.encode("0000644\0"), 100);

  // Size in octal — 12 bytes at offset 124
  const sizeOctal = contentLength.toString(8).padStart(11, "0") + "\0";
  header.set(encoder.encode(sizeOctal), 124);

  // Type flag at offset 156 — '0' = regular file
  header[156] = 48;

  // Magic "ustar" at offset 257 (POSIX standard)
  header.set(encoder.encode("ustar\0"), 257);

  // Checksum — 8 bytes at offset 148, pre-filled with spaces before calculation
  header.fill(32, 148, 156);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  const checksumOctal = checksum.toString(8).padStart(6, "0") + "\0 ";
  header.set(encoder.encode(checksumOctal), 148);

  return header;
}

/**
 * Builds a complete in-memory tar archive for one text file.
 * @param {string} filename - The entry path (e.g. "repo-main/src/index.js")
 * @param {string} text - UTF-8 text content for the file
 * @returns {Uint8Array} A complete tar archive as bytes
 */
function buildSingleFileTar(filename, text) {
  const encoder = new TextEncoder();
  const content = encoder.encode(text);

  const header = buildTarHeader(filename, content.length);
  const paddingSize = (512 - (content.length % 512)) % 512;
  const endBlock = new Uint8Array(1024); // two null end-of-archive blocks

  const total = new Uint8Array(512 + content.length + paddingSize + 1024);
  total.set(header, 0);
  total.set(content, 512);
  total.set(endBlock, 512 + content.length + paddingSize);

  return total;
}

// ---------------------------------------------------------------------------
// parseHeader()
// ---------------------------------------------------------------------------

describe("TarStream.parseHeader()", { concurrency: 1 }, () => {
  it("should return end-of-archive for a block of null bytes", () => {
    const tarStream = new TarStream();
    const emptyBlock = new Uint8Array(512);
    const result = tarStream.parseHeader(emptyBlock);
    assert.strictEqual(result.type, "end-of-archive");
    assert.strictEqual(result.size, 0);
    assert.strictEqual(result.name, "");
  });

  it("should parse a regular file header correctly", () => {
    const tarStream = new TarStream();
    const header = buildTarHeader("repo-main/src/index.js", 42);
    const result = tarStream.parseHeader(header);
    assert.strictEqual(result.name, "repo-main/src/index.js");
    assert.strictEqual(result.size, 42);
    assert.strictEqual(result.type, "file");
  });

  it("should parse a directory header (type flag 5)", () => {
    const header = buildTarHeader("repo-main/src/", 0);
    // Override the type flag to '5' for directory
    header[156] = 53; // ASCII '5'
    const tarStream = new TarStream();
    const result = tarStream.parseHeader(header);
    assert.strictEqual(result.type, "directory");
  });

  it("should handle a filename with null padding correctly", () => {
    const encoder = new TextEncoder();
    const header = new Uint8Array(512);
    // Write a short name followed by null bytes (standard in tar)
    const name = "file.txt";
    header.set(encoder.encode(name), 0);
    // Type flag '0'
    header[156] = 48;
    const tarStream = new TarStream();
    const result = tarStream.parseHeader(header);
    assert.strictEqual(result.name, "file.txt");
  });
});

// ---------------------------------------------------------------------------
// untar() — TransformStream integration
// ---------------------------------------------------------------------------

describe("TarStream.untar()", { concurrency: 1 }, () => {
  it("should extract a single file from a minimal tar archive", async () => {
    const tarStream = new TarStream();
    const archiveBytes = buildSingleFileTar("repo-main/src/index.js", "console.log('hello');");
    const transformStream = tarStream.untar();

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(archiveBytes);
        controller.close();
      },
    });

    const entries = [];
    const writer = transformStream.writable;
    const reader = transformStream.readable.getReader();

    // Pipe readable → writable
    const writeStream = readable.pipeTo(writer);

    // Collect entries from the readable side
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        entries.push(value);
      }
    } catch {
      // Stream may terminate early at end-of-archive — that is expected
    }

    await writeStream.catch(() => {}); // ignore early-termination errors

    assert.ok(entries.length >= 1, `Expected at least one entry, got ${entries.length}`);
    const entry = entries[0];
    assert.strictEqual(typeof entry.path, "string");
    // The TarStream strips the leading directory component (e.g. "repo-main/")
    assert.ok(entry.path.includes("index.js"), `Expected path to contain "index.js", got "${entry.path}"`);
    assert.ok(entry.content instanceof Uint8Array);
    assert.strictEqual(new TextDecoder().decode(entry.content), "console.log('hello');");
  });
});
