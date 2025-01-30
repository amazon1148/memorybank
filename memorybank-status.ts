import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { getMemorybankProgress } from "./memorybank-parser";

/**
 * Convert a path with ~ to absolute path
 * @param inputPath Path that may contain ~
 * @returns Absolute path with ~ expanded
 */
export function toTildePath(inputPath: string): string {
  if (inputPath.startsWith("~")) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  return inputPath;
}

/**
 * Get the docs path from command line arguments
 * @param args Command line arguments
 * @returns Docs path if provided
 */
export function getDocsPathValue(args: string[]): string | undefined {
  const docsPathArg = args.find((arg) => arg.startsWith("--docs-path="));
  if (docsPathArg) {
    return docsPathArg.split("=")[1];
  }
  return undefined;
}

/**
 * Validate that required repositories exist
 * @param docsPath Path to docs directory
 */
export async function validateRepositories(docsPath: string): Promise<void> {
  const requiredFiles = [
    "productContext.md",
    "activeContext.md",
    "systemPatterns.md",
    "techContext.md",
    "progress.md",
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(docsPath, file);
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Required file not found: ${file}`);
    }
  }
}

/**
 * Print an item based on its status
 * @param item Progress item to print
 * @param showIncomplete Whether to only show incomplete items
 */
function printItem(item: { status: string; text: string }, showIncomplete: boolean): void {
  if (!showIncomplete || item.status !== "✅") {
    console.log(`- ${item.status === "pending" ? "" : item.status} ${item.text}`);
  }
}

/**
 * Print a subsection and its items
 * @param subsection Subsection to print
 * @param showIncomplete Whether to only show incomplete items
 */
function printSubsection(
  subsection: { title: string; items: Array<{ status: string; text: string }> },
  showIncomplete: boolean
): void {
  if (subsection.title !== "Default") {
    console.log(`\n### ${subsection.title}`);
  }

  subsection.items.forEach(item => printItem(item, showIncomplete));
}

/**
 * Process a single markdown file
 * @param filePath Path to markdown file
 * @param showIncomplete Only show incomplete items
 */
async function processFile(filePath: string, showIncomplete = false): Promise<void> {
  try {
    const progress = await getMemorybankProgress(filePath);

    progress.sections.forEach(section => {
      console.log(`\n## ${section.title}`);
      section.subsections.forEach(subsection => 
        printSubsection(subsection, showIncomplete)
      );
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error processing ${filePath}: ${errorMessage}`);
    process.exit(1);
  }
}

/**
 * Process all markdown files in docs directory
 * @param docsPath Path to docs directory
 * @param showIncomplete Only show incomplete items
 */
async function processDocsDirectory(docsPath: string, showIncomplete = false): Promise<void> {
  try {
    await validateRepositories(docsPath);

    const files = [
      "productContext.md",
      "activeContext.md",
      "systemPatterns.md",
      "techContext.md",
      "progress.md",
    ];

    for (const file of files) {
      const filePath = path.join(docsPath, file);
      console.log(`\n# ${file}`);
      await processFile(filePath, showIncomplete);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error:", errorMessage);
    process.exit(1);
  }
}

// If run directly, process command line arguments
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const showIncomplete = args.includes("--incomplete");
  const docsPath = getDocsPathValue(args);

  if (docsPath) {
    const absolutePath = toTildePath(docsPath);
    processDocsDirectory(absolutePath, showIncomplete).catch(() => {
      // Error already logged
    });
  } else if (args.length > 0) {
    const filePath = toTildePath(args[0]);
    processFile(filePath, showIncomplete).catch(() => {
      // Error already logged
    });
  } else {
    console.error("Please provide a file path or --docs-path");
    process.exit(1);
  }
}
