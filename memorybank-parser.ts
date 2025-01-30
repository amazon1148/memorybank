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
 * Get the status from a line of text
 * @param text Line of text to check
 * @returns Status type
 */
function getItemStatus(text: string): StatusType {
  if (text.startsWith(STATUS.COMPLETE)) return STATUS.COMPLETE;
  if (text.startsWith(STATUS.WARNING)) return STATUS.WARNING;
  if (text.startsWith(STATUS.ERROR)) return STATUS.ERROR;
  return STATUS.PENDING;
}

/**
 * Parse a checklist item line
 * @param line Line of text to parse
 * @returns Parsed item
 */
function parseItem(line: string): MemorybankItem {
  const itemText = line.slice(2).trim();
  const status = getItemStatus(itemText);
  const text = status !== STATUS.PENDING 
    ? itemText.slice(status.length).trim()
    : itemText;

  return { text, status };
}

/**
 * Create a new section from a line
 * @param line Line of text to parse
 * @returns New section
 */
function createSection(line: string): MemorybankSection {
  return {
    title: line.slice(3).trim(),
    subsections: [],
  };
}

/**
 * Create a new subsection from a line
 * @param line Line of text to parse
 * @returns New subsection
 */
function createSubsection(line: string): MemorybankSubsection {
  return {
    title: line.slice(4).trim(),
    items: [],
  };
}

/**
 * Create a default subsection
 * @returns Default subsection
 */
function createDefaultSubsection(): MemorybankSubsection {
  return {
    title: "Default",
    items: [],
  };
}

/**
 * Parse a markdown file and extract checklist progress information
 * @param filePath Path to the markdown file
 * @returns Promise resolving to the parsed progress data
 */
export async function getMemorybankProgress(filePath: string): Promise<MemorybankProgress> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const progress: MemorybankProgress = { sections: [] };

  let currentSection: MemorybankSection | null = null;
  let currentSubsection: MemorybankSubsection | null = null;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    if (line.startsWith("## ")) {
      currentSection = createSection(line);
      progress.sections.push(currentSection);
      currentSubsection = null;
      continue;
    }

    if (line.startsWith("### ")) {
      if (!currentSection) {
        throw new Error("Found subsection before section");
      }
      currentSubsection = createSubsection(line);
      currentSection.subsections.push(currentSubsection);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!currentSection) {
        throw new Error("Found item before section");
      }

      if (!currentSubsection) {
        currentSubsection = createDefaultSubsection();
        currentSection.subsections.push(currentSubsection);
      }

      currentSubsection.items.push(parseItem(line));
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
