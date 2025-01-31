import { describe, it, expect } from "vitest"
import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
	getMemorybankProgress,
	MemorybankProgress,
	MemorybankSection,
	MemorybankSubsection,
	MemorybankItem,
} from "../memorybank-parser.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, "fixtures")

describe("memorybank-parser", () => {
	describe("getMemorybankProgress", () => {
		it("should parse markdown file and extract progress information", async () => {
			const progress = await getMemorybankProgress(path.join(FIXTURES_DIR, "test-progress.md"))

			// Verify overall structure matches MemorybankProgress type
			expect(progress).toBeDefined()
			const typedProgress: MemorybankProgress = progress
			expect(typedProgress.sections).toHaveLength(1) // Only Implementation Status section

			const section: MemorybankSection = progress.sections[0]
			expect(section.title).toBe("Implementation Status")
			expect(section.subsections).toHaveLength(2)
// Verify Core Features subsection
const coreFeatures: MemorybankSubsection = section.subsections[0]
expect(coreFeatures.title).toBe("Core Features")
expect(coreFeatures.items).toHaveLength(4)

// Verify different status types
const [completed, inProgress, notStarted, regular]: MemorybankItem[] = coreFeatures.items

expect(completed.status).toBe("✅")
			expect(completed.text).toBe("Completed feature")

			expect(inProgress.status).toBe("⚠️")
			expect(inProgress.text).toBe("In progress feature")

			expect(notStarted.status).toBe("❌")
			expect(notStarted.text).toBe("Not started feature")

			expect(regular.status).toBe("pending")
			expect(regular.text).toBe("Regular item without status")

			// Verify Testing subsection
			const testing: MemorybankSubsection = section.subsections[1]
			expect(testing.title).toBe("Testing")
			expect(testing.items).toHaveLength(3)
		})

		it("should handle missing Implementation Status section", async () => {
			// Create a temporary file without Implementation Status section
			const tempPath = path.join(FIXTURES_DIR, "temp-no-status.md")
			await fs.writeFile(tempPath, "# Progress\n\n## Other Section\n- Item 1\n")

			try {
				await expect(getMemorybankProgress(tempPath)).rejects.toThrow("No Implementation Status section found")
			} finally {
				await fs.unlink(tempPath)
			}
		})

		it("should handle empty file", async () => {
			const tempPath = path.join(FIXTURES_DIR, "temp-empty.md")
			await fs.writeFile(tempPath, "")

			try {
				await expect(getMemorybankProgress(tempPath)).rejects.toThrow("No Implementation Status section found")
			} finally {
				await fs.unlink(tempPath)
			}
		})

		it("should throw error for non-existent file", async () => {
			const nonExistentPath = path.join(FIXTURES_DIR, "non-existent.md")
			await expect(getMemorybankProgress(nonExistentPath)).rejects.toThrow()
		})

		it("should handle subsection without items", async () => {
			const tempPath = path.join(FIXTURES_DIR, "temp-empty-subsection.md")
			await fs.writeFile(tempPath, "# Progress\n\n## Implementation Status\n\n### Empty Section\n")

			try {
				const progress: MemorybankProgress = await getMemorybankProgress(tempPath)
				const section: MemorybankSection = progress.sections[0]
				const emptySubsection: MemorybankSubsection = section.subsections[0]
				expect(emptySubsection.items).toHaveLength(0)
			} finally {
				await fs.unlink(tempPath)
			}
		})
	})
})
