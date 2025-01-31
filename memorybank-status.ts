#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import Debug from "debug";
import { getMemorybankProgress, MemorybankItem, MemorybankSubsection, MemorybankSection } from "./memorybank-parser.js";

const debug = Debug("memorybank");

// Use console methods directly to allow for mocking in tests
const execAsync = promisify(exec);

const GIT_PATHS = {
  WINDOWS: "C:\\Program Files\\Git\\bin\\git.cmd",
  UNIX: "/usr/bin/git"
} as const;

const STATUS_ICONS = {
  TRACKED: "✅",
  MODIFIED: "⚠" + "️", // Split combined character for consistent rendering
  UNTRACKED: "❌"
} as const;

const GIT_REMOTE_HEADER = "\nGit Remote:";

/**
 * Convert a path with ~ to absolute path
 * @param inputPath Path that may contain ~
 * @returns Absolute path with ~ expanded
 */
export function toTildePath(inputPath: string): string {
  debug("Converting tilde path: %s", inputPath);
  if (inputPath.startsWith("~")) {
    const expanded = path.join(os.homedir(), inputPath.slice(1));
    debug("Expanded path: %s", expanded);
    return expanded;
  }
  return inputPath;
}

/**
 * Get the Git executable path based on OS
 * @returns Path to Git executable
 */
export function getGitPath(): string {
  const gitPath = process.platform === "win32" ? GIT_PATHS.WINDOWS : GIT_PATHS.UNIX;
  debug("Using git path: %s", gitPath);
  return gitPath;
}

/**
 * Get git status for a specific file
 * @param filePath Path to file
 * @param gitPath Git executable path
 * @param cwd Working directory
 * @returns Status object with icon and description
 */
async function getFileGitStatus(filePath: string, gitPath: string, cwd: string): Promise<{icon: string, status: string}> {
  debug("Getting git status for file: %s", filePath);
  try {
    // Check if file is tracked
    const { stdout: lsFiles } = await execAsync(`${gitPath} ls-files --error-unmatch ${filePath}`, { cwd });
    if (!lsFiles.trim()) {
      debug("File not tracked: %s", filePath);
      return { icon: STATUS_ICONS.UNTRACKED, status: "not tracked in git" };
    }

    // Get status if tracked
    const { stdout: status } = await execAsync(`${gitPath} status --porcelain ${filePath}`, { cwd });
    if (!status.trim()) {
      debug("File tracked and clean: %s", filePath);
      return { icon: STATUS_ICONS.TRACKED, status: "tracked in git" };
    }
    debug("File modified: %s", filePath);
    return { icon: STATUS_ICONS.MODIFIED, status: "modified" };
  } catch (error) {
    debug("Error getting git status: %O", error);
    return { icon: STATUS_ICONS.UNTRACKED, status: "not tracked in git" };
  }
}

/**
 * Get repository information including git status and remote URLs
 * @param docsPath Path to docs directory
 * @returns Repository information
 */
async function getRepositoryInfo(docsPath: string): Promise<void> {
  debug("Getting repository info for: %s", docsPath);
  const absolutePath = path.resolve(docsPath);
  
  console.log("\nProject Context Information");
  console.log("=========================");
  console.log(`\nDocuments Directory: ${absolutePath}`);
  
  const files = [
    "productContext.md",
    "activeContext.md",
    "systemPatterns.md",
    "techContext.md",
    "progress.md"
  ];

  const gitPath = getGitPath();
  
  try {
    // Check if directory is a git repository
    await execAsync(`${gitPath} rev-parse --git-dir`, { cwd: docsPath });
    
    try {
      // Get first remote URL only
      console.log("[DEBUG] Executing git remote command...");
      const gitRemoteCmd = `${gitPath} remote get-url origin`;
      console.log("[DEBUG] Git command:", gitRemoteCmd);
      const { stdout: remotes } = await execAsync(gitRemoteCmd, { cwd: docsPath });
      console.log("[DEBUG] Raw git output:", JSON.stringify(remotes));
      const remoteUrl = remotes.trim();
      console.log("[DEBUG] Trimmed remote URL:", JSON.stringify(remoteUrl));
      
      // Log exact strings for test verification
      console.log("[DEBUG] About to log header:", JSON.stringify(GIT_REMOTE_HEADER));
      console.log(GIT_REMOTE_HEADER);
      console.log("[DEBUG] About to log URL:", JSON.stringify(remoteUrl));
      console.log(remoteUrl);
    } catch (error) {
      console.log("[DEBUG] Error getting git remote:", error);
      throw error;
    }
    
    // Get status for each file
    console.log("\nProject Context Documents:");
    for (const file of files) {
      const filePath = path.resolve(docsPath, file);
      const { icon, status } = await getFileGitStatus(file, gitPath, docsPath);
      console.log(`${icon} ${filePath} (${status})`);
    }
  } catch (error) {
    debug("Git error: %O", error);
    
    // Check if git is not available (command not found)
    if (error instanceof Error && 'code' in error && error.code === 127) {
      console.log("\nGit not available");
      console.log("Git command failed or not found on system");
    } else if (error instanceof Error && error.message.includes('not a git repository')) {
      console.log("\nNot a git repository");
    } else {
      // Re-throw other git errors to be caught by the outer try-catch
      throw error;
    }
    
    // Still show files even if git is not available or not a repo
    console.log("\nProject Context Documents:");
    for (const file of files) {
      const filePath = path.resolve(docsPath, file);
      const status = error instanceof Error && 'code' in error && error.code === 127
        ? "git not available"
        : "not in git";
      console.log(`${STATUS_ICONS.UNTRACKED} ${filePath} (${status})`);
    }
  }
}

/**
 * Get the docs path from command line arguments
 * @param args Command line arguments
 * @returns Docs path if provided
 */
export function getDocsPathValue(args: string[]): string | undefined {
  debug("Getting docs path from args: %O", args);
  const docsPathArg = args.find((arg) => arg.startsWith("--docs-path="));
  if (docsPathArg) {
    const [, ...parts] = docsPathArg.split("=");
    const path = parts.join("=");
    debug("Found docs path: %s", path);
    return path;
  }
  debug("No docs path found in args");
  return undefined;
}

/**
 * Validate that required repositories exist
 * @param docsPath Path to docs directory
 */
export async function validateRepositories(docsPath: string): Promise<void> {
  debug("Validating repositories in: %s", docsPath);
  const requiredFiles = [
    "productContext.md",
    "activeContext.md",
    "systemPatterns.md",
    "techContext.md",
    "progress.md"
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(docsPath, file);
    try {
      await fs.access(filePath);
      debug("Found required file: %s", file);
    } catch (error) {
      debug("Missing required file: %s", file);
      throw new Error(`Required file not found: ${file}`);
    }
  }
}

/**
 * Print an item based on its status
 * @param item Progress item to print
 * @param showIncomplete Whether to only show incomplete items
 */
function printItem(item: MemorybankItem, showIncomplete: boolean): void {
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
  subsection: MemorybankSubsection,
  showIncomplete: boolean
): void {
  if (subsection.title !== "Default") {
    console.log(`\n### ${subsection.title}`);
  }

  subsection.items.forEach((item: MemorybankItem) => printItem(item, showIncomplete));
}

/**
 * Process a single markdown file
 * @param filePath Path to markdown file
 * @param showIncomplete Only show incomplete items
 */
async function processFile(filePath: string, showIncomplete = false): Promise<void> {
  debug("Processing file: %s", filePath);
  try {
    const progress = await getMemorybankProgress(filePath);

    progress.sections.forEach((section: MemorybankSection) => {
      if (section.title !== "Implementation Status") return;
      console.log(`\n## ${section.title}`);
      section.subsections.forEach((subsection: MemorybankSubsection) =>
        printSubsection(subsection, showIncomplete)
      );
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    debug("Error processing file: %O", error);
    console.error(`Error processing ${filePath}: ${errorMessage}`);
    process.exit(1);
  }
}

/**
 * Process all markdown files in docs directory
 * @param docsPath Path to docs directory
 * @param showIncomplete Only show incomplete items
 */
export async function processDocsDirectory(docsPath: string, showIncomplete = false): Promise<void> {
  debug("Processing docs directory: %s", docsPath);
  try {
    await validateRepositories(docsPath);

    // Get repository information first
    await getRepositoryInfo(docsPath);

    // Process progress.md
    const progressPath = path.join(docsPath, "progress.md");
    await processFile(progressPath, showIncomplete);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    debug("Error processing directory: %O", error);
    console.error("Error:", errorMessage);
    process.exit(1);
  }
}

// If run directly, process command line arguments
if (process.argv[1] && process.argv[1].endsWith('memorybank-status.js')) {
  debug("Starting CLI with args: %O", process.argv.slice(2));
  const args = process.argv.slice(2);
  const showIncomplete = args.includes("--incomplete");
  const docsPath = getDocsPathValue(args);

  if (docsPath) {
    const absolutePath = toTildePath(docsPath);
    processDocsDirectory(absolutePath, showIncomplete).catch((error) => {
      debug("CLI error: %O", error);
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
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
