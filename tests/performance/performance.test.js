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
import Gilbert from "../../services/gilbert/lib/index.js";
import GilbertFS from "../../services/gilbert-fs/lib/index.js";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Test configuration
const testConfig = {
  baseDir: process.cwd(),
  sourceDir: path.join(__dirname, "src"), // Source files are now under src/
  distDir: path.join(__dirname, "dist"), // Output directory
  dataFile: path.join(__dirname, "data.json"), // Master data file at performance test root
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
    path.join(testConfig.sourceDir, "stylesheets", "main.css"),
    path.join(testConfig.sourceDir, "scripts", "main.js"),
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
    // Create GilbertFS adapter instances like the working middleware test
    const dataAdapter = new GilbertFS({ base: path.join(testConfig.sourceDir, "data") });
    const templatesAdapter = new GilbertFS({ base: path.join(testConfig.sourceDir, "templates") });
    const outputAdapter = new GilbertFS();

    // Create markdown processing middleware for blog content
    const markdownContentMiddleware = async (dataFiles) => {
      const processedFiles = [];

      for (const file of dataFiles) {
        const contentsString = await file.toString();
        const data = JSON.parse(contentsString);

        // Process markdown in content fields (for blog posts)
        if (data.content && typeof data.content === "string" && data.webProducerKey === "blog-post") {
          // Add some markdown syntax to test the processing
          const markdownContent =
            `# Blog Post: ${data.title}\n\n` +
            `This is a **bold** statement with *italic* text.\n\n## Original Content\n\n${data.content}\n\n` +
            `### Key Points\n\n- Important point 1\n- **Critical** point 2\n- *Emphasized* point 3`;

          // Convert markdown to HTML (supports block-level elements)
          const htmlContent = marked.parse(markdownContent);
          data.content = htmlContent;
          data.markdownProcessed = true;

          // Create new GilbertFile with processed data
          const { default: GilbertFile } = await import("@tforster/gilbert-file");
          const jsonString = JSON.stringify(data, null, 2);
          const modifiedFile = new GilbertFile({
            path: file.path,
            contents: new ReadableStream({
              start(controller) {
                const encoder = new TextEncoder();
                controller.enqueue(encoder.encode(jsonString));
                controller.close();
              },
            }),
          });

          processedFiles.push(modifiedFile);
        } else {
          // Return file unchanged
          processedFiles.push(file);
        }
      }

      return processedFiles;
    };

    // Create Gilbert instance with new API signature (separate adapters)
    const gilbert = new Gilbert(
      {
        templates: templatesAdapter.read("**/*.hbs"),
        data: {
          source: dataAdapter.read("**/*.json"),
          middleware: [markdownContentMiddleware],
        },
        scripts: [path.resolve(testConfig.sourceDir, "scripts", "main.js")],
        stylesheets: [path.resolve(testConfig.sourceDir, "stylesheets", "main.css")],
        // Remove staticFiles since the files/ directory doesn't exist
      },
      {
        debug: false, // Disable debug for performance testing
      }
    );

    // Compile and execute the build using new API (compile returns stream directly)
    await (await gilbert.start()).pipeTo(outputAdapter.write(testConfig.distDir));

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
    const dataPath = testConfig.dataFile;
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
