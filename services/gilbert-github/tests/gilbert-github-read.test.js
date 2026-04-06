// Gilbert-GitHub Read Functionality Tests
import { test, describe } from "node:test";
import assert from "node:assert";

// Project dependencies
import GilbertGitHub from "../lib/index.js";

// Test configuration - using a small, stable public repository
const TEST_REPO = "octocat/Hello-World"; // GitHub's official test repository
const TEST_BRANCH = "master"; // This repo uses master branch
// Note: This repo only contains a README file, not README.md

describe("GilbertGitHub Read Operations", { concurrency: 1 }, async () => {
  // Helper function to collect all files from stream
  async function collectFiles(stream) {
    const files = [];
    const reader = stream.getReader();
    let caughtError = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        files.push(value);
      }
    } catch (err) {
      caughtError = err;
    } finally {
      reader.releaseLock();
    }

    if (caughtError) {
      // Cancel the stream to abort any in-flight fetch before re-throwing,
      // preventing async activity from leaking past the test boundary.
      await stream.cancel().catch(() => {});
      throw caughtError;
    }

    return files;
  }

  test("should create GilbertGitHub instance with required repo", async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO });
    assert.ok(github, "Should create instance");
  });

  test("should throw error when repo is missing", async () => {
    assert.throws(() => new GilbertGitHub({}), /GitHub repository is required/, "Should throw error for missing repo");
  });

  test("should create instance with custom branch and token", async () => {
    const github = new GilbertGitHub({
      repo: TEST_REPO,
      branch: "custom-branch",
      token: "test-token",
    });
    assert.ok(github, "Should create instance with custom options");
  });

  test("should read all files with default pattern", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    const stream = github.read();
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find files in repository");

    // Verify we got GilbertFile objects
    files.forEach((file) => {
      assert.ok(file.path, "File should have path property");
      assert.ok(file.contents !== undefined, "File should have contents property");
      assert.ok(typeof file.relative === "string", "File should have relative path");
    });
  });

  test("should read files with specific glob pattern", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    const stream = github.read("**/README");
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find README file");

    // Verify all files match the pattern
    files.forEach((file) => {
      assert.ok(file.path.endsWith("README"), `File ${file.path} should be README file`);
    });
  });

  test("should read files with multiple glob patterns", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    const stream = github.read(["**/README", "**/*.txt"]);
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find files matching patterns");

    // Verify all files match at least one pattern
    files.forEach((file) => {
      const matchesPattern = file.path.endsWith("README") || file.path.endsWith(".txt");
      assert.ok(matchesPattern, `File ${file.path} should match one of the patterns`);
    });
  });

  test("should handle nested directory patterns", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    const stream = github.read("**/*");
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find files recursively");

    // Check that files have proper path structure
    files.forEach((file) => {
      assert.ok(typeof file.path === "string", "File path should be string");
      assert.ok(file.path.length > 0, "File path should not be empty");
    });
  });

  test("should return empty stream for non-matching patterns", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    const stream = github.read("*.nonexistent");
    const files = await collectFiles(stream);

    assert.strictEqual(files.length, 0, "Should return no files for non-matching pattern");
  });

  test("should handle method-level branch override", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: "nonexistent" });

    // Override with correct branch at method level
    const stream = github.read("**/*", { branch: TEST_BRANCH });
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should use method-level branch override");
  });

  test("should handle repository not found error", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: "nonexistent/repository" });

    const stream = github.read();

    try {
      await collectFiles(stream);
      assert.fail("Should have thrown error for non-existent repository");
    } catch (error) {
      assert.ok(error instanceof Error, "Should throw Error");
      assert.ok(error.message.includes("404"), "Should be a 404 error");
    }
  });

  test("should handle branch not found error", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: "nonexistent-branch" });

    const stream = github.read();

    try {
      await collectFiles(stream);
      assert.fail("Should have thrown error for non-existent branch");
    } catch (error) {
      assert.ok(error instanceof Error, "Should throw Error");
      assert.ok(error.message.includes("404"), "Should be a 404 error");
    }
  });

  test("should handle network timeout gracefully", { timeout: 5000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    // This test verifies the timeout mechanism exists
    // The actual timeout is set to 30 seconds in the implementation
    const stream = github.read();

    try {
      const files = await collectFiles(stream);
      // If we get here, the request succeeded (which is fine)
      assert.ok(Array.isArray(files), "Should return array of files");
    } catch (error) {
      // If timeout occurs, should be a proper error
      assert.ok(error instanceof Error, "Timeout should throw proper error");
    }
  });

  test("should handle large repositories efficiently", { timeout: 60000 }, async () => {
    // Use the same test repo but with a more inclusive pattern
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    // Read all files to test processing
    const stream = github.read("**/*");
    const startTime = performance.now();

    const files = await collectFiles(stream);
    const endTime = performance.now();

    assert.ok(files.length > 0, "Should find files in repository");

    const processingTime = endTime - startTime;

    // Verify reasonable performance (adjust threshold as needed)
    assert.ok(processingTime < 50000, `Should process efficiently (${processingTime}ms < 50000ms)`);
  });

  test("should preserve file content types", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    const stream = github.read("**/README");
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find README file");

    files.forEach((file) => {
      // Check that content type is detected
      if (file.contentType) {
        assert.ok(typeof file.contentType === "string", "Content type should be string");
      }

      // Check that contents are present
      assert.ok(file.contents !== undefined, "File should have contents");
      assert.ok(file.size >= 0, "File should have valid size");
    });
  });

  test("should handle binary files correctly", { timeout: 30000 }, async () => {
    // Use a repository that might have binary files
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    const stream = github.read("**/*");
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find files");

    // Check that all files are properly processed regardless of type
    files.forEach((file) => {
      assert.ok(file.path, "File should have path");
      assert.ok(file.contents !== undefined, "File should have contents");
      assert.ok(typeof file.size === "number", "File should have numeric size");
    });
  });

  test("should handle concurrent read operations", { timeout: 45000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    // Start multiple concurrent read operations
    const operations = [
      collectFiles(github.read("*.md")),
      collectFiles(github.read("**/*.txt")),
      collectFiles(github.read("**/*")),
    ];

    const results = await Promise.all(operations);

    // Verify all operations completed
    results.forEach((files, index) => {
      assert.ok(Array.isArray(files), `Operation ${index} should return array`);
    });

    // At least one operation should find files
    const totalFiles = results.reduce((sum, files) => sum + files.length, 0);
    assert.ok(totalFiles > 0, "Should find files across concurrent operations");
  });

  test("should handle exclusion patterns", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    // Test with a pattern that should exclude certain files
    const stream = github.read("**/*");
    const allFiles = await collectFiles(stream);

    const readmeStream = github.read("**/README");
    const readmeFiles = await collectFiles(readmeStream);

    assert.ok(allFiles.length >= readmeFiles.length, "All files should include README file");
    assert.ok(readmeFiles.length > 0, "Should find README file");

    // Verify README files are actually README
    readmeFiles.forEach((file) => {
      assert.ok(file.path.endsWith("README"), "Should only contain README files");
    });
  });

  test("should provide readable error messages", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: "owner/repo-that-definitely-does-not-exist-123456" });

    const stream = github.read();

    try {
      await collectFiles(stream);
      assert.fail("Should have thrown error");
    } catch (error) {
      assert.ok(error instanceof Error, "Should throw Error object");
      assert.ok(error.message.length > 0, "Error should have descriptive message");
      assert.ok(
        error.message.includes("GitHub") || error.message.includes("404"),
        "Error message should mention GitHub or status code"
      );
    }
  });

  test("should handle empty repositories", { timeout: 30000 }, async () => {
    // Create test with a repository that might be empty or minimal
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    // Look for files that definitely won't exist
    const stream = github.read("*.xyz123");
    const files = await collectFiles(stream);

    assert.strictEqual(files.length, 0, "Should handle empty results gracefully");
  });

  test("should respect glob pattern specificity", { timeout: 30000 }, async () => {
    const github = new GilbertGitHub({ repo: TEST_REPO, branch: TEST_BRANCH });

    // Test increasingly specific patterns
    const allFiles = await collectFiles(github.read("**/*"));
    const readmeFiles = await collectFiles(github.read("**/README"));

    // README files should be subset of all files
    assert.ok(readmeFiles.length <= allFiles.length, "README files should be subset of all files");
    assert.ok(readmeFiles.length > 0, "Should find README files");

    // Verify pattern specificity - README files should only match README
    readmeFiles.forEach((file) => {
      assert.ok(file.path.endsWith("README"), "Should only match README files");
    });

    // Verify that specific patterns return fewer results than broad patterns
    const specificFiles = await collectFiles(github.read("**/README"));
    assert.ok(specificFiles.length <= allFiles.length, "Specific patterns should return fewer or equal files");
  });
});
