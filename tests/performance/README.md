# Performance Test

A comprehensive performance test for Gilbert Static Site Generator that generates and processes 200+ pages with various assets.

## Quick Start

```bash
# Generate all test data (run once or when you want fresh data)
node generate-test-data.js

# Run the performance test
node test-runner.js
```

## What Gets Generated

### Test Data (`.gitignored`)

- **data.json** - Master data file (190 blog posts + 3 static pages)
- **data/** - Individual JSON files for each page (Gilbert format)
- **src/files/** - 20 test images (JPG, PNG, WebP) totaling ~1.7MB

### Test Results

- **217 total files**: 193 HTML pages + 4 processed assets + 20 static images
- **Performance target**: < 1 second for "Good performance"
- **Current baseline**: ~550ms average (350+ pages/second)

## File Structure

```shell
big/
├── generate-test-data.js    # Single script to generate all test data
├── test-runner.js          # Performance test runner
├── package.json           # Dependencies and scripts
├── manifest.json          # Test configuration
└── templates/             # Handlebars templates
    ├── home.hbs
    ├── about.hbs
    ├── blog-landing.hbs
    ├── blog-post.hbs
    └── components/
        ├── head.hbs
        ├── header.hbs
        └── footer.hbs
```

## Generated Files (gitignored)

- `data.json` - Master test data
- `data/` - Individual page data files
- `src/files/` - Test image assets
- `dist/` - Generated output

## Test Pipelines

The test exercises all 4 Gilbert pipelines:

1. **Templates Pipeline** - 193 HTML pages using Handlebars
2. **Scripts Pipeline** - ES6 module processing with esbuild
3. **Stylesheets Pipeline** - CSS processing
4. **Static Files Pipeline** - 20 image assets (JPG/PNG/WebP)

## Performance Benchmarks

- 🚀 **Excellent**: < 500ms
- ✅ **Good**: < 1s
- ⚠️ **Acceptable**: < 2s
- 🐌 **Needs optimization**: > 2s

## Regenerating Data

To create fresh test data:

```bash
# Regenerate everything (images, JSON, individual files)
node generate-test-data.js

# Test will automatically use existing data.json if available
# or regenerate if missing
node test-runner.js
```

## Requirements

- Node.js 22+
- ImageMagick (for image generation)
  ```bash
  sudo apt install imagemagick  # Ubuntu/Debian
  brew install imagemagick      # macOS
  ```
