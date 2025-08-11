/**
 * StopTheParty Integration Test
 *
 * This test simulates the real STP publishing workflow using:
 * 1. GitHubBranchAsStream for data and templates
 * 2. Our converted Gilbert engine with Web API streams
 * 3. File system output similar to current STP behavior
 */

import Gilbert from "../services/gilbert/lib/index.js";
import { Readable } from "node:stream";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { dirname, resolve } from "path";

// Mock GitHubBranchAsStream data similar to what STP would provide
const mockStpData = {
  // Data from content branch (JSON files) - Individual files per URI
  jsonData: [
    {
      path: "/data/site.json",
      contents: JSON.stringify({
        title: "Stop The Party",
        description: "Ending the wage gap through transparency",
        url: "https://www.stoptheparty.ca",
      }),
    },
    {
      path: "/data/pages/index.json",
      contents: JSON.stringify({
        webProducerKey: "homepage",
        title: "Stop The Party - Ending the Wage Gap",
        description: "A movement to educate, empower, and eliminate the wage gap",
        content: "Welcome to Stop The Party, where we work to end wage inequality.",
        publishDate: "2025-08-10",
        uri: "/index.html",
      }),
    },
    {
      path: "/data/pages/about.json",
      contents: JSON.stringify({
        webProducerKey: "page",
        title: "About Our Mission",
        description: "Learn about our commitment to wage equality",
        content: "Our mission is to create transparent, equitable compensation practices.",
        publishDate: "2025-08-10",
        uri: "/about.html",
      }),
    },
    {
      path: "/data/articles/wage-gap-statistics.json",
      contents: JSON.stringify({
        webProducerKey: "article",
        title: "Current Wage Gap Statistics",
        description: "Data-driven analysis of current wage disparities",
        content: "Recent studies show persistent wage gaps across demographics...",
        category: "research",
        publishDate: "2025-08-10",
        uri: "/articles/wage-gap-statistics.html",
      }),
    },
  ],

  // Templates from main branch (Handlebars files) - matching STP structure
  templates: [
    {
      path: "/services/app/templates/layouts/default.hbs",
      contents: `<!DOCTYPE html>
<html>
<head>
  <title>{{title}} | {{site.title}}</title>
  <meta name="description" content="{{description}}">
</head>
<body>
  <header>
    <h1>{{site.title}}</h1>
    <p>{{site.description}}</p>
  </header>
  <main>
    {{{body}}}
  </main>
</body>
</html>`,
    },
    {
      path: "/services/app/templates/homepage.hbs",
      contents: `
<section class="hero">
  <h1>{{title}}</h1>
  <p>{{description}}</p>
  <div class="content">
    {{{content}}}
  </div>
  <time datetime="{{publishDate}}">{{publishDate}}</time>
</section>`,
    },
    {
      path: "/services/app/templates/page.hbs",
      contents: `
<article>
  <h1>{{page.title}}</h1>
  <p>{{page.description}}</p>
  <div class="content">
    {{{page.content}}}
  </div>
  <time datetime="{{publishDate}}">{{publishDate}}</time>
</article>`,
    },
    {
      path: "/services/app/templates/article.hbs",
      contents: `
<article class="research-article">
  <header>
    <h1>{{title}}</h1>
    <p class="description">{{description}}</p>
    <div class="meta">
      <span class="category">{{category}}</span>
      <time datetime="{{publishDate}}">{{publishDate}}</time>
    </div>
  </header>
  <div class="content">
    {{{content}}}
  </div>
</article>`,
    },
    {
      path: "/services/app/templates/components/head.hbs",
      contents: `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{title}} | {{site.title}}</title>`,
    },
  ],

  // Static files
  staticFiles: [
    {
      path: "/services/app/files/robots.txt",
      contents: "User-agent: *\nDisallow:",
    },
    {
      path: "/services/app/serviceWorker.js",
      contents: "// Service worker for STP\nconsole.log('STP Service Worker');",
    },
  ],
};

/**
 * Convert Node.js stream to Web API ReadableStream
 */
function nodeToWebStream(nodeStream) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(chunk);
      });

      nodeStream.on("end", () => {
        controller.close();
      });

      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
  });
}

/**
 * Create a Node.js Readable stream from mock data
 */
function createMockStream(dataArray) {
  let index = 0;

  return new Readable({
    objectMode: true,
    read() {
      if (index < dataArray.length) {
        const item = dataArray[index++];
        // Create a vinyl-like object
        this.push({
          path: item.path,
          contents: Buffer.from(item.contents),
          relative: item.path.replace("/services/app/", ""),
          base: "/services/app/",
          cwd: process.cwd(),
        });
      } else {
        this.push(null); // End stream
      }
    },
  });
}

/**
 * Main integration test function
 */
async function testStpIntegration() {
  console.log("🚀 Starting STP Integration Test...");

  try {
    // Create output directory using standard ./dist pattern
    const outputDir = "./dist";
    await mkdir(outputDir, { recursive: true });

    // Initialize Gilbert with STP-like options
    const gilbert = new Gilbert({
      relativeRoot: "/services/app/",
      debug: true,
    });

    console.log("📁 Creating mock data streams...");

    // Create mock streams similar to GitHubBranchAsStream
    const jsonStream = createMockStream(mockStpData.jsonData);
    const templatesStream = createMockStream(mockStpData.templates);
    const staticFilesStream = createMockStream(mockStpData.staticFiles);

    // Convert Node.js streams to Web API streams
    const jsonWebStream = nodeToWebStream(jsonStream);
    const templatesWebStream = nodeToWebStream(templatesStream);
    const staticWebStream = nodeToWebStream(staticFilesStream);

    console.log("🔧 Starting Gilbert compilation...");

    // Use Gilbert's compile method (new name for produce)
    await gilbert.compile({
      uris: {
        data: { stream: jsonWebStream },
        theme: { stream: templatesWebStream },
      },
      files: {
        stream: staticWebStream,
      },
      // Note: No scripts/stylesheets for publishing scenario
    });

    console.log("✅ Gilbert compilation completed");
    console.log("📖 Reading output stream...");

    // Read the output stream and write to files
    const reader = gilbert.stream.getReader();
    const outputFiles = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const file = value;
      outputFiles.push({
        path: file.path,
        size: file.contents?.length || 0,
        contentType: file.contentType,
      });

      // Write to file system for verification
      const outputPath = resolve(outputDir, file.path.replace(/^\//, ""));
      await mkdir(dirname(outputPath), { recursive: true });

      if (file.contents) {
        const writeStream = createWriteStream(outputPath);
        writeStream.write(file.contents);
        writeStream.end();
      }

      console.log(`📄 Generated: ${file.path} (${file.contents?.length || 0} bytes, ${file.contentType})`);
    }

    console.log(`\n🎉 STP Integration Test completed successfully!`);
    console.log(`📊 Generated ${outputFiles.length} files in ${outputDir}`);
    console.log(`📈 Total size: ${outputFiles.reduce((sum, f) => sum + f.size, 0)} bytes`);

    return outputFiles;
  } catch (error) {
    console.error("❌ STP Integration Test failed:", error);
    throw error;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await testStpIntegration();
    console.log("\n✨ All tests passed! Gilbert is ready for StopTheParty integration.");
  } catch (error) {
    console.error("💥 Test failed:", error);
    process.exit(1);
  }
}
