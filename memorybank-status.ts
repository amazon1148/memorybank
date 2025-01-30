import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { getMemorybankProgress } from "./memorybank-parser";

const GIT_PATHS = {
  WINDOWS: "C:\\Program Files\\Git\\bin\\git.cmd",
  UNIX: "/usr/bin/git",
} as const;

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
 * Get the Git executable path based on OS
 * @returns Path to Git executable
 */
export function getGitPath(): string {
  return process.platform === "win32" ? GIT_PATHS.WINDOWS : GIT_PATHS.UNIX;
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
 * Process a single markdown file
 * @param filePath Path to markdown file
 * @param showIncomplete Only show incomplete items
 */
async function processFile(filePath: string, showIncomplete = false): Promise<void> {
  try {
    const progress = await getMemorybankProgress(filePath);

    for (const section of progress.sections) {
      console.log(`\n## ${section.title}`);

      for (const subsection of section.subsections) {
        if (subsection.title !== "Default") {
          console.log(`\n### ${subsection.title}`);
        }

        for (const item of subsection.items) {
          if (!showIncomplete || item.status !== "✅") {
            console.log(`- ${item.status === "pending" ? "" : item.status} ${item.text}`);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error processing ${filePath}:`, error.message);
    } else {
      console.error(`Unknown error processing ${filePath}`);
    }
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
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("Unknown error occurred");
    }
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
