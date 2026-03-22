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
const autoStopPidFile = path.join(projectDir, ".petshop-stop.pid");
const waitSeconds = 90;

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

function stopPidFromFile(filePath) {
  const pid = readPid(filePath);
  if (!pid || !isProcessRunning(pid)) {
    removeFile(filePath);
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process may already be gone.
  }
}

async function waitForExit(filePath, timeoutMs = 4000) {
  const pid = readPid(filePath);
  if (!pid) {
    removeFile(filePath);
    return;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!isProcessRunning(pid)) {
      removeFile(filePath);
      return;
    }
    await sleep(200);
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Process may already be gone.
  }
  removeFile(filePath);
}

async function stopStaleProcesses() {
  stopPidFromFile(pidFile);
  stopPidFromFile(healerPidFile);
  stopPidFromFile(autoStopPidFile);

  await waitForExit(pidFile);
  await waitForExit(healerPidFile);
  await waitForExit(autoStopPidFile);
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

function startWorker(scriptPath, pidPath) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: projectDir,
    detached: true,
    stdio: "ignore",
  });

  child.unref();
  fs.writeFileSync(pidPath, String(child.pid));
}

function startServer() {
  try {
    fs.rmSync(path.join(projectDir, ".next"), { recursive: true, force: true });
  } catch {
    // Ignore cleanup failures.
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

async function main() {
  if (!fs.existsSync(path.join(projectDir, "node_modules"))) {
    appendLog("node_modules not found; run npm install before starting the app");
    process.exit(1);
  }

  await stopStaleProcesses();

  if (!(await isListening())) {
    startServer();

    if (!(await waitForBoot())) {
      appendLog("first boot attempt failed, retrying clean start");
      await stopStaleProcesses();
      startServer();
      await waitForBoot();
    }
  }

  if (readPid(pidFile)) {
    startWorker(path.join(projectDir, "scripts", "auto-stop-petshop.mjs"), autoStopPidFile);
    startWorker(path.join(projectDir, "scripts", "auto-heal-next.mjs"), healerPidFile);
  }

  if (!(await isListening())) {
    appendLog(`server did not start within ${waitSeconds}s`);
    process.exit(1);
  }
}

main().catch((error) => {
  appendLog(`start-petshop failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});

