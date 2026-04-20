/**
 * Test data middleware functionality
 * Test the new data middleware array support
 */

import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import Gilbert from "./lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths
const srcDir = resolve("./tests/src");
const templatesDir = resolve(srcDir, "templates");
const dataDir = resolve(srcDir, "data");
const distDir = resolve("./tests/dist-middleware");

// Sample middleware function - adds a timestamp to all data files
const timestampMiddleware = async (files) => {
  console.log(`📋 Middleware processing ${files.length} data files`);

  return files.map((file) => {
    // Parse the JSON content
    const content = JSON.parse(file.contents.toString());

    // Add timestamp
    content.middlewareTimestamp = new Date().toISOString();
    content.middlewareNote = "This was added by middleware";

    // Create new file with modified content
    const newFile = file.clone();
    newFile.contents = Buffer.from(JSON.stringify(content, null, 2));

    return newFile;
  });
};

async function testMiddleware() {
  try {
    console.log("🧪 Testing data middleware...");

    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    // Create adapters
    const dataAdapter = new GilbertFS({ base: dataDir });
    const templatesAdapter = new GilbertFS({ base: templatesDir });
    const outputAdapter = new GilbertFS();

    // Test NEW API with middleware
    const gilbert = new Gilbert(
      {
        templates: templatesAdapter.read("**/*.hbs"),
        data: {
          source: dataAdapter.read("**/*.json"),
          middleware: [timestampMiddleware],
        },
      },
      {
        debug: true,
      }
    );

    // Compile and output
    const outputStream = await gilbert.start();
    await outputStream.pipeTo(outputAdapter.write(distDir));

    console.log("✅ Middleware test completed successfully!");
    console.log(`   📁 Output directory: ${distDir}`);
  } catch (error) {
    console.error("❌ Middleware test failed:", error);
    process.exit(1);
  }
}

// Run the test
testMiddleware();
