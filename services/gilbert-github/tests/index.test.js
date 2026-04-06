// Barrel test runner for gilbert-github
// This imports all tests synchronously to prevent race conditions with shared dist directories

import "./gilbert-github-read.test.js";
import "./github-files.test.js";
import "./tarstream.test.js";
