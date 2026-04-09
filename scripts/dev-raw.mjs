import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";

const projectDir = process.cwd();
const host = process.env.PETSHOP_DEV_HOST?.trim() || "0.0.0.0";
const port = process.env.PORT?.trim() || "3000";
const nextBin = path.join(
  projectDir,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", host, "-p", port],
  {
    cwd: projectDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_DISABLE_WEBPACK_CACHE: "1",
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
