import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { resolve } from "node:path";
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";
import { cleanupTestDirectories, getAllFiles } from "./integration.test.js";

const TEST_APP_DIR = resolve("tests/app");
const TEST_DIST_DIR = resolve("tests/dist");

describe("🚀 Ultimate Gilbert Performance Test", () => {
  beforeEach(async () => {
    // Isolated cleanup to prevent interference
    await cleanupTestDirectories();
  });

  test("Ultimate Test: All 4 Pipelines Sub-100ms Target", async () => {
    await cleanupTestDirectories();
    // eslint-disable-next-line no-console
    console.log("\n🎯 ULTIMATE GILBERT TEST: Sub-100ms All 4 Pipelines Target");

    const startTime = performance.now();

    // Create Gilbert instance with all 4 pipelines enabled
    const config = {
      source: "tests/app",
      destination: "tests/dist",
    };

    const pipelines = [
      { name: "templates", enabled: true },
      { name: "static", enabled: true },
      { name: "scripts", enabled: true },
      { name: "stylesheets", enabled: true },
    ];

    const gilbert = new Gilbert(config, pipelines);

    // Compile and execute all pipelines
    const compileStartTime = performance.now();
    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      staticFiles: GilbertFS.src("files/**/*", { base: resolve(TEST_APP_DIR) }),
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
      stylesheets: [resolve(TEST_APP_DIR, "stylesheets/main.css")],
    });
    const compileEndTime = performance.now();

    const streamStartTime = performance.now();
    await gilbert.stream.pipeTo(GilbertFS.dest(resolve(TEST_DIST_DIR, "ultimate-test")));
    const streamEndTime = performance.now();

    const totalEndTime = performance.now();

    // Calculate detailed timing metrics
    const compileTime = compileEndTime - compileStartTime;
    const streamTime = streamEndTime - streamStartTime;
    const totalTime = totalEndTime - startTime;

    // Get all generated files for comprehensive validation
    const outputFiles = getAllFiles(resolve(TEST_DIST_DIR, "ultimate-test"));

    // Categorize files by type for detailed analysis
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    const cssFiles = outputFiles.filter((f) => f.name.endsWith(".css"));
    const staticFiles = outputFiles.filter((f) => !f.name.endsWith(".html") && !f.name.endsWith(".js") && !f.name.endsWith(".css"));

    // Ultimate validation: All pipeline types must produce output
    assert(htmlFiles.length > 0, "Templates pipeline must generate HTML files");
    assert(jsFiles.length > 0, "Scripts pipeline must generate JS files");
    assert(cssFiles.length > 0, "Stylesheets pipeline must generate CSS files");
    assert(staticFiles.length > 0, "Static files pipeline must generate static assets");

    // 🎯 ULTIMATE PERFORMANCE TARGETS - Original Sub-100ms Goal
    assert(totalTime < 100, `🎯 ULTIMATE TARGET: Should complete in under 100ms (took ${totalTime.toFixed(2)}ms)`);
    assert(compileTime < 75, `Compilation should be under 75ms (took ${compileTime.toFixed(2)}ms)`);
    assert(streamTime < 25, `Streaming should be under 25ms (took ${streamTime.toFixed(2)}ms)`);

    // Comprehensive output logging
    // eslint-disable-next-line no-console
    console.log("🏆 ULTIMATE TEST RESULTS:");
    // eslint-disable-next-line no-console
    console.log(`   📊 Total Files Generated: ${outputFiles.length}`);
    // eslint-disable-next-line no-console
    console.log(`   📄 HTML Files (Templates): ${htmlFiles.length}`);
    // eslint-disable-next-line no-console
    console.log(`   📜 JavaScript Files (Scripts): ${jsFiles.length}`);
    // eslint-disable-next-line no-console
    console.log(`   🎨 CSS Files (Stylesheets): ${cssFiles.length}`);
    // eslint-disable-next-line no-console
    console.log(`   📁 Static Assets: ${staticFiles.length}`);
    // eslint-disable-next-line no-console
    console.log(`   ⚡ Performance Breakdown:`);
    // eslint-disable-next-line no-console
    console.log(`     - Compile Time: ${compileTime.toFixed(2)}ms`);
    // eslint-disable-next-line no-console
    console.log(`     - Stream Time: ${streamTime.toFixed(2)}ms`);
    // eslint-disable-next-line no-console
    console.log(`     - Total Execution: ${totalTime.toFixed(2)}ms`);

    // Ultimate success validation
    if (totalTime < 100) {
      // eslint-disable-next-line no-console
      console.log("🎯 TARGET ACHIEVED: Sub-100ms performance! Gilbert is production-ready!");
    }

    // Ensure all content types are properly generated
    assert(outputFiles.length >= 10, `Should generate substantial content (got ${outputFiles.length} files)`);

    // Final validation that all pipelines ran successfully
    assert(
      htmlFiles.length > 0 && jsFiles.length > 0 && cssFiles.length > 0 && staticFiles.length > 0,
      "All four pipelines (Templates, Scripts, Stylesheets, Static) must generate output"
    );
  });
});
