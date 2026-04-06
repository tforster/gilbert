/**
 * Complete Test Data Generator for Big Test
 * Generates all test data including JSON, individual data files, and image assets
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lorem ipsum word bank
const loremWords = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
  "duis",
  "aute",
  "irure",
  "in",
  "reprehenderit",
  "voluptate",
  "velit",
  "esse",
  "cillum",
  "fugiat",
  "nulla",
  "pariatur",
  "excepteur",
  "sint",
  "occaecat",
  "cupidatat",
  "non",
  "proident",
  "sunt",
  "culpa",
  "qui",
  "officia",
  "deserunt",
  "mollit",
  "anim",
  "id",
  "est",
  "laborum",
  "suscipit",
  "lobortis",
  "nisl",
  "aliquam",
  "erat",
  "volutpat",
  "blandit",
  "hendrerit",
  "vulputate",
  "eleifend",
  "tellus",
  "integer",
  "tincidunt",
  "cursus",
  "vitae",
  "congue",
  "mauris",
  "rhoncus",
  "aenean",
  "vel",
  "elit",
  "scelerisque",
  "feugiat",
  "vivamus",
  "arcu",
  "felis",
  "bibendum",
  "ultrices",
  "ante",
  "fermentum",
  "posuere",
  "urna",
  "nec",
  "tincidunt",
  "praesent",
  "semper",
  "feugiat",
  "nibh",
];

// Sample authors, categories, and tags
const authors = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Davis",
  "David Wilson",
  "Emma Brown",
  "Frank Miller",
  "Grace Lee",
  "Henry Taylor",
];
const categories = ["Technology", "Design", "Development", "Business", "Marketing", "Productivity", "Innovation", "Strategy"];
const tags = [
  "web",
  "mobile",
  "ui",
  "ux",
  "javascript",
  "css",
  "html",
  "react",
  "node",
  "api",
  "performance",
  "seo",
  "accessibility",
  "security",
];

/**
 * Generate random lorem ipsum text
 */
function generateLoremIpsum(wordCount) {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
  }
  return words.join(" ");
}

/**
 * Generate a random date within the last 2 years
 */
function generateRandomDate() {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);
  const end = new Date();
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString().split("T")[0];
}

/**
 * Create a URL-safe slug from text
 */
function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim("-");
}

/**
 * Generate unique blog post slug
 */
function generateUniqueSlug(title, existingSlugs) {
  const baseSlug = createSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  existingSlugs.add(slug);
  return slug;
}

/**
 * Generate test images using ImageMagick
 */
async function generateTestImages() {
  console.log("🖼️  Generating test images...");

  const filesDir = path.join(__dirname, "src", "files");

  // Clear existing files directory
  if (fs.existsSync(filesDir)) {
    fs.rmSync(filesDir, { recursive: true });
  }
  fs.mkdirSync(filesDir, { recursive: true });

  // Check if ImageMagick is available
  try {
    execSync("which convert", { stdio: "ignore" });
  } catch {
    console.log("⚠️  ImageMagick not found. Install with: sudo apt install imagemagick");
    console.log("⚠️  Skipping image generation...");
    return;
  }

  const imageConfigs = [
    // JPG images
    { name: "test-image-01.jpg", size: "400x300", bg: "red", quality: 75, text: "Test Image 1" },
    { name: "test-image-02.jpg", size: "500x400", bg: "blue", quality: 80, text: "Test Image 2" },
    { name: "test-image-03.jpg", size: "600x450", bg: "plasma:fractal", quality: 85, text: "Test Image 3", useSpecial: true },
    { name: "test-image-04.jpg", size: "550x350", bg: "green", quality: 70, shape: "circle 275,175 375,275" },
    { name: "test-image-05.jpg", size: "450x380", bg: "purple", quality: 90, text: "Test Image 5" },
    {
      name: "test-image-06.jpg",
      size: "480x320",
      bg: "plasma:",
      quality: 75,
      shape: "rectangle 100,100 380,220",
      useSpecial: true,
    },
    { name: "test-image-07.jpg", size: "520x420", bg: "cyan", quality: 85, shape: "ellipse 260,210 150,120 0,360" },

    // PNG images
    { name: "test-image-08.png", size: "420x350", bg: "magenta", text: "PNG Test 1" },
    { name: "test-image-09.png", size: "380x280", bg: "blue", shape: "polygon 100,100 280,100 190,200" },
    { name: "test-image-10.png", size: "460x340", bg: "plasma:fractal", text: "PNG Test 3", useSpecial: true },
    { name: "test-image-11.png", size: "500x380", bg: "yellow", shape: "circle 250,190 350,290" },
    { name: "test-image-12.png", size: "440x360", bg: "green", text: "PNG Test 5" },
    { name: "test-image-13.png", size: "490x310", bg: "plasma:", shape: "rectangle 120,80 370,230", useSpecial: true },
    { name: "test-image-14.png", size: "510x390", bg: "orange", shape: "ellipse 255,195 180,140 0,360" },

    // WebP images
    { name: "test-image-15.webp", size: "430x320", bg: "lime", quality: 85, text: "WebP Test 1" },
    { name: "test-image-16.webp", size: "470x370", bg: "cyan", quality: 90, shape: "polygon 150,80 320,80 235,250" },
    { name: "test-image-17.webp", size: "450x330", bg: "plasma:fractal", quality: 80, text: "WebP Test 3", useSpecial: true },
    { name: "test-image-18.webp", size: "480x350", bg: "navy", quality: 85, shape: "circle 240,175 340,275" },
    { name: "test-image-19.webp", size: "460x380", bg: "yellow", quality: 75, text: "WebP Test 5" },
    {
      name: "test-image-20.webp",
      size: "500x340",
      bg: "plasma:",
      quality: 88,
      shape: "rectangle 130,90 370,250",
      useSpecial: true,
    },
  ];

  for (const config of imageConfigs) {
    try {
      let command;

      if (config.useSpecial) {
        // Special plasma/fractal patterns
        command = `convert -size ${config.size} ${config.bg}`;
      } else {
        // Solid colors
        command = `convert -size ${config.size} xc:${config.bg}`;
      }

      if (config.quality) {
        command += ` -quality ${config.quality}`;
      }

      if (config.text) {
        command += ` -draw "text 50,${Math.floor(parseInt(config.size.split("x")[1]) / 2)} '${config.text}'"`;
      }

      if (config.shape) {
        command += ` -draw "${config.shape}"`;
      }

      command += ` "${path.join(filesDir, config.name)}"`;

      execSync(command, { stdio: "ignore" });
    } catch (error) {
      console.log(`⚠️  Failed to generate ${config.name}: ${error.message}`);
    }
  }

  // Count generated files
  const generatedFiles = fs.readdirSync(filesDir);
  console.log(`✓ Generated ${generatedFiles.length} test images`);

  // Show total size
  let totalSize = 0;
  for (const file of generatedFiles) {
    const stats = fs.statSync(path.join(filesDir, file));
    totalSize += stats.size;
  }
  console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Generate master data.json file
 */
function generateMasterData() {
  console.log("📊 Generating master data.json...");

  const data = {
    site: {
      title: "Gilbert Performance Test Site",
      description: "A comprehensive test site for Gilbert static site generator performance testing",
      baseUrl: "https://example.com",
      version: "1.0.0",
    },
    pages: {},
    blogPosts: [],
  };

  // Generate static pages
  data.pages.home = {
    uri: "/index.html",
    webProducerKey: "home",
    title: "Home - Gilbert Test Site",
    description: "Welcome to our comprehensive Gilbert performance test site",
    content: generateLoremIpsum(100),
    featured: true,
  };

  data.pages.about = {
    uri: "/about/index.html",
    webProducerKey: "about",
    title: "About - Gilbert Test Site",
    description: "Learn more about this Gilbert performance test site",
    content: generateLoremIpsum(150),
  };

  data.pages["blog-landing"] = {
    uri: "/blog/index.html",
    webProducerKey: "blog-landing",
    title: "Blog - Gilbert Test Site",
    description: "Read our latest blog posts about web development and technology",
    content: generateLoremIpsum(80),
  };

  // Generate blog posts
  const existingSlugs = new Set();

  for (let i = 1; i <= 190; i++) {
    const title = `${generateLoremIpsum(3)} ${i}`;
    const slug = generateUniqueSlug(title, existingSlugs);

    const post = {
      id: i,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      slug: slug,
      author: authors[Math.floor(Math.random() * authors.length)],
      date: generateRandomDate(),
      category: categories[Math.floor(Math.random() * categories.length)],
      tags: tags.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 2),
      excerpt: generateLoremIpsum(25),
      content: generateLoremIpsum(200),
      featured: Math.random() < 0.1, // 10% chance of being featured
      readingTime: Math.floor(Math.random() * 10) + 2, // 2-12 minutes
    };

    data.blogPosts.push(post);
  }

  // Sort blog posts by date (newest first)
  data.blogPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Add recent posts to blog landing page
  data.pages["blog-landing"].recentPosts = data.blogPosts.slice(0, 6).map((post) => ({
    title: post.title,
    url: `/blog/${post.slug}/`,
    author: post.author,
    date: post.date,
    category: post.category,
    excerpt: post.excerpt.substring(0, 150) + "...",
  }));

  // Write the master data file
  const outputPath = path.join(__dirname, "data.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`✓ Generated ${data.blogPosts.length} blog posts`);
  console.log(`✓ Total pages: ${Object.keys(data.pages).length + data.blogPosts.length}`);

  const stats = fs.statSync(outputPath);
  console.log(`✓ Data file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  return data;
}

/**
 * Create individual data files for Gilbert
 */
function createIndividualDataFiles(data) {
  console.log("📁 Creating individual data files...");

  const dataDir = path.join(__dirname, "src", "data");

  // Clear existing data directory
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true });
  }
  fs.mkdirSync(dataDir, { recursive: true });

  // Create individual data files for static pages
  const staticPages = [
    { key: "home", uri: "/index.html" },
    { key: "about", uri: "/about/index.html" },
    { key: "blog-landing", uri: "/blog/index.html" },
  ];

  for (const page of staticPages) {
    const pageData = {
      ...data.pages[page.key],
      ...data, // Add global site variables
    };

    const filePath = path.join(dataDir, `${page.key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
  }

  // Create blog posts directory
  const blogDir = path.join(dataDir, "blog");
  fs.mkdirSync(blogDir, { recursive: true });

  // Create individual data files for blog posts
  for (const post of data.blogPosts) {
    const postData = {
      uri: `/blog/${post.slug}.html`,
      webProducerKey: "blog-post", // All blog posts use the same template
      ...post,
      ...data, // Add global site variables
    };

    const filePath = path.join(blogDir, `${post.slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(postData, null, 2));
  }

  console.log(`✓ Created ${staticPages.length} static page data files`);
  console.log(`✓ Created ${data.blogPosts.length} blog post data files`);
  console.log(`✓ Total data files: ${staticPages.length + data.blogPosts.length}`);
}

/**
 * Main generation function
 */
async function generateAllTestData() {
  console.log("🚀 Generating Complete Test Data Set");
  console.log("====================================\n");

  try {
    // Generate test images
    await generateTestImages();
    console.log();

    // Generate master data
    const data = generateMasterData();
    console.log();

    // Create individual data files
    createIndividualDataFiles(data);
    console.log();

    console.log("✅ Test data generation completed successfully!");
    console.log("\nGenerated files:");
    console.log("  📄 data.json (master data file)");
    console.log("  📁 data/ (individual JSON files for Gilbert)");
    console.log("  🖼️  src/files/ (test image assets)");
    console.log("\n💡 These files are .gitignored and will be regenerated as needed.");
  } catch (error) {
    console.error("❌ Test data generation failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllTestData();
}

export { generateAllTestData, createIndividualDataFiles };
