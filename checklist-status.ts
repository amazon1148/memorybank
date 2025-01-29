#!/usr/bin/env node
// scripts/checklist-status.ts

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

import { getChecklistProgress } from '../lib/checklist-parser.js';
import { existsSync, promises as fsPromises } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';

// Disable eslint console warnings for this file
/* eslint-disable no-console */

console.log('Imports completed');

export interface ChecklistItem {
  status: 'completed' | 'not implemented' | 'partially implemented' | 'pending';
  description: string;
}

export interface ChecklistSubsection {
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistSection {
  title: string;
  subsections: ChecklistSubsection[];
}

export interface ChecklistProgress {
  sections: ChecklistSection[];
  error?: string;
}

export type ChecklistResult = ChecklistProgress | { sections: never[]; error: string };

// Function to convert full path to tilde path
export function toTildePath(fullPath: string): string {
  const home = homedir();
  return fullPath.startsWith(home) ? fullPath.replace(home, '~') : fullPath;
}

/* eslint-disable no-console */

export function getDocsPathValue(arg: string): string | null {
  if (!arg || typeof arg !== 'string' || arg.indexOf('=') === -1) {
    return null; // Or throw an error, depending on requirements.
  }

  const parts = arg.split('=');
  if (parts.length < 2) {
    return null;
  }

  let docsPathValue = parts[1];
  if (docsPathValue) {
    docsPathValue = docsPathValue.trim().replace(/^(['"]|["'])$/g, '');
  }

  return docsPathValue;
}

/**
 * Get the absolute path to git executable based on platform
 * @returns {string} Absolute path to git executable
 */
export function getGitPath() {
  switch (platform()) {
    case 'win32':
      return 'C:\\Program Files\\Git\\bin\\git.cmd';
    case 'darwin':
      return '/usr/bin/git';
    default:
      return '/usr/bin/git';
  }
}

/**
 * Repository Configuration
 *
 * 1. VSCode Context Repository
 *    - Local Path: /~/workspace/repositoryname
 *    - Remote: git@github:organization/projectname.git
 *    - Description: Main implementation repository containing the VSCode extension
 *
 * 2. Documentation Repository
 *    - Local Path: /~/workspace/docs
 *    - Remote: git@github.com:organization/docs.git
 *    - Description: Contains implementation status and architecture documentation
 */

// Repository paths
const VSCODE_CONTEXT_PATH = join(process.cwd());
// Handle docs path argument with validation
let DOCS_PATH = join(process.cwd(), 'docs'); // Default to project's docs directory
// Handle both --docs-path <value> and --docs-path=<value> formats
let docsPathValue;
for (const arg of process.argv) {
  if (arg.startsWith('--docs-path=')) {
    docsPathValue = getDocsPathValue(arg);
    break;
  } else if (arg === '--docs-path') {
    docsPathValue = process.argv[process.argv.indexOf(arg) + 1];
    break;
  }
}

if (docsPathValue) {
  // Handle home directory expansion and resolve absolute path
  const expandedPath = docsPathValue.startsWith('~')
    ? docsPathValue.replace('~', homedir())
    : join(docsPathValue);
  DOCS_PATH = expandedPath;

  if (!existsSync(DOCS_PATH)) {
    throw new Error(`Docs path does not exist: ${DOCS_PATH}`);
  }
}

// Document paths handling
// Matches Implementation_Status.md doc in the root of docs repository not code repostiory
let IMPLEMENTATION_STATUS_DOC = 'Implementation-Status.md';
// Matches Architecture.md doc in the root of docs repository not code repostiory
let ARCHITECTURE_DOC = join(DOCS_PATH, 'Architecture.md');
// Matches tasks.md doc in the root of code repository
let TASKS_DOC = 'tasks.md';

// Handle document name arguments
const statusDocIndex = process.argv.indexOf('--status-doc');
if (statusDocIndex > -1) {
  IMPLEMENTATION_STATUS_DOC = process.argv[statusDocIndex + 1];
}

const archDocIndex = process.argv.indexOf('--arch-doc');
if (archDocIndex > -1) {
  ARCHITECTURE_DOC = process.argv[archDocIndex + 1];
}

const tasksDocIndex = process.argv.indexOf('--tasks-doc');
if (tasksDocIndex > -1) {
  TASKS_DOC = process.argv[tasksDocIndex + 1];
}

// Full document paths
const IMPLEMENTATION_STATUS_PATH = join(DOCS_PATH, IMPLEMENTATION_STATUS_DOC);
const ARCHITECTURE_DOC_PATH = ARCHITECTURE_DOC;
const TASKS_DOC_PATH = join(process.cwd(), TASKS_DOC);

// Parse command line arguments
const showOnlyIncomplete = process.argv.includes('--incomplete');

/**
 * Validates the VSCode Context repository
 * @throws {Error} If repository is not accessible or invalid
 */
async function validateVSCodeContext() {
  console.log('\nChecking VSCode Context repository...');
  if (!existsSync(VSCODE_CONTEXT_PATH)) {
    throw new Error(`VSCode Context repository not found at: ${toTildePath(VSCODE_CONTEXT_PATH)}`);
  }
  console.log('✓ VSCode Context repository exists');

  if (!existsSync(join(VSCODE_CONTEXT_PATH, '.git'))) {
    throw new Error(`${toTildePath(VSCODE_CONTEXT_PATH)} is not a git repository`);
  }
  console.log('✓ VSCode Context repository is a git repository');
}

/**
 * Validates the Documentation directory
 * @throws {Error} If directory is not accessible
 */
async function validateDocsDirectory() {
  console.log('\nChecking Documentation directory...');
  if (!existsSync(DOCS_PATH)) {
    throw new Error(`Documentation directory not found at: ${toTildePath(DOCS_PATH)}`);
  }
  console.log('✓ Documentation directory exists at:', DOCS_PATH);
  console.log('Directory contents:', await fsPromises.readdir(DOCS_PATH));
}

/**
 * Validates required documentation files
 * @throws {Error} If required files are not accessible
 */
async function validateDocFiles() {
  console.log('\nChecking required documentation files...');
  if (!existsSync(IMPLEMENTATION_STATUS_PATH)) {
    throw new Error(`Implementation status document not found at: ${IMPLEMENTATION_STATUS_PATH}`);
  }
  console.log('✓ Implementation status document exists');

  if (!existsSync(TASKS_DOC_PATH)) {
    throw new Error(`Tasks document not found at: ${TASKS_DOC_PATH}`);
  }
  console.log('✓ Tasks document exists');
}

/**
 * Gets the remote URL for the VSCode Context repository
 * @returns {Promise<string>} The remote URL or error message
 */
async function getVSCodeContextRemoteUrl(): Promise<string> {
  const { exec } = await import('child_process');
  const gitPath = getGitPath();

  if (!existsSync(gitPath)) {
    return 'Could not determine remote URL (git not found)';
  }

  return new Promise((resolve) => {
    exec(
      `"${gitPath}" -C "${VSCODE_CONTEXT_PATH}" remote get-url origin`,
      (error, stdout, _stderr) => {
        if (error) {
          console.error(`exec error: ${String(error)}`);
          resolve('Could not determine remote URL');
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

/**
 * Validates that repositories and required documents are accessible
 * @throws {Error} If repositories or documents are not accessible
 */
export async function validateRepositories() {
  console.log('\nStarting repository validation...');
  console.log('Current working directory:', process.cwd());
  console.log('VSCODE_CONTEXT_PATH:', VSCODE_CONTEXT_PATH);
  console.log('DOCS_PATH:', DOCS_PATH);
  console.log('IMPLEMENTATION_STATUS_PATH:', IMPLEMENTATION_STATUS_PATH);
  console.log('TASKS_DOC_PATH:', TASKS_DOC_PATH);

  try {
    await validateVSCodeContext();
    await validateDocsDirectory();
    await validateDocFiles();

    // Print validation success information
    console.log('Repository and Document Validation Successful:');
    console.log('✅ VSCode Context:');
    console.log(`   Path: ${toTildePath(VSCODE_CONTEXT_PATH)}`);

    const remoteUrl = await getVSCodeContextRemoteUrl();
    console.log('\n✅ Code Repository:');
    console.log(`   Remote URL: ${remoteUrl}`);

    console.log('\n✅ Documentation:');
    console.log(`   Docs_path: ${toTildePath(DOCS_PATH)}`);
    console.log('   Documents:');
    console.log(`     - Found implementation status: ${IMPLEMENTATION_STATUS_PATH}`);
    // Architecture document is optional
    if (existsSync(ARCHITECTURE_DOC_PATH)) {
      console.log(`     - Found architecture document: ${ARCHITECTURE_DOC}`);
    }
    console.log(`     - Found npm run, tasks, code actions doc:${TASKS_DOC_PATH}`);
    console.log(''); // Empty line for spacing
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Repository validation failed:', errorMessage);
    throw error;
  }
}

/**
 * Processes and displays a status report
 * @param {Object} progress The progress data
 * @param {boolean} showOnlyIncomplete Whether to show only incomplete items
 * @param {string} title The title to display in the header
 */
function displayStatus(
  progress: ChecklistProgress,
  showOnlyIncomplete: boolean,
  title: string,
): void {
  console.log(`
    ${title}
    ${showOnlyIncomplete ? '(Showing only incomplete items)' : ''}
    =========================================================
  `);

  progress.sections.forEach((section) => {
    // Filter incomplete items for each subsection
    const incompleteSubsections = section.subsections
      .map((subsection) => ({
        title: subsection.title,
        items: subsection.items.filter((item) =>
          showOnlyIncomplete ? item.status !== 'completed' : true,
        ),
      }))
      .filter((subsection) => subsection.items.length > 0);

    // Skip section if no incomplete items and we're only showing incomplete
    if (showOnlyIncomplete && incompleteSubsections.length === 0) {
      return;
    }

    console.log(`  ${section.title}`);
    console.log(`  ----------------------------`);

    incompleteSubsections.forEach((subsection) => {
      console.log(`    ${subsection.title}:`);
      subsection.items.forEach((item) => {
        let statusIcon = '';
        if (item.status === 'completed') {
          statusIcon = '✅';
        } else if (item.status === 'not implemented') {
          statusIcon = '❌';
        } else if (item.status === 'partially implemented') {
          statusIcon = '⚠️';
        }
        console.log(`      ${statusIcon} ${item.description} (${item.status})`);
      });
    });
    console.log('');
  });
}

async function main() {
  try {
    // Validate repository access before proceeding
    await validateRepositories();

    console.log('Getting implementation status progress...');
    const implementationStatusProgress = (await getChecklistProgress(
      IMPLEMENTATION_STATUS_PATH,
    )) as ChecklistResult;
    console.log('Implementation status progress retrieved');

    console.log('Getting tasks progress...');
    const tasksProgress = (await getChecklistProgress(TASKS_DOC_PATH)) as ChecklistResult;
    console.log('Tasks progress retrieved');

    if ('error' in implementationStatusProgress) {
      throw new Error(
        `Failed to get implementation status progress: ${implementationStatusProgress.error}`,
      );
    }

    if ('error' in tasksProgress) {
      throw new Error(`Failed to get tasks progress: ${tasksProgress.error}`);
    }

    displayStatus(
      implementationStatusProgress,
      showOnlyIncomplete,
      'VSCode Context Client Implementation Status',
    );
    displayStatus(tasksProgress, showOnlyIncomplete, 'VSCode Context Client Tasks Status');
  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Determines if this module is being run directly (not imported)
 * Checks if the executed script name matches our checklist status files
 * @returns {boolean} True if this is the main module being executed
 */
function isDirectExecution(): boolean {
  const CHECKLIST_FILENAMES = ['checklist-status.ts', 'checklist-status.js'] as const;

  try {
    const executedScript = process.argv[1];
    if (!executedScript) {
      return false;
    }

    return CHECKLIST_FILENAMES.some((filename) => {
      return executedScript.endsWith(filename);
    });
  } catch (error) {
    console.warn('Error checking module execution type:', error);
    return false;
  }
}

// Run the script when executed directly
const isMainModule = isDirectExecution();

if (isMainModule) {
  main().catch((error: unknown) => {
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Error:', String(error));
    }
    process.exit(1);
  });
}
