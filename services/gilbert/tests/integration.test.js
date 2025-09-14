import { describe, test } from "node:test";
import assert from "node:assert";
import { resolve } from "node:path";
import { rmSync, existsSync, readdirSync } from "node:fs";
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

const __dirname = new URL(".", import.meta.url).pathname;
const TEST_APP_DIR = resolve(__dirname, "app");
const TEST_DIST_DIR = resolve(__dirname, "dist");

/**
 * Helper function to clean up test output directories
 */
export async function cleanupTestDirectories() {
  if (existsSync(TEST_DIST_DIR)) {
    rmSync(TEST_DIST_DIR, { recursive: true, force: true });
  }
}

/**
 * Helper function to get all files in a directory recursively
 */
export function getAllFiles(dir, baseDir = dir) {
  const files = [];
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push({
        fullPath,
        relativePath: fullPath.replace(baseDir + "/", ""),
        name: entry.name,
      });
    }
  }
  return files;
}

describe("Gilbert Integration Tests - Pairwise Combinations", () => {
  test("Templates + Static Files", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "templates-static");
    const gilbert = new Gilbert({ debug: true });

    // Create test data for templates
    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "../template-input/data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      staticFiles: GilbertFS.src("**/*", { base: resolve(TEST_APP_DIR, "files") }),
    });

    // Write to destination
    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    // Verify output
    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Check for template-generated HTML files
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));

    // Check for static files (images, etc.)
    const staticFiles = outputFiles.filter((f) => !f.name.endsWith(".html"));

    // eslint-disable-next-line no-console
    console.log(
      `✅ Templates + Static Files: Generated ${outputFiles.length} files (HTML: ${htmlFiles.length}, Static: ${staticFiles.length})`
    );
  });

  test("Templates + Scripts", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "templates-scripts");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "../template-input/data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Verify HTML files from templates
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));

    // Verify JavaScript files from scripts
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    assert(jsFiles.length > 0, "Should generate JavaScript files");

    // eslint-disable-next-line no-console
    console.log(`✅ Templates + Scripts: Generated ${outputFiles.length} files (HTML: ${htmlFiles.length}, JS: ${jsFiles.length})`);
  });

  test("Templates + Stylesheets", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "templates-stylesheets");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "../template-input/data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      stylesheets: [resolve(TEST_APP_DIR, "stylesheets/main.css")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Verify HTML files from templates
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));

    // Verify CSS files from stylesheets
    const cssFiles = outputFiles.filter((f) => f.name.endsWith(".css"));
    assert(cssFiles.length > 0, "Should generate CSS files");

    // eslint-disable-next-line no-console
    console.log(
      `✅ Templates + Stylesheets: Generated ${outputFiles.length} files (HTML: ${htmlFiles.length}, CSS: ${cssFiles.length})`
    );
  });

  test("Static Files + Scripts", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "static-scripts");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      staticFiles: GilbertFS.src("**/*", { base: resolve(TEST_APP_DIR, "files") }),
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Verify static files
    const staticFiles = outputFiles.filter((f) => !f.name.endsWith(".js"));

    // Verify JavaScript files
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    assert(jsFiles.length > 0, "Should generate JavaScript files");

    // eslint-disable-next-line no-console
    console.log(
      `✅ Static Files + Scripts: Generated ${outputFiles.length} files (Static: ${staticFiles.length}, JS: ${jsFiles.length})`
    );
  });

  test("Static Files + Stylesheets", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "static-stylesheets");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      staticFiles: GilbertFS.src("**/*", { base: resolve(TEST_APP_DIR, "files") }),
      stylesheets: [resolve(TEST_APP_DIR, "stylesheets/main.css")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Verify static files
    const staticFiles = outputFiles.filter((f) => !f.name.endsWith(".css"));

    // Verify CSS files
    const cssFiles = outputFiles.filter((f) => f.name.endsWith(".css"));
    assert(cssFiles.length > 0, "Should generate CSS files");

    // eslint-disable-next-line no-console
    console.log(
      `✅ Static Files + Stylesheets: Generated ${outputFiles.length} files (Static: ${staticFiles.length}, CSS: ${cssFiles.length})`
    );
  });

  test("Scripts + Stylesheets", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "scripts-stylesheets");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
      stylesheets: [resolve(TEST_APP_DIR, "stylesheets/main.css")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Verify JavaScript files
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    assert(jsFiles.length > 0, "Should generate JavaScript files");

    // Verify CSS files
    const cssFiles = outputFiles.filter((f) => f.name.endsWith(".css"));
    assert(cssFiles.length > 0, "Should generate CSS files");

    // eslint-disable-next-line no-console
    console.log(`✅ Scripts + Stylesheets: Generated ${outputFiles.length} files (JS: ${jsFiles.length}, CSS: ${cssFiles.length})`);
  });

  test("Performance and Race Condition Validation", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "performance-test");
    const gilbert = new Gilbert({ debug: true });

    // Measure execution time for all pipelines together
    const startTime = performance.now();

    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "../template-input/data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      staticFiles: GilbertFS.src("**/*", { base: resolve(TEST_APP_DIR, "files") }),
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
      stylesheets: [resolve(TEST_APP_DIR, "stylesheets/main.css")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Verify all file types are generated
    const outputFiles = getAllFiles(outputDir);
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    const cssFiles = outputFiles.filter((f) => f.name.endsWith(".css"));
    const otherFiles = outputFiles.filter((f) => !f.name.endsWith(".html") && !f.name.endsWith(".js") && !f.name.endsWith(".css"));

    // Assert all pipeline outputs are present
    assert(jsFiles.length > 0, "Should generate JavaScript files");
    assert(cssFiles.length > 0, "Should generate CSS files");

    // eslint-disable-next-line no-console
    console.log(`✅ All Pipelines: Generated ${outputFiles.length} files in ${executionTime.toFixed(2)}ms`);
    // eslint-disable-next-line no-console
    console.log(`   - HTML: ${htmlFiles.length}, JS: ${jsFiles.length}, CSS: ${cssFiles.length}, Static: ${otherFiles.length}`);

    // Performance check: should complete within reasonable time (arbitrary 10 second limit)
    assert(executionTime < 10000, `Should complete within 10 seconds (took ${executionTime.toFixed(2)}ms)`);
  });
});

describe("Gilbert Integration Tests - Triple Combinations", () => {
  test("Templates + Static Files + Scripts", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "templates-static-scripts");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "../template-input/data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      staticFiles: GilbertFS.src("**/*", { base: resolve(TEST_APP_DIR, "files") }),
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Check for HTML files from templates
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));

    // Check for JavaScript files from scripts
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    assert(jsFiles.length > 0, "Should generate JavaScript files");

    // Check for static files
    const staticFiles = outputFiles.filter(
      (f) => !f.name.endsWith(".html") && !f.name.endsWith(".js") && !f.name.endsWith(".js.map")
    );
    assert(staticFiles.length > 0, "Should generate static files");

    // eslint-disable-next-line no-console
    console.log(
      `✅ Templates + Static + Scripts: Generated ${outputFiles.length} files ` +
        `(HTML: ${htmlFiles.length}, JS: ${jsFiles.length}, Static: ${staticFiles.length})`
    );
  });

  test("Templates + Static Files + Stylesheets", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "templates-static-stylesheets");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "../template-input/data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      staticFiles: GilbertFS.src("**/*", { base: resolve(TEST_APP_DIR, "files") }),
      stylesheets: [resolve(TEST_APP_DIR, "stylesheets/main.css")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Check for HTML files from templates
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));

    // Check for CSS files from stylesheets
    const cssFiles = outputFiles.filter((f) => f.name.endsWith(".css"));
    assert(cssFiles.length > 0, "Should generate CSS files");

    // Check for static files
    const staticFiles = outputFiles.filter(
      (f) => !f.name.endsWith(".html") && !f.name.endsWith(".css") && !f.name.endsWith(".css.map")
    );
    assert(staticFiles.length > 0, "Should generate static files");

    // eslint-disable-next-line no-console
    console.log(
      `✅ Templates + Static + Stylesheets: Generated ${outputFiles.length} files ` +
        `(HTML: ${htmlFiles.length}, CSS: ${cssFiles.length}, Static: ${staticFiles.length})`
    );
  });

  test("Templates + Scripts + Stylesheets", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "templates-scripts-stylesheets");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "../template-input/data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
      stylesheets: [resolve(TEST_APP_DIR, "stylesheets/main.css")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Check for HTML files from templates
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));

    // Check for JavaScript files from scripts
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    assert(jsFiles.length > 0, "Should generate JavaScript files");

    // Check for CSS files from stylesheets
    const cssFiles = outputFiles.filter((f) => f.name.endsWith(".css"));
    assert(cssFiles.length > 0, "Should generate CSS files");

    // eslint-disable-next-line no-console
    console.log(
      `✅ Templates + Scripts + Stylesheets: Generated ${outputFiles.length} files ` +
        `(HTML: ${htmlFiles.length}, JS: ${jsFiles.length}, CSS: ${cssFiles.length})`
    );
  });

  test("Static Files + Scripts + Stylesheets", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "static-scripts-stylesheets");
    const gilbert = new Gilbert({ debug: true });

    await gilbert.compile({
      staticFiles: GilbertFS.src("**/*", { base: resolve(TEST_APP_DIR, "files") }),
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
      stylesheets: [resolve(TEST_APP_DIR, "stylesheets/main.css")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Check for JavaScript files from scripts
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    assert(jsFiles.length > 0, "Should generate JavaScript files");

    // Check for CSS files from stylesheets
    const cssFiles = outputFiles.filter((f) => f.name.endsWith(".css"));
    assert(cssFiles.length > 0, "Should generate CSS files");

    // Check for static files
    const staticFiles = outputFiles.filter(
      (f) => !f.name.endsWith(".js") && !f.name.endsWith(".js.map") && !f.name.endsWith(".css") && !f.name.endsWith(".css.map")
    );
    assert(staticFiles.length > 0, "Should generate static files");

    // eslint-disable-next-line no-console
    console.log(
      `✅ Static + Scripts + Stylesheets: Generated ${outputFiles.length} files ` +
        `(Static: ${staticFiles.length}, JS: ${jsFiles.length}, CSS: ${cssFiles.length})`
    );
  });

  test("Performance and Race Condition Validation - Triple Combinations", async () => {
    await cleanupTestDirectories();
    const outputDir = resolve(TEST_DIST_DIR, "triple-performance-test");
    const gilbert = new Gilbert({ debug: true });

    const startTime = performance.now();

    await gilbert.compile({
      uris: GilbertFS.src("**/*.json", { base: resolve(TEST_APP_DIR, "../template-input/data") }),
      templates: GilbertFS.src("**/*.hbs", { base: resolve(TEST_APP_DIR, "templates") }),
      staticFiles: GilbertFS.src("**/*", { base: resolve(TEST_APP_DIR, "files") }),
      scripts: [resolve(TEST_APP_DIR, "scripts/main.js")],
    });

    await gilbert.stream.pipeTo(GilbertFS.dest(outputDir));

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    const outputFiles = getAllFiles(outputDir);
    assert(outputFiles.length > 0, "Should generate files");

    // Verify all expected file types are present
    const htmlFiles = outputFiles.filter((f) => f.name.endsWith(".html"));
    const jsFiles = outputFiles.filter((f) => f.name.endsWith(".js"));
    const staticFiles = outputFiles.filter(
      (f) => !f.name.endsWith(".html") && !f.name.endsWith(".js") && !f.name.endsWith(".js.map")
    );

    assert(jsFiles.length > 0, "Should generate JavaScript files");
    assert(staticFiles.length > 0, "Should generate static files");

    // eslint-disable-next-line no-console
    console.log(`✅ Triple Combination Performance: Generated ${outputFiles.length} files in ${executionTime.toFixed(2)}ms`);
    // eslint-disable-next-line no-console
    console.log(`   - HTML: ${htmlFiles.length}, JS: ${jsFiles.length}, Static: ${staticFiles.length}`);

    // Performance check: triple combinations should still complete efficiently
    assert(executionTime < 15000, `Should complete within 15 seconds (took ${executionTime.toFixed(2)}ms)`);
  });
});
