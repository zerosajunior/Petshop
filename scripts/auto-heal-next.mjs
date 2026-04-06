import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const projectDir = process.cwd();
const port = 3000;
const logFile = path.join(projectDir, ".petshop-dev.log");
const pidFile = path.join(projectDir, ".petshop-dev.pid");
const healerPidFile = path.join(projectDir, ".petshop-heal.pid");
const checkIntervalMs = 4000;
const cooldownMs = 20000;
const waitSeconds = 90;

const chunkErrorPattern =
  /Cannot find module '\.\/\d+\.js'|MODULE_NOT_FOUND.+\.next\/server\/webpack-runtime\.js|Cannot find module '.*\.next\/server\/app\/.*\/route\.js'|Failed to get source map:|\.next\/static\/chunks\/webpack\.js.+ENOENT|ENOENT: no such file or directory, stat '.*\.next\/cache\/webpack\/server-development\/.*\.pack\.gz'|originalFactory is undefined|can't access property "call"|__webpack_modules__\[moduleId\] is not a function|TypeError: __webpack_modules__\[moduleId\]/;

let lastCheckedLine = 0;
let lastHealAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appendLog(message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}${os.EOL}`);
}

function readPid(filePath) {
  try {
    const value = fs.readFileSync(filePath, "utf8").trim();
    return value ? Number.parseInt(value, 10) : null;
  } catch {
    return null;
  }
}

function removeFile(filePath) {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // Ignore cleanup failures.
  }
}

function isProcessRunning(pid) {
  if (!pid || Number.isNaN(pid)) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isListening() {
  return new Promise((resolve) => {
    const probe = spawn(
      process.execPath,
      [
        "-e",
        `
          const net = require("node:net");
          const socket = net.connect({ host: "127.0.0.1", port: ${port} });
          socket.once("connect", () => { socket.end(); process.exit(0); });
          socket.once("error", () => process.exit(1));
        `,
      ],
      { cwd: projectDir, stdio: "ignore" },
    );

    probe.on("exit", (code) => resolve(code === 0));
  });
}

async function waitForBoot() {
  for (let i = 0; i < waitSeconds; i += 1) {
    if (await isListening()) {
      return true;
    }
    await sleep(1000);
  }
  return false;
}

function getNewLogChunk() {
  if (!fs.existsSync(logFile)) {
    return "";
  }

  const lines = fs.readFileSync(logFile, "utf8").split(/\r?\n/);
  if (lines.length <= lastCheckedLine) {
    return "";
  }

  const newLines = lines.slice(lastCheckedLine).join("\n");
  lastCheckedLine = lines.length;
  return newLines;
}

async function stopCurrentServer() {
  const pid = readPid(pidFile);
  if (!pid || !isProcessRunning(pid)) {
    removeFile(pidFile);
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process may already be gone.
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 4000) {
    if (!isProcessRunning(pid)) {
      removeFile(pidFile);
      return;
    }
    await sleep(200);
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Process may already be gone.
  }
  removeFile(pidFile);
}

function startCleanServer() {
  const nextDir = path.join(projectDir, ".next");
  if (fs.existsSync(nextDir)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.renameSync(nextDir, path.join(projectDir, `.next.heal.${stamp}`));
  }

  const out = fs.openSync(logFile, "a");
  const child = spawn(process.execPath, [path.join(projectDir, "scripts", "dev-raw.mjs")], {
    cwd: projectDir,
    detached: true,
    stdio: ["ignore", out, out],
  });

  child.unref();
  fs.writeFileSync(pidFile, String(child.pid));
}

process.on("exit", () => removeFile(healerPidFile));
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
  fs.writeFileSync(healerPidFile, String(process.pid));

  if (fs.existsSync(logFile)) {
    lastCheckedLine = fs.readFileSync(logFile, "utf8").split(/\r?\n/).length;
  }

  while (readPid(pidFile)) {
    const newChunk = getNewLogChunk();
    if (newChunk && chunkErrorPattern.test(newChunk)) {
      const now = Date.now();
      if (now - lastHealAt >= cooldownMs) {
        appendLog("auto-heal: chunk error detected, restarting next dev with clean build");
        await stopCurrentServer();
        startCleanServer();

        if (await waitForBoot()) {
          appendLog("auto-heal: server recovered");
        } else {
          appendLog("auto-heal: server did not respond after recovery");
        }

        lastHealAt = now;
      }
    }

    await sleep(checkIntervalMs);
  }
}

main().catch((error) => {
  appendLog(`auto-heal failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
