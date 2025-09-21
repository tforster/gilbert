/**
 * Big// Import Gilbert and adapters
import Gilbert from '../../lib/index.js';
import GilbertFS from '../../../gilbert-fs/lib/index.js';st    // Execute the build using pipeTo (like ultimate.test.js)
    await gilbert.stream.pipeTo(GilbertFS.dest(testConfig.distDir));ures Gilbert's performance with 200 pages
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { performance } from "perf_hooks";

// Import Gilbert and adapters
import Gilbert from "../../../services/gilbert/lib/index.js";
import GilbertFS from "../../../services/gilbert-fs/lib/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Test configuration
const testConfig = {
  baseDir: process.cwd(),
  sourceDir: process.cwd(), // Templates and data are now at root level
  distDir: path.join(process.cwd(), "dist"), // Fixed: was outputDir, should be distDir
  dataFile: path.join(process.cwd(), "data.json"),
  runs: 3, // Number of test runs to perform
};

/**
 * Clear the dist directory
 */
async function clearDistDirectory() {
  console.log("Clearing dist directory...");
  try {
    if (fs.existsSync(testConfig.distDir)) {
      await fs.promises.rm(testConfig.distDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(testConfig.distDir, { recursive: true });
    console.log("✓ Dist directory cleared");
  } catch (error) {
    console.error("✗ Error clearing dist directory:", error);
    throw error;
  }
}

/**
 * Validate that all required files exist
 */
function validateFiles() {
  console.log("Validating test files...");

  const requiredFiles = [
    // Source data file (needed to generate individual data files)
    testConfig.dataFile,
    // Template files
    path.join(testConfig.sourceDir, "templates", "home.hbs"),
    path.join(testConfig.sourceDir, "templates", "about.hbs"),
    path.join(testConfig.sourceDir, "templates", "blog-landing.hbs"),
    path.join(testConfig.sourceDir, "templates", "blog-post.hbs"),
    path.join(testConfig.sourceDir, "templates", "components", "head.hbs"),
    path.join(testConfig.sourceDir, "templates", "components", "header.hbs"),
    path.join(testConfig.sourceDir, "templates", "components", "footer.hbs"),
    // Asset files
    path.join(testConfig.sourceDir, "src", "stylesheets", "main.css"),
    path.join(testConfig.sourceDir, "src", "scripts", "main.js"),
  ];

  const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));

  if (missingFiles.length > 0) {
    console.error("✗ Missing required files:");
    missingFiles.forEach((file) => console.error(`  - ${file}`));
    throw new Error("Missing required files for test");
  }

  console.log("✓ All required files present");
}

/**
 * Count generated files
 */
function countGeneratedFiles() {
  let fileCount = 0;
  let totalSize = 0;

  function countRecursive(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        countRecursive(fullPath);
      } else {
        fileCount++;
        totalSize += stats.size;
      }
    }
  }

  if (fs.existsSync(testConfig.distDir)) {
    countRecursive(testConfig.distDir);
  }

  return {
    files: fileCount,
    size: totalSize,
    sizeFormatted: (totalSize / 1024 / 1024).toFixed(2) + " MB",
  };
}

/**
 * Run a single Gilbert build test
 */
async function runSingleTest(runNumber) {
  console.log(`\n--- Test Run ${runNumber} ---`);
  const startTime = performance.now();

  try {
    // Create Gilbert instance with configuration
    const config = {
      source: testConfig.sourceDir,
      destination: testConfig.distDir,
    };

    const pipelines = [
      { name: "templates", enabled: true },
      { name: "static", enabled: true },
      { name: "scripts", enabled: true },
      { name: "stylesheets", enabled: true },
    ];

    const gilbert = new Gilbert(config);

    // Compile all content (no console.log between performance measurements)
    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: path.resolve(testConfig.sourceDir, "data") }),
      templates: GilbertFS.src("**/*.hbs", { base: path.resolve(testConfig.sourceDir, "templates") }),
      scripts: [path.resolve(testConfig.sourceDir, "src", "scripts", "main.js")],
      stylesheets: [path.resolve(testConfig.sourceDir, "src", "stylesheets", "main.css")],
      staticFiles: GilbertFS.src("files/**/*", { base: path.resolve(testConfig.sourceDir, "src") }),
    });

    // Execute the build using pipeTo (no console.log between performance measurements)
    await gilbert.stream.pipeTo(GilbertFS.dest(testConfig.distDir));

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Count results
    const fileResults = countGeneratedFiles();

    console.log(`✓ Build completed in ${duration.toFixed(2)}ms`);
    console.log(`  Generated ${fileResults.files} files (${fileResults.sizeFormatted})`);

    return {
      duration,
      files: fileResults.files,
      size: fileResults.size,
      success: true,
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.error(`✗ Build failed after ${duration.toFixed(2)}ms:`, error.message);
    console.error("Full error:", error);

    return {
      duration,
      files: 0,
      size: 0,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main test function
 */
async function runBigTest() {
  console.log("🚀 Starting Gilbert Big Test (200 pages)");
  console.log("=========================================\n");

  try {
    // Validate environment
    validateFiles();

    // Load and display data stats
    const data = JSON.parse(fs.readFileSync(testConfig.dataFile, "utf8"));
    const pageCount = Object.keys(data.pages || {}).length + (data.blogPosts || []).length;
    console.log(`📊 Test data loaded: ${pageCount} total pages`);
    console.log(`   - ${Object.keys(data.pages || {}).length} static pages`);
    console.log(`   - ${(data.blogPosts || []).length} blog posts`);

    // Create individual data files for Gilbert
    console.log("\n🔧 Creating individual data files...");

    // Check if data.json exists, if not run full generation
    const dataPath = path.join(testConfig.sourceDir, "data.json");
    if (!fs.existsSync(dataPath)) {
      console.log("  Master data.json not found, generating all test data...");
      const { generateAllTestData } = await import("./generate-test-data.js");
      await generateAllTestData();
    } else {
      // Just convert existing data.json to individual files
      const { createIndividualDataFiles } = await import("./generate-test-data.js");
      const masterData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      createIndividualDataFiles(masterData);
      console.log("  Converted master data to individual files");
    }

    console.log("✓ Data files ready");

    const results = [];

    // Run multiple tests
    for (let i = 1; i <= testConfig.runs; i++) {
      await clearDistDirectory();
      const result = await runSingleTest(i);
      results.push(result);

      // Brief pause between runs
      if (i < testConfig.runs) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Calculate statistics
    const successfulRuns = results.filter((r) => r.success);

    if (successfulRuns.length === 0) {
      console.log("\n❌ All test runs failed!");
      return;
    }

    const durations = successfulRuns.map((r) => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    const lastRun = successfulRuns[successfulRuns.length - 1];

    console.log("\n📈 Performance Results");
    console.log("=======================");
    console.log(`Successful runs: ${successfulRuns.length}/${testConfig.runs}`);
    console.log(`Average time: ${avgDuration.toFixed(2)}ms`);
    console.log(`Fastest time: ${minDuration.toFixed(2)}ms`);
    console.log(`Slowest time: ${maxDuration.toFixed(2)}ms`);
    console.log(`Files generated: ${lastRun.files}`);
    console.log(`Total output size: ${(lastRun.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Pages per second: ${(pageCount / (avgDuration / 1000)).toFixed(1)}`);

    // Performance benchmarks
    console.log("\n🎯 Performance Benchmarks");
    console.log("===========================");
    if (avgDuration < 500) {
      console.log("🚀 Excellent performance (< 500ms)");
    } else if (avgDuration < 1000) {
      console.log("✅ Good performance (< 1s)");
    } else if (avgDuration < 2000) {
      console.log("⚠️ Acceptable performance (< 2s)");
    } else {
      console.log("🐌 Needs optimization (> 2s)");
    }

    console.log(`\n✅ Big test completed successfully!`);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runBigTest().catch(console.error);
