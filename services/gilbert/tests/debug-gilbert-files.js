// Debug script to compare GilbertFiles from different sources
import path from "path";
import GilbertFS from "@tforster/gilbert-fs";
import GilbertFile from "@tforster/gilbert-file";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

console.log("=== Comparing GilbertFiles ===");

// 1. Create a GilbertFile like ScriptsPipeline does
const manualFile = new GilbertFile({
  cwd: "/",
  base: "/",
  path: "/test.js",
  contents: Buffer.from("console.log('test');"),
});

console.log("\nManual GilbertFile (like ScriptsPipeline):");
console.log("- constructor name:", manualFile.constructor.name);
console.log("- path:", manualFile.path);
console.log("- relative:", manualFile.relative);
console.log("- base:", manualFile.base);
console.log("- cwd:", manualFile.cwd);
console.log("- isBuffer:", Buffer.isBuffer(manualFile.contents));
console.log("- has contentType:", "contentType" in manualFile);
console.log("- properties:", Object.getOwnPropertyNames(manualFile).sort());

// 2. Get a GilbertFile from GilbertFS.src() like StaticFilesPipeline
const srcStream = GilbertFS.src(path.join(__dirname, "static-input/**/*"));
const reader = srcStream.getReader();

try {
  const { value: srcFile } = await reader.read();
  if (srcFile) {
    console.log("\nGilbertFS.src() GilbertFile (like StaticFilesPipeline):");
    console.log("- constructor name:", srcFile.constructor.name);
    console.log("- path:", srcFile.path);
    console.log("- relative:", srcFile.relative);
    console.log("- base:", srcFile.base);
    console.log("- cwd:", srcFile.cwd);
    console.log("- isBuffer:", Buffer.isBuffer(srcFile.contents));
    console.log("- has contentType:", "contentType" in srcFile);
    console.log("- properties:", Object.getOwnPropertyNames(srcFile).sort());
  }
} catch (err) {
  console.log("Could not read from GilbertFS.src():", err.message);
}

reader.releaseLock();
