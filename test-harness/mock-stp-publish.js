// Test harness simulating StopTheParty publishing scenario
// This allows testing Gilbert Web Streams migration without full STP pipeline

import Gilbert from "../services/gilbert/lib/index.js";
import { vinyl } from "../services/gilbert/lib/Utils.js";

/**
 * Mock data structure matching STP content from Pages CMS
 */
const mockStpData = {
  uris: {
    "/index.html": {
      webProducerKey: "homepage",
      title: "Stop The Party - Ending the Wage Gap",
      description: "A movement to educate, empower, and eliminate the wage gap",
      content: "Welcome to Stop The Party, where we work to end wage inequality.",
      publishDate: "2025-08-10",
    },
    "/about.html": {
      webProducerKey: "page",
      title: "About Our Mission",
      description: "Learn about our commitment to wage equality",
      content: "Our mission is to create transparent, equitable compensation practices.",
      publishDate: "2025-08-10",
    },
    "/articles/wage-gap-statistics.html": {
      webProducerKey: "article",
      title: "Current Wage Gap Statistics",
      description: "Data-driven analysis of current wage disparities",
      content: "Recent studies show persistent wage gaps across demographics...",
      category: "research",
      publishDate: "2025-08-10",
    },
  },
};

/**
 * Mock Handlebars templates matching STP structure
 */
const mockTemplates = {
  "homepage.hbs": `
<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
  <meta name="description" content="{{description}}">
</head>
<body>
  <h1>{{title}}</h1>
  <p>{{description}}</p>
  <main>{{content}}</main>
  <footer>Published: {{publishDate}}</footer>
</body>
</html>`.trim(),

  "page.hbs": `
<!DOCTYPE html>
<html>
<head>
  <title>{{title}} - Stop The Party</title>
  <meta name="description" content="{{description}}">
</head>
<body>
  <nav><a href="/">Home</a></nav>
  <h1>{{title}}</h1>
  <main>{{content}}</main>
</body>
</html>`.trim(),

  "article.hbs": `
<!DOCTYPE html>
<html>
<head>
  <title>{{title}} - Stop The Party</title>
  <meta name="description" content="{{description}}">
</head>
<body>
  <nav><a href="/">Home</a> | <a href="/articles">Articles</a></nav>
  <article>
    <h1>{{title}}</h1>
    <p class="meta">Category: {{category}} | Published: {{publishDate}}</p>
    <main>{{content}}</main>
  </article>
</body>
</html>`.trim(),
};

/**
 * Mock static files that might change with content
 */
const mockStaticFiles = {
  "robots.txt": "User-agent: *\nAllow: /",
  "sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://stoptheparty.ca/</loc></url>
  <url><loc>https://stoptheparty.ca/about</loc></url>
  <url><loc>https://stoptheparty.ca/articles/wage-gap-statistics</loc></url>
</urlset>`,
};

/**
 * Create mock Web Streams that simulate GitHubBranchAsStream output
 */
function createMockDataStream() {
  return new ReadableStream({
    start(controller) {
      // Create a GilbertFile object for the JSON data
      const dataFile = vinyl({
        path: "/data.json",
        contents: Buffer.from(JSON.stringify(mockStpData)),
        cwd: "/",
      });

      controller.enqueue(dataFile);
      controller.close();
    },
  });
}

function createMockTemplateStream() {
  return new ReadableStream({
    start(controller) {
      // Create GilbertFile objects for each template
      for (const [filename, content] of Object.entries(mockTemplates)) {
        const templateFile = vinyl({
          path: `/${filename}`,
          contents: Buffer.from(content),
          cwd: "/",
        });

        controller.enqueue(templateFile);
      }

      controller.close();
    },
  });
}

function createMockStaticStream() {
  return new ReadableStream({
    start(controller) {
      // Create GilbertFile objects for static files
      for (const [filename, content] of Object.entries(mockStaticFiles)) {
        const staticFile = vinyl({
          path: `/${filename}`,
          contents: Buffer.from(content),
          cwd: "/",
        });

        controller.enqueue(staticFile);
      }

      controller.close();
    },
  });
}

/**
 * Test the publishing scenario (TemplatePipeline + StaticFilesPipeline only)
 */
async function testStpPublishing() {
  console.log("🚀 Starting STP Publishing Test...");

  try {
    const gilbert = new Gilbert({
      relativeRoot: "/",
      debug: true,
    });

    // Create mock Web Streams
    const dataStream = createMockDataStream();
    const templateStream = createMockTemplateStream();
    const staticStream = createMockStaticStream();

    console.log("📝 Created mock Web Streams");

    // Test publishing scenario (no scripts/stylesheets)
    await gilbert.compile({
      uris: {
        data: { stream: dataStream },
        theme: { stream: templateStream },
      },
      files: {
        stream: staticStream,
      },
      // Note: No scripts or stylesheets for publishing scenario
    });

    console.log("✅ Gilbert compile completed");

    // Collect output files
    const outputFiles = [];
    const reader = gilbert.stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      outputFiles.push({
        path: value.path,
        size: value.contents?.length || 0,
        type: value.contentType,
      });
    }

    console.log(`📄 Generated ${outputFiles.length} files:`);
    outputFiles.forEach((file) => {
      console.log(`  ${file.path} (${file.size} bytes, ${file.type})`);
    });

    return outputFiles;
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

/**
 * Export for use in other test files
 */
export {
  testStpPublishing,
  createMockDataStream,
  createMockTemplateStream,
  createMockStaticStream,
  mockStpData,
  mockTemplates,
  mockStaticFiles,
};

/**
 * Run test if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  testStpPublishing()
    .then(() => console.log("🎉 Test completed successfully"))
    .catch((error) => {
      console.error("💥 Test failed:", error);
      process.exit(1);
    });
}
