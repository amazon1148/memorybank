import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"
import {
	getMemorybankProgress,
	MemorybankProgress,
	MemorybankSection,
	MemorybankSubsection,
	MemorybankItem,
} from "./memorybank-parser.js"

/**
 * Create a test item with the given text and status
 */
function createItem(text: string, status: MemorybankItem["status"]): MemorybankItem {
	return { text, status }
}

/**
 * Create a test subsection with the given title and items
 */
function createSubsection(title: string, items: MemorybankItem[]): MemorybankSubsection {
	return { title, items }
}

/**
 * Create a test section with the given title and subsections
 */
function createSection(title: string, subsections: MemorybankSubsection[]): MemorybankSection {
	return { title, subsections }
}

describe("memorybank-parser", () => {
	const testDir = path.join(os.tmpdir(), "memorybank-parser-test")
	const testFile = path.join(testDir, "test.md")

	beforeEach(async () => {
		await fs.mkdir(testDir, { recursive: true })
	})

	afterEach(async () => {
		await fs.rm(testDir, { recursive: true, force: true })
	})

	it("should parse complete progress structure", async () => {
		const content = `
## Section 1
### Subsection 1.1
- ✅ Completed item
- ⚠️ Partial item
- ❌ Failed item
- Pending item

### Subsection 1.2
- ✅ Another completed item

## Section 2
- ✅ Direct section item
`

		await fs.writeFile(testFile, content)
		const result = await getMemorybankProgress(testFile)

		const expectedProgress: MemorybankProgress = {
			sections: [
				createSection("Section 1", [
					createSubsection("Subsection 1.1", [
						createItem("Completed item", "✅"),
						createItem("Partial item", "⚠️"),
						createItem("Failed item", "❌"),
						createItem("Pending item", "pending"),
					]),
					createSubsection("Subsection 1.2", [createItem("Another completed item", "✅")]),
				]),
				createSection("Section 2", [createSubsection("Default", [createItem("Direct section item", "✅")])]),
			],
		}

		expect(result).toEqual(expectedProgress)
	})

	it("should handle empty progress", async () => {
		const content = ""
		await fs.writeFile(testFile, content)

		const result = await getMemorybankProgress(testFile)
		const expectedProgress: MemorybankProgress = {
			sections: [],
		}

		expect(result).toEqual(expectedProgress)
	})

	it("should handle progress with empty sections", async () => {
		const content = `
## Empty Section 1
## Empty Section 2
`

		await fs.writeFile(testFile, content)
		const result = await getMemorybankProgress(testFile)

		const expectedProgress: MemorybankProgress = {
			sections: [createSection("Empty Section 1", []), createSection("Empty Section 2", [])],
		}

		expect(result).toEqual(expectedProgress)
	})

	it("should handle progress with empty subsections", async () => {
		const content = `
## Section 1
### Empty Subsection 1
### Empty Subsection 2
`

		await fs.writeFile(testFile, content)
		const result = await getMemorybankProgress(testFile)

		const expectedProgress: MemorybankProgress = {
			sections: [
				createSection("Section 1", [
					createSubsection("Empty Subsection 1", []),
					createSubsection("Empty Subsection 2", []),
				]),
			],
		}

		expect(result).toEqual(expectedProgress)
	})

	it("should throw error for subsection before section", async () => {
		const content = `
### Invalid Subsection
- Item
`

		await fs.writeFile(testFile, content)
		await expect(getMemorybankProgress(testFile)).rejects.toThrow("Found subsection before section")
	})

	it("should throw error for item before section", async () => {
		const content = `
- Invalid Item
`

		await fs.writeFile(testFile, content)
		await expect(getMemorybankProgress(testFile)).rejects.toThrow("Found item before section")
	})
})
