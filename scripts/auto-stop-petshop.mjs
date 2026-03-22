import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const projectDir = process.cwd();
const pidFile = path.join(projectDir, ".petshop-dev.pid");
const stopPidFile = path.join(projectDir, ".petshop-stop.pid");
const logFile = path.join(projectDir, ".petshop-dev.log");
const checkIntervalMs = 10000;
const idleLimitMs = 15 * 60 * 1000;

let idleForMs = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appendLog(message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}${os.EOL}`);
}

function readPid() {
  try {
    const value = fs.readFileSync(pidFile, "utf8").trim();
    return value ? Number.parseInt(value, 10) : null;
  } catch {
    return null;
  }
}

function removeStopPid() {
  try {
    fs.rmSync(stopPidFile, { force: true });
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

function hasRecentLogActivity() {
  try {
    const stats = fs.statSync(logFile);
    return Date.now() - stats.mtimeMs < checkIntervalMs * 2;
  } catch {
    return false;
  }
}

process.on("exit", removeStopPid);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
  fs.writeFileSync(stopPidFile, String(process.pid));

  while (true) {
    const serverPid = readPid();
    if (!serverPid || !isProcessRunning(serverPid)) {
      break;
    }

    if (hasRecentLogActivity()) {
      idleForMs = 0;
    } else {
      idleForMs += checkIntervalMs;
    }

    if (idleForMs >= idleLimitMs) {
      appendLog(`idle timeout reached, stopping dev server pid=${serverPid}`);
      try {
        process.kill(serverPid, "SIGTERM");
      } catch {
        // Process may already be gone.
      }
      break;
    }

    await sleep(checkIntervalMs);
  }
}

main().catch((error) => {
  appendLog(`auto-stop failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});

