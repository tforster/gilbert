/**
 * Gilbert Test Suite - Main Test Runner
 * Runs all Gilbert tests synchronously to prevent dist directory conflicts
 */

// Import all test files - they will run sequentially when imported
import "./templates.test.js";
import "./static-files.test.js";
import "./scripts.test.js";
import "./stylesheets.test.js";
import "./middleware.test.js";
import "./full.test.js";
