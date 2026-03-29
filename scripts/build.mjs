import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(scriptDir);
const distDir = join(rootDir, "dist");
const staticDir = join(rootDir, "static");
const tscPath = join(rootDir, "node_modules", "typescript", "bin", "tsc");

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const compileResult = spawnSync(process.execPath, [tscPath, "-p", join(rootDir, "tsconfig.json")], {
  cwd: rootDir,
  stdio: "inherit"
});

if (compileResult.status !== 0) {
  process.exit(compileResult.status ?? 1);
}

if (existsSync(staticDir)) {
  cpSync(staticDir, distDir, { recursive: true });
}

console.log(`Built extension into ${distDir}`);
