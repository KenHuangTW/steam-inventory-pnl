import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(scriptDir);
const distDir = join(rootDir, "dist");
const releaseDir = join(rootDir, "release");
const packageJsonPath = join(rootDir, "package.json");

if (!existsSync(distDir)) {
  console.error(`Missing dist directory at ${distDir}. Run the build first.`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const version = String(packageJson.version ?? "0.0.0");
const zipPath = join(releaseDir, `steam-inventory-pnl-chrome-v${version}.zip`);

mkdirSync(releaseDir, { recursive: true });
rmSync(zipPath, { force: true });

const archiveCommand = `Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force`;
const archiveResult = spawnSync("powershell.exe", ["-NoProfile", "-Command", archiveCommand], {
  cwd: rootDir,
  stdio: "inherit"
});

if (archiveResult.status !== 0) {
  process.exit(archiveResult.status ?? 1);
}

console.log(`Packaged extension into ${zipPath}`);
