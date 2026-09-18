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
      /@\/app\/shell/,
      /@\/app\/store/,
      /useNavigationStore/,
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

  it("ensures legacy src/features/accounts and page-shaped feature directories do not exist", async () => {
    const forbiddenFeatureDirs = [
      "accounts",
      "dashboard",
      "projects",
      "editor",
      "characters",
      "jobs",
      "settings",
      "visual-beat",
      "voice",
    ]
    for (const subDir of forbiddenFeatureDirs) {
      const fullDir = path.join(srcRoot, "features", subDir)
      let exists = false
      try {
        await fs.access(fullDir)
        exists = true
      } catch {
        exists = false
      }
      expect(exists, `features/${subDir} should not exist`).toBe(false)
    }
  })

  it("ensures legacy src/components directory does not exist", async () => {
    const componentsDir = path.join(srcRoot, "components")
    let exists = false
    try {
      await fs.access(componentsDir)
      exists = true
    } catch {
      exists = false
    }
    expect(exists, "src/components should not exist").toBe(false)
  })

  it("ensures legacy src/lib and root src/App.tsx do not exist", async () => {
    for (const subPath of ["lib", "App.tsx"]) {
      const fullPath = path.join(srcRoot, subPath)
      let exists = false
      try {
        await fs.access(fullPath)
        exists = true
      } catch {
        exists = false
      }
      expect(exists, `src/${subPath} should not exist`).toBe(false)
    }
  })

  it("ensures legacy src/app/shell and src/app/store directories do not exist", async () => {
    for (const subDir of [path.join("app", "shell"), path.join("app", "store")]) {
      const fullDir = path.join(srcRoot, subDir)
      let exists = false
      try {
        await fs.access(fullDir)
        exists = true
      } catch {
        exists = false
      }
      expect(exists, `${subDir} should not exist`).toBe(false)
    }
  })

  it("enforces FSD layer dependency directions", async () => {
    const allFiles = await getSourceFiles(srcRoot)
    const violations: { file: string; importTarget: string; rule: string }[] = []

    const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g

    for (const file of allFiles) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx") || file.includes(path.join("test", "fixtures"))) {
        continue
      }

      const relPath = path.relative(srcRoot, file).replace(/\\/g, "/")
      const content = await fs.readFile(file, "utf-8")

      const matches = [...content.matchAll(importRegex)]
      for (const match of matches) {
        const target = match[1]

        // Rule 1: shared cannot import entities, features, widgets, pages, app
        if (relPath.startsWith("shared/")) {
          if (
            target.startsWith("@/entities") ||
            target.startsWith("@/features") ||
            target.startsWith("@/widgets") ||
            target.startsWith("@/pages") ||
            target.startsWith("@/app")
          ) {
            violations.push({ file: relPath, importTarget: target, rule: "shared cannot import higher layers" })
          }
        }

        // Rule 2: entities cannot import features, widgets, pages, app
        if (relPath.startsWith("entities/")) {
          if (
            target.startsWith("@/features") ||
            target.startsWith("@/widgets") ||
            target.startsWith("@/pages") ||
            target.startsWith("@/app")
          ) {
            violations.push({ file: relPath, importTarget: target, rule: "entities cannot import higher layers" })
          }
        }

        // Rule 3: features cannot import sibling features, widgets, pages, app
        if (relPath.startsWith("features/")) {
          const currentFeature = relPath.split("/")[1]
          if (target.startsWith("@/features/")) {
            const importedFeature = target.replace("@/features/", "").split("/")[0]
            if (importedFeature !== currentFeature) {
              violations.push({ file: relPath, importTarget: target, rule: "features cannot import sibling features" })
            }
          }
          if (
            target.startsWith("@/widgets") ||
            target.startsWith("@/pages") ||
            target.startsWith("@/app")
          ) {
            violations.push({ file: relPath, importTarget: target, rule: "features cannot import higher layers" })
          }
        }

        // Rule 4: widgets cannot import pages or app
        if (relPath.startsWith("widgets/")) {
          if (target.startsWith("@/pages") || target.startsWith("@/app")) {
            violations.push({ file: relPath, importTarget: target, rule: "widgets cannot import pages or app" })
          }
        }

        // Rule 5: pages cannot import app
        if (relPath.startsWith("pages/")) {
          if (target.startsWith("@/app")) {
            violations.push({ file: relPath, importTarget: target, rule: "pages cannot import app" })
          }
        }
      }
    }

    expect(violations).toEqual([])
  })

  it("forbids remote image URLs like Unsplash to ensure Tauri CSP safety", async () => {
    const allFiles = await getSourceFiles(srcRoot)
    const violations: { file: string; match: string }[] = []

    const remoteImagePattern = /images\.unsplash\.com/

    for (const file of allFiles) {
      if (file.endsWith("import-boundaries.test.ts")) {
        continue
      }

      const content = await fs.readFile(file, "utf-8")
      if (remoteImagePattern.test(content)) {
        violations.push({
          file: path.relative(srcRoot, file),
          match: "images.unsplash.com",
        })
      }
    }

    expect(violations).toEqual([])
  })
})
