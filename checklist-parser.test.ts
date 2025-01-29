import { describe, it, expect, vi } from 'vitest';
import { getChecklistProgress } from '../lib/checklist-parser.js';
import fs from 'fs';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    default: {
      ...actual,
      promises: {
        ...actual.promises,
        readFile: vi.fn(),
      },
    },
    promises: {
      ...actual.promises,
      readFile: vi.fn(),
    },
  };
});

interface ChecklistItem {
  description: string;
  status: 'completed' | 'not implemented' | 'partially implemented' | 'pending';
}

interface Subsection {
  title: string;
  items: ChecklistItem[];
}

interface Section {
  title: string;
  subsections: Subsection[];
}

interface ChecklistProgress {
  sections: Section[];
  error?: string;
}

describe('checklist-parser', () => {
  const mockContent = `
## Section 1
### Subsection 1.1
- ✅ Task 1
- ❌ Task 2
- ⚠️ Task 3
- Task 4
`;

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.promises.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockContent);
  });

  it('should parse markdown content correctly', async () => {
    const result: ChecklistProgress = await getChecklistProgress(
      '/Users/kieranlal/workspace/docs-backup/Implementation-Status.md',
    );

    // Basic structure checks
    expect(result).toBeDefined();
    expect(result.sections).toBeInstanceOf(Array);
    expect(result.sections.length).toBe(1);

    // Check section
    const section = result.sections[0];
    expect(section.title).toBe('Section 1');
    expect(section.subsections).toHaveLength(1);

    // Check subsection
    const subsection = section.subsections[0];
    expect(subsection.title).toBe('Subsection 1.1');
    expect(subsection.items).toHaveLength(4);

    // Check items
    expect(subsection.items[0]).toEqual({
      description: 'Task 1',
      status: 'completed',
    });
    expect(subsection.items[1]).toEqual({
      description: 'Task 2',
      status: 'not implemented',
    });
    expect(subsection.items[2]).toEqual({
      description: 'Task 3',
      status: 'partially implemented',
    });
    expect(subsection.items[3]).toEqual({
      description: 'Task 4',
      status: 'pending',
    });
  });

  it('should handle missing file gracefully', async () => {
    (fs.promises.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('File not found'),
    );
    const result: ChecklistProgress = await getChecklistProgress('nonexistent.md');
    expect(result).toEqual({
      sections: [],
      error: expect.any(String),
    });
  });
});
