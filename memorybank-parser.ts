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
  readonly text: string;
  /** The status of the item: completed, partial, not implemented, or pending */
  readonly status: StatusType;
}

/**
 * Represents a subsection within a Memory Bank section
 */
export interface MemorybankSubsection {
  /** The title of the subsection */
  readonly title: string;
  /** The checklist items contained in this subsection */
  readonly items: readonly MemorybankItem[];
}

/**
 * Represents a main section in a Memory Bank document
 */
export interface MemorybankSection {
  /** The title of the section */
  readonly title: string;
  /** The subsections contained in this section */
  readonly subsections: readonly MemorybankSubsection[];
}

/**
 * Represents the complete progress data from a Memory Bank document
 */
export interface MemorybankProgress {
  /** The main sections of the document */
  readonly sections: readonly MemorybankSection[];
}

/**
 * Internal mutable interfaces for building progress
 */
interface MutableItem {
  text: string;
  status: StatusType;
}

interface MutableSubsection {
  title: string;
  items: MutableItem[];
}

interface MutableSection {
  title: string;
  subsections: MutableSubsection[];
}

/**
 * Handles the parsing state and progress building
 */
class ProgressBuilder {
  private readonly sections: MutableSection[] = [];
  private currentSection: MutableSection | null = null;
  private currentSubsection: MutableSubsection | null = null;

  /**
   * Get the built progress
   */
  getProgress(): MemorybankProgress {
    return {
      sections: this.sections.map(section => ({
        title: section.title,
        subsections: section.subsections.map(subsection => ({
          title: subsection.title,
          items: subsection.items.map(item => ({
            text: item.text,
            status: item.status,
          })),
        })),
      })),
    };
  }

  /**
   * Process a section line
   * @param line Line to process
   */
  processSection(line: string): void {
    this.currentSection = {
      title: line.slice(3).trim(),
      subsections: [],
    };
    this.sections.push(this.currentSection);
    this.currentSubsection = null;
  }

  /**
   * Process a subsection line
   * @param line Line to process
   */
  processSubsection(line: string): void {
    if (!this.currentSection) {
      throw new Error("Found subsection before section");
    }

    this.currentSubsection = {
      title: line.slice(4).trim(),
      items: [],
    };
    this.currentSection.subsections.push(this.currentSubsection);
  }

  /**
   * Process an item line
   * @param line Line to process
   */
  processItem(line: string): void {
    if (!this.currentSection) {
      throw new Error("Found item before section");
    }

    if (!this.currentSubsection) {
      this.currentSubsection = {
        title: "Default",
        items: [],
      };
      this.currentSection.subsections.push(this.currentSubsection);
    }

    const item = this.parseItem(line);
    this.currentSubsection.items.push(item);
  }

  /**
   * Parse a line into an item
   * @param line Line to parse
   * @returns Parsed item
   */
  private parseItem(line: string): MutableItem {
    const itemText = line.slice(2).trim();
    const status = this.getItemStatus(itemText);
    const text = status !== STATUS.PENDING 
      ? itemText.slice(status.length).trim()
      : itemText;

    return { text, status };
  }

  /**
   * Get the status from text
   * @param text Text to check
   * @returns Status type
   */
  private getItemStatus(text: string): StatusType {
    if (text.startsWith(STATUS.COMPLETE)) return STATUS.COMPLETE;
    if (text.startsWith(STATUS.WARNING)) return STATUS.WARNING;
    if (text.startsWith(STATUS.ERROR)) return STATUS.ERROR;
    return STATUS.PENDING;
  }
}

/**
 * Parse a markdown file and extract checklist progress information
 * @param filePath Path to the markdown file
 * @returns Promise resolving to the parsed progress data
 */
export async function getMemorybankProgress(filePath: string): Promise<MemorybankProgress> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const builder = new ProgressBuilder();

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("## ")) {
      builder.processSection(trimmedLine);
    } else if (trimmedLine.startsWith("### ")) {
      builder.processSubsection(trimmedLine);
    } else if (trimmedLine.startsWith("- ")) {
      builder.processItem(trimmedLine);
    }
  }

  return builder.getProgress();
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
