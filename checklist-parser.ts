// lib/checklist-parser.ts
import fs from 'fs';
import type {
  ChecklistProgress,
  ChecklistSection,
  ChecklistSubsection,
  ChecklistItem,
} from '../scripts/checklist-status';

// Maximum reasonable length for a title/description
const MAX_LENGTH = 1000;

interface ParsedSection extends ChecklistSection {
  subsections: ChecklistSubsection[];
}

interface ParsingContext {
  progress: ChecklistProgress;
  currentSection: ParsedSection | null;
  currentSubsection: ChecklistSubsection | null;
}

/**
 * Parse a section header line
 * @param line The line to parse
 * @returns The parsed section or null
 */
function parseSection(line: string): ParsedSection | null {
  const sectionMatch = /^##[ \t]{1,4}([^\r\n]{1,1000})$/.exec(line);
  return sectionMatch
    ? {
        title: sectionMatch[1].trim(),
        subsections: [],
      }
    : null;
}

/**
 * Parse a subsection header line
 * @param {string} line The line to parse
 * @returns {object|null} The parsed subsection or null
 */
function parseSubsection(line: string): ChecklistSubsection | null {
  const subsectionMatch = /^###[ \t]{1,4}([^\r\n]{1,1000})$/.exec(line);
  return subsectionMatch
    ? {
        title: subsectionMatch[1].trim(),
        items: [],
      }
    : null;
}

/**
 * Determine the status from a status indicator
 * @param {string} statusIndicator The status indicator emoji
 * @returns {string} The status string
 */
type ChecklistStatus = 'completed' | 'not implemented' | 'partially implemented' | 'pending';

function getStatus(statusIndicator: string): ChecklistStatus {
  const statusMap: Record<string, ChecklistStatus> = {
    '✅': 'completed',
    '❌': 'not implemented',
    '⚠️': 'partially implemented',
  };
  return statusMap[statusIndicator] ?? 'pending';
}
/**
 * Extract status and description from a line
 * @param line The line to process
 * @returns The extracted status and description
 */
function extractStatusAndDescription(
  line: string,
): { description: string; statusIndicator: string } | null {
  const listItemPrefix = /^[ \t]{0,4}-[ \t]{1,4}/;
  const checkmark = '✅';
  const crossmark = '❌';
  const warning = '⚠️';
  const statusPattern = new RegExp(`([${checkmark}${crossmark}]|${warning})[ \\t]{1,4}`);

  if (!listItemPrefix.test(line)) return null;

  const withoutPrefix = line.replace(listItemPrefix, '');
  const statusMatch = statusPattern.exec(withoutPrefix);
  const description = withoutPrefix.replace(statusPattern, '').trim().slice(0, MAX_LENGTH);

  if (!description) return null;

  return {
    description,
    statusIndicator: statusMatch?.[1] ?? '',
  };
}

/**
 * Parse a list item line
 * @param line The line to parse
 * @returns The parsed item or null
 */
function parseListItem(line: string): ChecklistItem | null {
  const extracted = extractStatusAndDescription(line);
  if (!extracted) return null;

  const { description, statusIndicator } = extracted;
  return {
    description,
    status: getStatus(statusIndicator),
  };
}

/**
 * Check if a line should be skipped
 * @param {string} line The line to check
 * @returns {boolean} True if the line should be skipped
 */
function shouldSkipLine(line: string): boolean {
  return !line || line.length > MAX_LENGTH;
}

/**
 * Process a section if found in the line
 * @param context The current parsing context
 * @param line The line to process
 * @returns True if a section was processed
 */
function processSectionIfFound(context: ParsingContext, line: string): boolean {
  const section = parseSection(line);
  if (!section) return false;

  context.currentSection = section;
  context.progress.sections.push(section);
  context.currentSubsection = null;
  return true;
}

/**
 * Process a subsection if found in the line
 * @param {object} context The current parsing context
 * @param {string} line The line to process
 * @returns {boolean} True if a subsection was processed
 */
function processSubsectionIfFound(context: ParsingContext, line: string): boolean {
  if (!context.currentSection) return false;

  const subsection = parseSubsection(line);
  if (!subsection) return false;

  context.currentSubsection = subsection;
  context.currentSection.subsections.push(subsection);
  return true;
}

/**
 * Process a list item if found in the line
 * @param context The current parsing context
 * @param line The line to process
 * @returns True if a list item was processed
 */
function processListItemIfFound(context: ParsingContext, line: string): boolean {
  if (!context.currentSubsection) return false;

  const item = parseListItem(line);
  if (!item) return false;

  context.currentSubsection.items.push(item);
  return true;
}

/**
 * Process a single line of the checklist
 * @param {object} context The current parsing context
 * @param {string} line The line to process
 */
function processLine(context: ParsingContext, line: string): void {
  if (shouldSkipLine(line)) return;

  // Try each parser in order - return after first success
  if (processSectionIfFound(context, line)) return;
  if (processSubsectionIfFound(context, line)) return;
  processListItemIfFound(context, line);
}

/**
 * Create initial parsing context
 * @returns The initial parsing context
 */
function createContext(): ParsingContext {
  return {
    progress: { sections: [] },
    currentSection: null,
    currentSubsection: null,
  };
}

export async function getChecklistProgress(filePath: string): Promise<ChecklistProgress> {
  try {
    const fileContent = await readFileContent(filePath);
    const lines = fileContent.split('\n');
    const context = createContext();

    lines.forEach((line) => processLine(context, line));

    return context.progress;
  } catch (error) {
    if (error instanceof Error) {
      return { sections: [], error: error.message };
    }
    return { sections: [], error: 'Unknown error occurred' };
  }
}

async function readFileContent(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, 'utf-8');
}
