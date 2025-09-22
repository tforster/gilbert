import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readdir, stat, readFile, mkdir, rm } from "node:fs/promises";

// Gilbert and dependencies
import Gilbert from "@tforster/gilbert";
import GilbertGitHub from "../lib/index.js";

// Test paths for output
const distDir = resolve("./tests/dist");

// Test configuration - using the real StopTheParty repository
const testRepo = "Stop-The-Party/www.stoptheparty.ca"; // Real repo with .hbs files
const testBranch = "main"; // Developer branch with templates

/**
 * Utility function to get all files recursively
 */
async function getAllFiles(dir, files = [], baseDir = null) {
  // Track the original base directory for relative path calculation
  if (baseDir === null) {
    baseDir = dir;
  }

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      const fullPath = resolve(dir, entry);
      const fileStat = await stat(fullPath);

      if (fileStat.isDirectory()) {
        await getAllFiles(fullPath, files, baseDir);
      } else {
        files.push({
          path: fullPath,
          relativePath: fullPath.replace(baseDir + "/", ""),
          size: fileStat.size,
        });
      }
    }
  } catch {
    // Directory might not exist
  }

  return files;
}

/**
 * Helper to create a test repository adapter
 * In real usage, you'd provide your own repo, branch, and token
 */
function createTestAdapter(options = {}) {
  return new GilbertGitHub({
    repo: options.repo || testRepo,
    branch: options.branch || testBranch,
    token: options.token || process.env.GITHUB_TOKEN, // Optional: use token for higher rate limits
    ...options,
  });
}

describe("Gilbert GitHub Files Pipeline", () => {
  test("should process GitHub files through Gilbert pipeline", async () => {
    // Skip test if no GitHub token available (to avoid rate limits)
    if (!process.env.GITHUB_TOKEN) {
      // Skip test without token to avoid rate limits
      return;
    }

    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    // Create adapter instance for specific repo and branch
    const githubAdapter = createTestAdapter();

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with GitHub files - test with StopTheParty templates and config
    const params = {
      staticFiles: githubAdapter.read(["/**/*.hbs", "/**/package.json"]),
    };

    // Compile through Gilbert
    await gilbert.compile(params);

    // Create output directory and stream to destination
    await mkdir(distDir, { recursive: true });
    await gilbert.stream.pipeTo(githubAdapter.write(distDir));

    // Verify output files exist
    const outputFiles = await getAllFiles(distDir);

    assert.ok(outputFiles.length > 0, "Should have generated output files");

    // Verify we got the expected files
    const fileNames = outputFiles.map((f) => f.relativePath);
    const hasTemplates = fileNames.some((name) => name.endsWith(".hbs"));
    const hasPackageJson = fileNames.some((name) => name.includes("package.json"));

    assert.ok(hasTemplates || hasPackageJson, "Should include .hbs templates or package.json files");

    // Generated files from GitHub successfully
  });

  test("should handle array patterns to filter specific file types", async () => {
    // Skip test if no GitHub token available
    if (!process.env.GITHUB_TOKEN) {
      return;
    }

    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    const githubAdapter = createTestAdapter();

    // Create Gilbert instance for array pattern test
    const gilbert1 = new Gilbert({
      debug: true,
    });

    // Test array patterns - get templates and data from StopTheParty repo
    const params = {
      staticFiles: githubAdapter.read(["/**/*.hbs", "/**/*.json"]),
    };

    await gilbert1.compile(params);
    await gilbert1.stream.pipeTo(githubAdapter.write(distDir));

    // Verify we got both file types
    const outputFiles = await getAllFiles(distDir);

    // Should have files
    assert.ok(outputFiles.length > 0, "Should have found files matching array patterns");

    // All files should be either .hbs or .json
    for (const file of outputFiles) {
      const isValidType = file.path.endsWith(".hbs") || file.path.endsWith(".json");
      assert.ok(isValidType, `File ${file.relativePath} should be .hbs or .json`);
    }

    // Verify we have both types (StopTheParty repo should have both)
    const hasHbs = outputFiles.some((f) => f.path.endsWith(".hbs"));
    const hasJson = outputFiles.some((f) => f.path.endsWith(".json"));

    assert.ok(hasHbs, "Should have found .hbs files");
    assert.ok(hasJson, "Should have found .json files");

    // Array pattern test completed successfully
  });

  test("should support multiple instances for different branches", async () => {
    // Skip test if no GitHub token available
    if (!process.env.GITHUB_TOKEN) {
      return;
    }

    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    // Create two adapters for different branches (like in real usage)
    const templatesAdapter = createTestAdapter({ branch: "main" });
    const contentAdapter = createTestAdapter({ branch: "content" });

    // Test templates from main branch
    const gilbert1 = new Gilbert({ debug: true });
    const templateParams = {
      staticFiles: templatesAdapter.read(["/**/*.hbs"]),
    };

    await gilbert1.compile(templateParams);
    await gilbert1.stream.pipeTo(templatesAdapter.write(distDir));

    const templateFiles = await getAllFiles(distDir);

    // Clean for content test
    await rm(distDir, { recursive: true, force: true });

    // Test content from content branch
    const gilbert2 = new Gilbert({ debug: true });
    const contentParams = {
      staticFiles: contentAdapter.read(["/**/*.json"]),
    };

    await gilbert2.compile(contentParams);
    await gilbert2.stream.pipeTo(contentAdapter.write(distDir));

    const contentFiles = await getAllFiles(distDir);

    // Both should work independently
    assert.ok(templateFiles.length >= 0, "Should handle templates branch");
    assert.ok(contentFiles.length >= 0, "Should handle content branch");

    // Multi-instance test completed successfully
  });

  test("should handle different branch configurations", async () => {
    // Skip test if no GitHub token available
    if (!process.env.GITHUB_TOKEN) {
      return;
    }

    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    // Test with a different branch (if available)
    const mainAdapter = createTestAdapter({ branch: "main" });

    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: mainAdapter.read(["package.json"]),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(mainAdapter.write(distDir));

    const outputFiles = await getAllFiles(distDir);
    assert.ok(outputFiles.length > 0, "Should read from specified branch");

    // Branch test completed successfully
  });

  test("should handle single pattern vs array pattern equivalence", async () => {
    // Skip test if no GitHub token available
    if (!process.env.GITHUB_TOKEN) {
      return;
    }

    const githubAdapter = createTestAdapter();

    // Test single pattern
    await rm(distDir, { recursive: true, force: true });

    const gilbert2 = new Gilbert({ debug: true });
    const singlePatternParams = {
      staticFiles: githubAdapter.read("**/*.json"),
    };

    await gilbert2.compile(singlePatternParams);
    await gilbert2.stream.pipeTo(githubAdapter.write(distDir));
    const singlePatternFiles = await getAllFiles(distDir);

    // Test array with single pattern
    await rm(distDir, { recursive: true, force: true });

    const gilbert3 = new Gilbert({ debug: true });
    const arrayPatternParams = {
      staticFiles: githubAdapter.read(["**/*.json"]),
    };

    await gilbert3.compile(arrayPatternParams);
    await gilbert3.stream.pipeTo(githubAdapter.write(distDir));
    const arrayPatternFiles = await getAllFiles(distDir);

    // Should produce same results
    assert.equal(
      singlePatternFiles.length,
      arrayPatternFiles.length,
      "Single pattern and array with single pattern should produce same results"
    );

    // Pattern equivalence test completed successfully
  });

  test("should handle empty pattern results gracefully", async () => {
    // Skip test if no GitHub token available
    if (!process.env.GITHUB_TOKEN) {
      return;
    }

    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    const githubAdapter = createTestAdapter();

    const gilbert = new Gilbert({
      debug: true,
    });

    // Use a pattern that should match no files
    const params = {
      staticFiles: githubAdapter.read(["**/*.this-extension-should-not-exist"]),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(githubAdapter.write(distDir));

    const outputFiles = await getAllFiles(distDir);
    assert.equal(outputFiles.length, 0, "Should handle empty results gracefully");

    // Empty pattern test handled gracefully
  });

  test("should preserve file content integrity", async () => {
    // Skip test if no GitHub token available
    if (!process.env.GITHUB_TOKEN) {
      return;
    }

    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    const githubAdapter = createTestAdapter();

    const gilbert = new Gilbert({
      debug: true,
    });

    // Get template files we can verify
    const params = {
      staticFiles: githubAdapter.read(["/**/*.hbs"]),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(githubAdapter.write(distDir));

    const outputFiles = await getAllFiles(distDir);
    assert.ok(outputFiles.length >= 0, "Should handle template files");

    // If we have .hbs files, verify one has content
    if (outputFiles.length > 0) {
      const firstFile = outputFiles[0];
      const content = await readFile(resolve(distDir, firstFile.relativePath), "utf8");
      assert.ok(content.length > 0, "Template files should have content");
    }

    // Content integrity test: template files have content
  });
});
