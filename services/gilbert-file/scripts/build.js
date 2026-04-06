import mimeDb from "mime-db";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build script that processes mime-db.json and generates a minified mime.js file
 * with extension-to-MIME-type mappings.
 *
 * This script reads the mime-db file devDependency, transforms
 * the data structure to use file extensions as keys instead of MIME types, and
 * generates a new mime.js file that exports a getMimeType function.
 *
 * @fileoverview MIME type lookup generator script
 * @author GitHub Copilot
 */

/**
 * @typedef {Object} MimeDbEntry
 * @property {string[]} [extensions] - Array of file extensions for this MIME type
 * @property {string} [source] - Source of the MIME type definition
 * @property {boolean} [compressible] - Whether the content is compressible
 * @property {string} [charset] - Default charset for this MIME type
 */

/**
 * @typedef {Object.<string, MimeDbEntry>} MimeDb
 * @description Map of MIME types to their metadata
 */

/**
 * @typedef {Object.<string, string>} ExtensionToMimeMap
 * @description Map of file extensions to their corresponding MIME types
 */

// Transform the data to use extensions as keys
const extensionToMime = {};

Object.entries(mimeDb).forEach(([mimeType, data]) => {
  if (data.extensions) {
    data.extensions.forEach((ext) => {
      extensionToMime[ext] = mimeType;
    });
  }
});

// Generate the output file content
const outputContent = `const mimeTypes = ${JSON.stringify(extensionToMime)};

function getMimeType(extension) {
  const cleanExt = extension.startsWith(".") ? extension.slice(1) : extension;
  return mimeTypes[cleanExt] || "application/octet-stream";
}

export default getMimeType;`;

// Write the mime.js file
const outputPath = path.resolve(__dirname, "../lib/mime.js");
await fs.writeFile(outputPath, outputContent);

// eslint-disable-next-line no-console
console.log(`✅ Generated ${outputPath} with ${Object.keys(extensionToMime).length} MIME type mappings`);
