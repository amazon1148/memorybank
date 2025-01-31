import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  toTildePath,
  getDocsPathValue,
  validateRepositories,
} from "./memorybank-status.js";

describe("memorybank-status", () => {
  describe("toTildePath", () => {
    it("should expand tilde to home directory", () => {
      const input = "~/documents/test.md";
      const expected = path.join(os.homedir(), "documents/test.md");
      expect(toTildePath(input)).toBe(expected);
    });

    it("should return original path if no tilde", () => {
      const input = "/absolute/path/test.md";
      expect(toTildePath(input)).toBe(input);
    });
  });

  describe("getDocsPathValue", () => {
    it("should extract docs path from arguments", () => {
      const args = ["--incomplete", "--docs-path=/test/path", "--other"];
      expect(getDocsPathValue(args)).toBe("/test/path");
    });

    it("should return undefined if no docs path argument", () => {
      const args = ["--incomplete", "--other"];
      expect(getDocsPathValue(args)).toBeUndefined();
    });
  });

  describe("validateRepositories", () => {
    const testDir = path.join(os.tmpdir(), "memorybank-test");
    const requiredFiles = [
      "productContext.md",
      "activeContext.md",
      "systemPatterns.md",
      "techContext.md",
      "progress.md",
    ];

    beforeEach(async () => {
      await fs.mkdir(testDir, { recursive: true });
      await Promise.all(
        requiredFiles.map(file => 
          fs.writeFile(path.join(testDir, file), "test content")
        )
      );
    });

    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should validate when all required files exist", async () => {
      await expect(validateRepositories(testDir)).resolves.toBeUndefined();
    });

    it("should throw error when file is missing", async () => {
      await fs.unlink(path.join(testDir, requiredFiles[0]));
      await expect(validateRepositories(testDir)).rejects.toThrow(
        `Required file not found: ${requiredFiles[0]}`
      );
    });
  });
});
