/**
 * @description Root test runner that executes all workspace tests sequentially and prints a
 * unified pass/fail summary at the end. Output is streamed in real-time; the process exits with
 * the same code as the underlying npm workspace runner.
 */
import { spawn } from "node:child_process";

let totalPass = 0;
let totalFail = 0;

/**
 * Process one line of test runner output: print it and accumulate pass/fail counts.
 * @param {string} line
 */
function processLine(line) {
  process.stdout.write(line + "\n");

  // Node.js built-in test runner emits: "ℹ pass N" and "ℹ fail N"
  if (line.includes("ℹ pass ")) {
    totalPass += parseInt(line.trim().split(/\s+/).pop(), 10) || 0;
  } else if (line.includes("ℹ fail ")) {
    totalFail += parseInt(line.trim().split(/\s+/).pop(), 10) || 0;
  }
}

// --workspaces runs the test script in each workspace package only, not in the root.
// --workspace-concurrency=1 keeps output readable and prevents dist directory collisions.
const child = spawn("npm", ["run", "test", "--workspaces", "--if-present", "--workspace-concurrency=1"], {
  stdio: ["inherit", "pipe", "pipe"],
  shell: false,
  env: { ...process.env, FORCE_COLOR: "1" },
});

// Buffer incomplete lines so split output chunks are handled correctly
let stdoutRemainder = "";
let stderrRemainder = "";

child.stdout.on("data", (chunk) => {
  const text = stdoutRemainder + chunk.toString();
  const lines = text.split("\n");
  stdoutRemainder = lines.pop();
  lines.forEach(processLine);
});

child.stderr.on("data", (chunk) => {
  const text = stderrRemainder + chunk.toString();
  const lines = text.split("\n");
  stderrRemainder = lines.pop();
  lines.forEach((line) => process.stderr.write(line + "\n"));
});

child.on("close", (code) => {
  // Flush any remaining partial line
  if (stdoutRemainder) processLine(stdoutRemainder);
  if (stderrRemainder) process.stderr.write(stderrRemainder + "\n");

  const bar = "─".repeat(44);
  const status = totalFail > 0 ? `${totalPass} passed, ${totalFail} FAILED` : `${totalPass} passed`;
  process.stdout.write(`\n${bar}\n  Total: ${status}\n${bar}\n`);

  process.exit(code ?? 0);
});
