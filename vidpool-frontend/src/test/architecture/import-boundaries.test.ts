import { describe, expect, it } from "vitest"
import fs from "node:fs/promises"
import path from "node:path"

async function getSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") {
        files.push(...(await getSourceFiles(fullPath)))
      }
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

describe("Architecture Import Boundaries", () => {
  const srcRoot = path.resolve(process.cwd(), "src")

  it("forbids legacy runtime and api-client imports across src/", async () => {
    const allFiles = await getSourceFiles(srcRoot)
    const violations: { file: string; match: string }[] = []

    const forbiddenPatterns = [
      /@\/lib\/api-client/,
      /@\/runtime\/runtime-config/,
      /@\/app\/api-client-context/,
      /@\/features\/accounts/,
    ]

    for (const file of allFiles) {
      // Exclude this test file
      if (file.endsWith("import-boundaries.test.ts")) {
        continue
      }

      const content = await fs.readFile(file, "utf-8")
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push({
            file: path.relative(srcRoot, file),
            match: pattern.source,
          })
        }
      }
    }

    expect(violations).toEqual([])
  })

  it("ensures legacy src/features/accounts directory does not exist", async () => {
    const legacyAccountsDir = path.join(srcRoot, "features", "accounts")
    let exists = false
    try {
      await fs.access(legacyAccountsDir)
      exists = true
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })
})
