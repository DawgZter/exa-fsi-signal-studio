import { spawn } from "node:child_process";
import { access, copyFile } from "node:fs/promises";
import { config } from "dotenv";
import { getOptionalEnv } from "../src/lib/env";

const envPath = ".env.local";

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(command + " " + args.join(" ") + " exited with code " + code));
    });
  });
}

if (!(await fileExists(envPath))) {
  await copyFile(".env.example", envPath);
  console.log("Created .env.local from .env.example.");
}

config({ path: envPath, override: true });

if (!getOptionalEnv("EXA_API_KEY")) {
  console.error("");
  console.error("Missing EXA_API_KEY in .env.local.");
  console.error("Paste your Exa API key into .env.local, then rerun:");
  console.error("");
  console.error("  npm run setup");
  console.error("");
  process.exit(1);
}

const forceNewWebset = hasFlag("--force-new-webset");
const skipSync = hasFlag("--skip-sync");
const existingWebsetId = getOptionalEnv("EXA_WEBSET_ID");

if (!existingWebsetId || forceNewWebset) {
  console.log("");
  console.log("Creating Exa Webset, initial searches, and daily monitor...");
  await run("npx", [
    "tsx",
    "scripts/create-webset-searches.ts",
    "--create-webset",
    "--create-broad-monitor",
    "--apply",
    "--write-env",
  ]);
} else {
  console.log("Using existing EXA_WEBSET_ID=" + existingWebsetId + ".");
}

if (!skipSync) {
  console.log("");
  console.log("Syncing Webset items into the local store...");
  await run("npx", ["tsx", "scripts/sync-webset.ts"]);
  console.log("");
  await run("npx", ["tsx", "scripts/inspect-store.ts"]);
}

console.log("");
console.log("Setup complete. Start the app with:");
console.log("");
console.log("  npm run dev");
console.log("");
