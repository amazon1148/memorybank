import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockInstance } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as childProcess from 'child_process';

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

// Mock the imports
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    promises: {
      ...actual.promises,
      readdir: vi.fn().mockResolvedValue(['file1', 'file2']),
    },
  };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof os>('os');
  return {
    ...actual,
    platform: vi.fn(),
    homedir: vi.fn().mockReturnValue('/Users/test'),
  };
});

vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof childProcess>('child_process');
  return {
    ...actual,
    exec: vi.fn(),
  };
});

// Import after mocks
const { validateRepositories, getGitPath, toTildePath } = await import(
  '../scripts/checklist-status.js'
);

describe('checklist-status', () => {
  const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.existsSync as unknown as MockInstance<(path: string) => boolean>).mockImplementation(
      (_path: string) => {
        // Return true for repository path, .git directory, and docs by default
        return true;
      },
    );
    (os.platform as unknown as MockInstance<() => string>).mockReturnValue('darwin');
    (
      childProcess.exec as unknown as MockInstance<(cmd: string, callback: ExecCallback) => void>
    ).mockImplementation((_cmd: string, callback: ExecCallback) => {
      callback(null, 'git@github.com:test/repo.git', '');
    });
  });

  describe('getGitPath', () => {
    it('should return correct git path for macOS', () => {
      (os.platform as unknown as MockInstance<() => string>).mockReturnValue('darwin');
      expect(getGitPath()).toBe('/usr/bin/git');
    });

    it('should return correct git path for Windows', () => {
      (os.platform as unknown as MockInstance<() => string>).mockReturnValue('win32');
      expect(getGitPath()).toBe('C:\\Program Files\\Git\\bin\\git.cmd');
    });

    it('should return correct git path for Linux', () => {
      (os.platform as unknown as MockInstance<() => string>).mockReturnValue('linux');
      expect(getGitPath()).toBe('/usr/bin/git');
    });
  });

  describe('toTildePath', () => {
    it('should convert home directory to tilde', () => {
      expect(toTildePath('/Users/test/workspace')).toBe('~/workspace');
    });

    it('should not modify paths outside home directory', () => {
      expect(toTildePath('/var/log')).toBe('/var/log');
    });
  });

  describe('validateRepositories', () => {
    it('should handle missing git executable gracefully', async () => {
      (fs.existsSync as unknown as MockInstance<(path: string) => boolean>).mockImplementation(
        (path: string) => {
          // Return true for repository and .git directory, false for git executable
          if (path.includes('/usr/bin/git')) {
            return false;
          }
          // Ensure .git directory exists
          if (path.includes('.git')) {
            return true;
          }
          return true;
        },
      );

      await validateRepositories();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Remote URL: Could not determine remote URL (git not found)'),
      );
    });

    it('should handle git command errors gracefully', async () => {
      const error = new Error('git error');
      (
        childProcess.exec as unknown as MockInstance<(cmd: string, callback: ExecCallback) => void>
      ).mockImplementation((_cmd: string, callback: ExecCallback) => {
        callback(error, '', 'Command failed');
      });

      await validateRepositories();

      expect(mockConsoleError).toHaveBeenCalledWith('exec error: Error: git error');
    });

    it('should validate repository paths', async () => {
      (fs.existsSync as unknown as MockInstance<(path: string) => boolean>).mockImplementation(
        () => true,
      );

      await validateRepositories();

      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('.git'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✓ VSCode Context repository exists'),
      );
    });

    it('should throw error for missing repository', async () => {
      (fs.existsSync as unknown as MockInstance<(path: string) => boolean>).mockReturnValue(false);

      await expect(validateRepositories()).rejects.toThrow(
        'VSCode Context repository not found at:',
      );
    });
  });
});
