import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import {
  getMemorybankProgress,
  MemorybankProgress,
  MemorybankSection,
  MemorybankSubsection,
  MemorybankItem,
} from "../memorybank-parser";

describe("memorybank-parser", () => {
  it("should be set up for testing", () => {
    expect(true).toBe(true);
  });
});
