import { promises as fs } from "node:fs";
import Debug from "debug";

const debug = Debug("memorybank:parser");

// Status emoji constants to ensure consistent Unicode handling
const STATUS = {
  COMPLETE: "✅",
  WARNING: "⚠" + "️", // Split combined character
  ERROR: "❌",
  PENDING: "pending",
} as const;

/**
 * Represents a single item in a memorybank checklist
 */
export interface MemorybankItem {
  /** The text content of the item */
  text: string;
  /** The status of the item (✅, ⚠️, ❌, or "pending") */
  status: string;
}

/**
 * Represents a subsection in a memorybank document that contains a list of items
 */
export interface MemorybankSubsection {
  /** The title of the subsection */
  title: string;
  /** The list of items in this subsection */
  items: MemorybankItem[];
}

/**
 * Represents a major section in a memorybank document that contains subsections
 */
export interface MemorybankSection {
  /** The title of the section */
  title: string;
  /** The list of subsections in this section */
  subsections: MemorybankSubsection[];
}

/**
 * Represents the complete structure of a memorybank progress document
 * containing all sections, subsections, and items
 */
export interface MemorybankProgress {
  /** The list of all sections in the document */
  sections: MemorybankSection[];
}

/**
 * Handles the parsing state and progress building
 */
class ProgressBuilder {
  sections: MemorybankSection[] = [];
  currentSection: MemorybankSection | null = null;
  currentSubsection: MemorybankSubsection | null = null;
  hasImplementationStatus = false;

  /**
   * Get the built progress
   */
  getProgress(): MemorybankProgress {
    debug("Getting final progress with %d sections", this.sections.length);
    if (!this.hasImplementationStatus) {
      throw new Error("No Implementation Status section found");
    }
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
    const title = line.slice(3).trim();
    debug("Processing section: %s", title);
    if (title === "Implementation Status") {
      this.hasImplementationStatus = true;
    }
    this.currentSection = {
      title,
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
      debug("Error: Found subsection before section");
      throw new Error("Found subsection before section");
    }

    const title = line.slice(4).trim();
    debug("Processing subsection: %s", title);
    this.currentSubsection = {
      title,
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
      debug("Error: Found item before section");
      throw new Error("Found item before section");
    }

    if (!this.currentSubsection) {
      debug("Creating default subsection");
      this.currentSubsection = {
        title: "Default",
        items: [],
      };
      this.currentSection.subsections.push(this.currentSubsection);
    }

    const item = this.parseItem(line);
    debug("Processed item: %s (status: %s)", item.text, item.status);
    this.currentSubsection.items.push(item);
  }

  /**
   * Parse a line into an item
   * @param line Line to parse
   * @returns Parsed item
   */
  parseItem(line: string): MemorybankItem {
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
  getItemStatus(text: string): string {
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
  debug("Reading file: %s", filePath);
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const builder = new ProgressBuilder();

  debug("Processing %d lines", lines.length);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("## ")) {
      // Check if we're entering or leaving the Implementation Status section
      if (trimmedLine === "## Implementation Status") {
        debug("Found Implementation Status section");
        builder.processSection(trimmedLine);
      } else if (trimmedLine === "## Priority Tasks") {
        debug("Found Priority Tasks section, stopping processing");
        // Stop processing when we hit Priority Tasks section
        break;
      } else if (!builder.hasImplementationStatus) {
        // Skip other sections if we're not in Implementation Status
        debug("Skipping non-Implementation Status section: %s", trimmedLine);
        continue;
      }
    } else if (builder.hasImplementationStatus) {
      // Only process subsections and items when in Implementation Status
      if (trimmedLine.startsWith("### ")) {
        builder.processSubsection(trimmedLine);
      } else if (trimmedLine.startsWith("- ")) {
        builder.processItem(trimmedLine);
      }
    }
  }

  return builder.getProgress();
}
