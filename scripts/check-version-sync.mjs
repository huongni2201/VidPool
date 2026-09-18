import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

const packageJsonPath = path.join(rootDir, "vidpool-frontend", "package.json")
const tauriConfPath = path.join(rootDir, "vidpool-frontend", "src-tauri", "tauri.conf.json")
const cargoTomlPath = path.join(rootDir, "vidpool-frontend", "src-tauri", "Cargo.toml")

function readJsonVersion(filePath) {
  const content = fs.readFileSync(filePath, "utf-8")
  const parsed = JSON.parse(content)
  return parsed.version
}

function readCargoVersion(filePath) {
  const content = fs.readFileSync(filePath, "utf-8")
  const match = content.match(/\[package\][\s\S]*?version\s*=\s*"([^"]+)"/)
  if (!match) {
    throw new Error(`Could not extract version from ${filePath}`)
  }
  return match[1]
}

const packageVersion = readJsonVersion(packageJsonPath)
const tauriVersion = readJsonVersion(tauriConfPath)
const cargoVersion = readCargoVersion(cargoTomlPath)

console.log(`[version-sync] vidpool-frontend/package.json: ${packageVersion}`)
console.log(`[version-sync] src-tauri/tauri.conf.json:   ${tauriVersion}`)
console.log(`[version-sync] src-tauri/Cargo.toml:        ${cargoVersion}`)

if (packageVersion !== tauriVersion || packageVersion !== cargoVersion) {
  console.error(
    `\n[ERROR] Version mismatch detected!\n` +
      `  package.json:    ${packageVersion}\n` +
      `  tauri.conf.json: ${tauriVersion}\n` +
      `  Cargo.toml:      ${cargoVersion}\n`
  )
  process.exit(1)
}

console.log(`[version-sync] All versions synchronized to ${packageVersion}.`)
