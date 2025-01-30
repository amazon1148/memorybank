import { promises as fs } from "node:fs";

// Status emoji constants to ensure consistent Unicode handling
const STATUS = {
  COMPLETE: "✅",
  WARNING: "⚠" + "️", // Split combined character
  ERROR: "❌",
  PENDING: "pending",
} as const;

type StatusType = typeof STATUS[keyof typeof STATUS];

/**
 * Represents a single checklist item in a Memory Bank document
 */
export interface MemorybankItem {
  /** The text content of the checklist item */
  text: string;
  /** The status of the item: completed, partial, not implemented, or pending */
  status: StatusType;
}

/**
 * Represents a subsection within a Memory Bank section
 */
export interface MemorybankSubsection {
  /** The title of the subsection */
  title: string;
  /** The checklist items contained in this subsection */
  items: MemorybankItem[];
}

/**
 * Represents a main section in a Memory Bank document
 */
export interface MemorybankSection {
  /** The title of the section */
  title: string;
  /** The subsections contained in this section */
  subsections: MemorybankSubsection[];
}

/**
 * Represents the complete progress data from a Memory Bank document
 */
export interface MemorybankProgress {
  /** The main sections of the document */
  sections: MemorybankSection[];
}

/**
 * Parse a markdown file and extract checklist progress information
 * @param filePath Path to the markdown file
 * @returns Promise resolving to the parsed progress data
 */
export async function getMemorybankProgress(filePath: string): Promise<MemorybankProgress> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");

  const progress: MemorybankProgress = {
    sections: [],
  };

  let currentSection: MemorybankSection | null = null;
  let currentSubsection: MemorybankSubsection | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // New section
      currentSection = {
        title: line.slice(3).trim(),
        subsections: [],
      };
      progress.sections.push(currentSection);
      currentSubsection = null;
    } else if (line.startsWith("### ")) {
      // New subsection
      if (!currentSection) {
        throw new Error("Found subsection before section");
      }
      currentSubsection = {
        title: line.slice(4).trim(),
        items: [],
      };
      currentSection.subsections.push(currentSubsection);
    } else if (line.startsWith("- ")) {
      // Checklist item
      if (!currentSubsection) {
        // If no subsection, create default one
        if (!currentSection) {
          throw new Error("Found item before section");
        }
        currentSubsection = {
          title: "Default",
          items: [],
        };
        currentSection.subsections.push(currentSubsection);
      }

      const itemText = line.slice(2).trim();
      let status: StatusType = STATUS.PENDING;

      if (itemText.startsWith(STATUS.COMPLETE)) {
        status = STATUS.COMPLETE;
      } else if (itemText.startsWith(STATUS.WARNING)) {
        status = STATUS.WARNING;
      } else if (itemText.startsWith(STATUS.ERROR)) {
        status = STATUS.ERROR;
      }

      // Remove status emoji using string operations
      let cleanText = itemText;
      if (status !== STATUS.PENDING) {
        cleanText = itemText.slice(status.length).trim();
      }

      currentSubsection.items.push({
        text: cleanText,
        status,
      });
    }
  }

  return progress;
}

// If run directly, parse the file specified as argument
if (process.argv[1] === import.meta.url) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Please provide a file path");
    process.exit(1);
  }

  getMemorybankProgress(filePath)
    .then((progress) => {
      console.log(JSON.stringify(progress, null, 2));
    })
    .catch((error) => {
      console.error("Error:", error.message);
      process.exit(1);
    });
}
