# Memory Bank CLI

A command-line tool for parsing and displaying checklist status from markdown files. Designed to work with Roo Code's Memory Bank ([GitHub](https://github.com/RooVetGit/Roo-Code/blob/main/prompting/custom%20instructions%20library/roo-code-memory-bank.md) | [Documentation](https://docs.roo.vet/improving-your-prompting-skills/custom-instructions-library/roo-code-memory-bank)), a system that helps maintain perfect documentation across memory resets.

## Project Architecture

This is a TypeScript ES Module Node.js project:

- Uses native ES modules (package.json `"type": "module"`)
- TypeScript configured for ESM output
- Node.js native ESM imports (e.g., `node:fs`)
- See package.docs.jsonc for detailed configuration comments

## Features

- Parse markdown files with checklist items
- Display status with emoji indicators (✅ ⚠️ ❌)
- Filter incomplete items with `--incomplete` flag
- Native support for Roo Code's Memory Bank files:
    - productContext.md
    - activeContext.md
    - systemPatterns.md
    - techContext.md
    - progress.md

## Installation

### Global Installation (Recommended)

```bash
# Install globally with npm
npm install -g @amazon1148/checklist-status

# Use from anywhere
checklist-status path/to/checklist.md
```

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd checklist-status

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Single File Mode

```bash
# Using global installation
checklist-status path/to/checklist.md
checklist-status path/to/checklist.md --incomplete

# Using local installation
node dist/checklist-status.js path/to/checklist.md
node dist/checklist-status.js path/to/checklist.md --incomplete
```

### Memory Bank Mode

```bash
# Using global installation
checklist-status --docs-path=/path/to/roo_code_docs
checklist-status --docs-path=/path/to/roo_code_docs --incomplete

# Using local installation
node dist/checklist-status.js --docs-path=/path/to/roo_code_docs
node dist/checklist-status.js --docs-path=/path/to/roo_code_docs --incomplete
```

## Configuration

### Logging Options

The tool provides several logging options to control output verbosity and format:

```bash
# Default output (INFO level)
checklist-status path/to/checklist.md

# Verbose output with debug information
checklist-status path/to/checklist.md --verbose

# Quiet mode (errors only)
checklist-status path/to/checklist.md --quiet

# JSON output format (for machine parsing)
checklist-status path/to/checklist.md --json
```

Log levels:

- ERROR: Critical errors that prevent the tool from working
- WARN: Non-fatal issues or concerning conditions
- INFO: Standard operational information (default)
- DEBUG: Detailed information for troubleshooting

The JSON output format includes:

- Timestamp for each log entry
- Log level
- Message content
- Additional context metadata
- Error details and stack traces when applicable

These options can be combined with other flags:

```bash
# Verbose output with incomplete items only
checklist-status path/to/checklist.md --verbose --incomplete

# JSON output for Memory Bank mode
checklist-status --docs-path=/path/to/docs --json
```

### Documentation Directory

The tool supports both local and remote documentation directories. You can specify the location of your Memory Bank documents using the `--docs-path` argument:

```bash
# Local docs directory
checklist-status --docs-path=./docs

# Remote docs directory (absolute path)
checklist-status --docs-path=/Users/username/workspace/project/roo_code_docs

# Remote docs directory (with home directory expansion)
checklist-status --docs-path=~/workspace/project/roo_code_docs
```

The specified directory must contain the following Memory Bank files:

- productContext.md
- activeContext.md
- systemPatterns.md
- techContext.md
- progress.md

### Git Integration

The tool uses Git to validate repositories and fetch remote information. By default, it looks for Git in the following locations:

- Windows: `C:\Program Files\Git\bin\git.cmd`
- macOS/Linux: `/usr/bin/git`

If your Git executable is in a different location, you can modify the `GIT_PATHS` constant in `memorybank-status.ts`:

```typescript
const GIT_PATHS = {
	WINDOWS: "C:\\Program Files\\Git\\bin\\git.cmd", // Modify for Windows
	UNIX: "/usr/bin/git", // Modify for macOS/Linux
} as const
```

### Environment-Specific Configuration

For development and testing:

1. Update test paths in `tests/memorybank-status.test.ts`:

    ```typescript
    const TEST_PATHS = {
    	HOME: "/Users/test", // Update for your environment
    	WORKSPACE: "/Users/test/workspace",
    	SYSTEM_LOG: "/var/log",
    	GIT: {
    		MACOS: "/usr/bin/git",
    		WINDOWS: "C:\\Program Files\\Git\\bin\\git.cmd",
    		LINUX: "/usr/bin/git",
    	},
    } as const
    ```

2. When running tests, ensure the paths match your development environment.

## Checklist Format

The tool expects markdown files with the following format:

```markdown
## Section Name

### Subsection Name

- ✅ Completed item
- ⚠️ Partially implemented item
- ❌ Not implemented item
- Regular item (defaults to pending)
```

This format is compatible with Roo Code's Memory Bank documentation structure, making it easy to track progress across different aspects of your project.

## Development

```bash
# Run tests
npm test

# Run linting
npm run lint

# Run linting with auto-fix
npm run lint:fix
```

## Related Documentation

- [Roo Code's Memory Bank Documentation](https://docs.roo.vet/improving-your-prompting-skills/custom-instructions-library/roo-code-memory-bank) - Official documentation
- [Roo Code's Memory Bank GitHub](https://github.com/RooVetGit/Roo-Code/blob/main/prompting/custom%20instructions%20library/roo-code-memory-bank.md) - Source repository

## License

MIT
