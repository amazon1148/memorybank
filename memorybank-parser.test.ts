import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  getMemorybankProgress,
  MemorybankProgress,
  MemorybankSection,
  MemorybankSubsection,
  MemorybankItem,
} from "./memorybank-parser";

describe("memorybank-parser", () => {
  const testDir = path.join(os.tmpdir(), "memorybank-parser-test");
  const testFile = path.join(testDir, "test.md");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

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
`;

    await fs.writeFile(testFile, content);
    const result = await getMemorybankProgress(testFile);

    const expectedProgress: MemorybankProgress = {
      sections: [
        {
          title: "Section 1",
          subsections: [
            {
              title: "Subsection 1.1",
              items: [
                { text: "Completed item", status: "✅" },
                { text: "Partial item", status: "⚠️" },
                { text: "Failed item", status: "❌" },
                { text: "Pending item", status: "pending" },
              ],
            },
            {
              title: "Subsection 1.2",
              items: [
                { text: "Another completed item", status: "✅" },
              ],
            },
          ],
        },
        {
          title: "Section 2",
          subsections: [
            {
              title: "Default",
              items: [
                { text: "Direct section item", status: "✅" },
              ],
            },
          ],
        },
      ],
    };

    expect(result).toEqual(expectedProgress);
  });

  it("should handle empty progress", async () => {
    const content = "";
    await fs.writeFile(testFile, content);
    
    const result = await getMemorybankProgress(testFile);
    const expectedProgress: MemorybankProgress = {
      sections: [],
    };

    expect(result).toEqual(expectedProgress);
  });

  it("should handle progress with empty sections", async () => {
    const content = `
## Empty Section 1
## Empty Section 2
`;

    await fs.writeFile(testFile, content);
    const result = await getMemorybankProgress(testFile);

    const expectedProgress: MemorybankProgress = {
      sections: [
        {
          title: "Empty Section 1",
          subsections: [],
        },
        {
          title: "Empty Section 2",
          subsections: [],
        },
      ],
    };

    expect(result).toEqual(expectedProgress);
  });

  it("should handle progress with empty subsections", async () => {
    const content = `
## Section 1
### Empty Subsection 1
### Empty Subsection 2
`;

    await fs.writeFile(testFile, content);
    const result = await getMemorybankProgress(testFile);

    const expectedProgress: MemorybankProgress = {
      sections: [
        {
          title: "Section 1",
          subsections: [
            {
              title: "Empty Subsection 1",
              items: [],
            },
            {
              title: "Empty Subsection 2",
              items: [],
            },
          ],
        },
      ],
    };

    expect(result).toEqual(expectedProgress);
  });

  it("should throw error for subsection before section", async () => {
    const content = `
### Invalid Subsection
- Item
`;

    await fs.writeFile(testFile, content);
    await expect(getMemorybankProgress(testFile)).rejects.toThrow(
      "Found subsection before section"
    );
  });

  it("should throw error for item before section", async () => {
    const content = `
- Invalid Item
`;

    await fs.writeFile(testFile, content);
    await expect(getMemorybankProgress(testFile)).rejects.toThrow(
      "Found item before section"
    );
  });
});
