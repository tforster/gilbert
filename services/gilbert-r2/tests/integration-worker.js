import GilbertR2 from "../lib/index.js";
import GilbertFile from "@tforster/gilbert-file";

/**
 * Integration test worker for gilbert-r2
 * Run with: npm run test:integration
 * Then test with: curl http://localhost:8787/test
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/test") {
      return handleTest(env);
    }

    return new Response("Gilbert R2 Integration Test Worker\n\nEndpoints:\n- GET /test - Run integration tests", {
      headers: { "content-type": "text/plain" },
    });
  },
};

async function handleTest(env) {
  const results = [];
  let allPassed = true;

  try {
    // Test 1: Create adapter with R2 binding
    results.push("Test 1: Creating GilbertR2 adapter with binding...");
    const r2 = new GilbertR2({
      bucket: "test-bucket",
      binding: env.TEST_BUCKET,
    });
    results.push("✓ Test 1 passed: Adapter created successfully\n");

    // Test 2: Write a simple text file
    results.push("Test 2: Writing a simple text file to R2...");
    const testContent = "Hello from Gilbert R2!";
    const testContentBytes = new TextEncoder().encode(testContent);

    const textFile = new GilbertFile({
      path: "/test/hello.txt",
      base: "/test",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(testContentBytes);
          controller.close();
        },
      }),
      contentType: "text/plain",
      stat: {
        size: testContentBytes.length,
      },
    });

    await new ReadableStream({
      pull(controller) {
        controller.enqueue(textFile);
        controller.close();
      },
    }).pipeTo(r2.write("/"));

    results.push("✓ Test 2 passed: Text file written successfully\n");

    // Test 3: Verify file was written by reading it back
    results.push("Test 3: Reading file back from R2...");
    const object = await env.TEST_BUCKET.get("hello.txt");
    if (!object) {
      throw new Error("File not found in R2");
    }
    const content = await object.text();
    if (content !== "Hello from Gilbert R2!") {
      throw new Error(`Content mismatch: expected "Hello from Gilbert R2!", got "${content}"`);
    }
    results.push("✓ Test 3 passed: File content verified\n");

    // Test 4: Write an HTML file with cache control
    results.push("Test 4: Writing HTML file with cache control...");
    const htmlContent = "<!DOCTYPE html><html><body>Test</body></html>";
    const htmlBytes = new TextEncoder().encode(htmlContent);

    const htmlFile = new GilbertFile({
      path: "/test/index.html",
      base: "/test",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(htmlBytes);
          controller.close();
        },
      }),
      contentType: "text/html",
      stat: {
        size: htmlBytes.length,
      },
    });

    await new ReadableStream({
      start(controller) {
        controller.enqueue(htmlFile);
        controller.close();
      },
    }).pipeTo(
      r2.write("/", {
        cacheControl: {
          html: 300, // 5 minutes
        },
      })
    );

    results.push("✓ Test 4 passed: HTML file written with cache control\n");

    // Test 5: Verify cache control headers
    results.push("Test 5: Verifying HTTP metadata...");
    const htmlObject = await env.TEST_BUCKET.get("index.html");
    if (!htmlObject) {
      throw new Error("HTML file not found in R2");
    }
    results.push(`  Content-Type: ${htmlObject.httpMetadata?.contentType}`);
    results.push(`  Cache-Control: ${htmlObject.httpMetadata?.cacheControl}`);
    if (htmlObject.httpMetadata?.cacheControl !== "public, max-age=300") {
      throw new Error(`Cache control mismatch: expected "public, max-age=300", got "${htmlObject.httpMetadata?.cacheControl}"`);
    }
    results.push("✓ Test 5 passed: HTTP metadata verified\n");

    // Test 6: Write multiple files in a stream
    results.push("Test 6: Writing multiple files in stream...");

    const file1Content = new TextEncoder().encode("File 1");
    const file2Content = new TextEncoder().encode("File 2");
    const file3Content = new TextEncoder().encode("File 3");

    const files = [
      new GilbertFile({
        path: "/test/file1.txt",
        base: "/test",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(file1Content);
            controller.close();
          },
        }),
        stat: { size: file1Content.length },
      }),
      new GilbertFile({
        path: "/test/file2.txt",
        base: "/test",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(file2Content);
            controller.close();
          },
        }),
        stat: { size: file2Content.length },
      }),
      new GilbertFile({
        path: "/test/file3.txt",
        base: "/test",
        contents: new ReadableStream({
          start(controller) {
            controller.enqueue(file3Content);
            controller.close();
          },
        }),
        stat: { size: file3Content.length },
      }),
    ];

    let index = 0;
    await new ReadableStream({
      pull(controller) {
        if (index < files.length) {
          controller.enqueue(files[index++]);
        } else {
          controller.close();
        }
      },
    }).pipeTo(r2.write("/"));

    // Verify all three files exist
    for (let i = 1; i <= 3; i++) {
      const file = await env.TEST_BUCKET.get(`file${i}.txt`);
      if (!file) {
        throw new Error(`file${i}.txt not found in R2`);
      }
      const text = await file.text();
      if (text !== `File ${i}`) {
        throw new Error(`file${i}.txt content mismatch`);
      }
    }
    results.push("✓ Test 6 passed: Multiple files written and verified\n");

    // Test 7: Custom metadata
    results.push("Test 7: Writing file with custom metadata...");
    const metadataContent = new TextEncoder().encode("Metadata test");

    const metadataFile = new GilbertFile({
      path: "/test/metadata.txt",
      base: "/test",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(metadataContent);
          controller.close();
        },
      }),
      stat: { size: metadataContent.length },
    });

    await new ReadableStream({
      start(controller) {
        controller.enqueue(metadataFile);
        controller.close();
      },
    }).pipeTo(
      r2.write("/", {
        customMetadata: {
          version: "1.0.0",
          environment: "test",
        },
      })
    );

    const metadataObject = await env.TEST_BUCKET.get("metadata.txt");
    results.push(`  Custom metadata: ${JSON.stringify(metadataObject.customMetadata)}`);
    if (metadataObject.customMetadata?.version !== "1.0.0") {
      throw new Error("Custom metadata not set correctly");
    }
    results.push("✓ Test 7 passed: Custom metadata verified\n");

    results.push("\n=========================");
    results.push("✅ ALL TESTS PASSED!");
    results.push("=========================");
  } catch (error) {
    allPassed = false;
    results.push(`\n❌ TEST FAILED: ${error.message}`);
    results.push(`Stack: ${error.stack}`);
  }

  return new Response(results.join("\n"), {
    status: allPassed ? 200 : 500,
    headers: { "content-type": "text/plain" },
  });
}
