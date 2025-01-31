import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest"
import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"
import type { ChildProcess } from "node:child_process"

// Mock modules before any imports
vi.mock("node:child_process", () => ({
	exec: vi.fn(),
	promisify: vi.fn((fn) => fn),
}))

import {
	toTildePath,
	getDocsPathValue,
	validateRepositories,
	getGitPath,
	processDocsDirectory,
} from "../memorybank-status.js"

// Mock console methods
const consoleMock = {
	log: vi.fn(),
	error: vi.fn(),
}

// Replace console methods
const originalConsole = global.console
global.console = { ...originalConsole, ...consoleMock }

// Mock process.exit
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)

// Get the mocked exec function
const mockExec = vi.mocked(await import("node:child_process")).exec

describe("memorybank-status", () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	afterAll(() => {
		global.console = originalConsole
		vi.restoreAllMocks()
	})

	describe("toTildePath", () => {
		it("should expand ~ to home directory", () => {
			const homeDir = os.homedir()
			expect(toTildePath("~/test")).toBe(path.join(homeDir, "test"))
			expect(toTildePath("~/folder/file.txt")).toBe(path.join(homeDir, "folder/file.txt"))
		})

		it("should not modify paths without ~", () => {
			expect(toTildePath("/absolute/path")).toBe("/absolute/path")
			expect(toTildePath("relative/path")).toBe("relative/path")
		})
	})

	describe("getDocsPathValue", () => {
		it("should extract docs path from arguments", () => {
			const args = ["--other=value", "--docs-path=/test/path", "--flag"]
			expect(getDocsPathValue(args)).toBe("/test/path")
		})

		it("should return undefined if no docs path provided", () => {
			const args = ["--other=value", "--flag"]
			expect(getDocsPathValue(args)).toBeUndefined()
		})

		it("should handle docs path with equals sign in value", () => {
			const args = ["--docs-path=/path/with=equals"]
			expect(getDocsPathValue(args)).toBe("/path/with=equals")
		})
	})

	describe("getGitPath", () => {
		const originalPlatform = process.platform

		beforeAll(() => {
			Object.defineProperty(process, "platform", {
				value: originalPlatform,
				writable: true,
			})
		})

		it("should return Windows git path on Windows", () => {
			Object.defineProperty(process, "platform", { value: "win32" })
			expect(getGitPath()).toBe("C:\\Program Files\\Git\\bin\\git.cmd")
		})

		it("should return Unix git path on non-Windows", () => {
			Object.defineProperty(process, "platform", { value: "darwin" })
			expect(getGitPath()).toBe("/usr/bin/git")
		})
	})

	describe("validateRepositories", () => {
		const testDir = path.join(os.tmpdir(), "memorybank-test")
		const requiredFiles = [
			"productContext.md",
			"activeContext.md",
			"systemPatterns.md",
			"techContext.md",
			"progress.md",
		]

		beforeAll(async () => {
			await fs.mkdir(testDir, { recursive: true })
			await Promise.all(requiredFiles.map((file) => fs.writeFile(path.join(testDir, file), "test content")))
		})

		it("should validate when all required files exist", async () => {
			await expect(validateRepositories(testDir)).resolves.not.toThrow()
		})

		it("should throw error when a required file is missing", async () => {
			const missingFile = requiredFiles[0]
			await fs.unlink(path.join(testDir, missingFile))

			await expect(validateRepositories(testDir)).rejects.toThrow(`Required file not found: ${missingFile}`)

			// Restore the file for other tests
			await fs.writeFile(path.join(testDir, missingFile), "test content")
		})

		it("should throw error for non-existent directory", async () => {
			const nonExistentDir = path.join(testDir, "non-existent")
			await expect(validateRepositories(nonExistentDir)).rejects.toThrow()
		})
	})

	describe("processDocsDirectory", () => {
		const testDir = path.join(os.tmpdir(), "memorybank-test")

		// Helper function to setup git command mocks
		const setupGitMocks = (gitDirOutput: string, gitRemoteOutput: string) => {
			mockExec.mockImplementation((command: string, _options: any, callback: any) => {
				console.log("[DEBUG] Mocked exec command:", command)
				if (command.includes("rev-parse --git-dir")) {
					callback(null, gitDirOutput, "")
				} else if (command.includes("remote get-url origin")) {
					console.log("[DEBUG] Mocked git remote output:", JSON.stringify(gitRemoteOutput))
					callback(null, gitRemoteOutput, "")
				} else {
					callback(new Error(`Unexpected command: ${command}`), "", "")
				}
				return {} as ChildProcess
			})
		}

		beforeAll(async () => {
			// Create test directory with required files
			await fs.mkdir(testDir, { recursive: true })

			// Use the same test content as test-progress.md
			const progressContent = `# Progress

## Implementation Status

### Core Features
- ✅ Completed feature
- ⚠️ In progress feature
- ❌ Not started feature
- Regular item without status

### Testing
- ✅ Test suite setup
- ⚠️ Integration tests in progress
- ❌ E2E tests pending

## Priority Tasks

### High Priority
- ❌ Important task`

			await fs.writeFile(path.join(testDir, "progress.md"), progressContent)

			// Create other required files
			const otherFiles = ["productContext.md", "activeContext.md", "systemPatterns.md", "techContext.md"]

			await Promise.all(otherFiles.map((file) => fs.writeFile(path.join(testDir, file), "test content")))
		})

		beforeEach(() => {
			// Reset all mocks before each test
			vi.resetAllMocks()
			consoleMock.log.mockClear()
			consoleMock.error.mockClear()
		})

		it("should handle non-existent directory", async () => {
			const nonExistentDir = path.join(testDir, "non-existent")
			setupGitMocks(".git\n", "") // Git setup doesn't matter for this test

			await processDocsDirectory(nonExistentDir, false)

			expect(consoleMock.error).toHaveBeenCalledWith("Error:", expect.stringContaining("Required file not found"))
			expect(mockExit).toHaveBeenCalledWith(1)
		})

		it("should handle invalid progress.md content", async () => {
			setupGitMocks(".git\n", "") // Git setup doesn't matter for this test

			// Create invalid progress.md
			await fs.writeFile(path.join(testDir, "progress.md"), "Invalid content")

			await processDocsDirectory(testDir, false)

			expect(consoleMock.error).toHaveBeenCalled()
			expect(mockExit).toHaveBeenCalledWith(1)

			// Restore valid content for other tests
			const validContent = `# Progress\n\n## Implementation Status\n\n### Core Features\n- ✅ Test`
			await fs.writeFile(path.join(testDir, "progress.md"), validContent)
		})
	})

	describe("CLI argument handling", () => {
		const originalArgv = process.argv

		afterEach(() => {
			process.argv = originalArgv
			vi.clearAllMocks()
		})

		it("should handle --incomplete flag", async () => {
			process.argv = ["node", "memorybank-status.js", "--incomplete", "--docs-path=/test/path"]

			const args = process.argv.slice(2)
			expect(args.includes("--incomplete")).toBe(true)
			expect(getDocsPathValue(args)).toBe("/test/path")
		})

		it("should handle direct file path", async () => {
			process.argv = ["node", "memorybank-status.js", "/test/file.md"]

			const args = process.argv.slice(2)
			expect(args[0]).toBe("/test/file.md")
			expect(getDocsPathValue(args)).toBeUndefined()
		})

		it("should handle missing path argument", async () => {
			process.argv = ["node", "memorybank-status.js"]

			const args = process.argv.slice(2)
			expect(args.length).toBe(0)
			expect(getDocsPathValue(args)).toBeUndefined()
		})
	})
})
