# Memory Bank CLI

A command-line tool for parsing and displaying checklist status from markdown files. Designed to work with Roo Code's Memory Bank ([GitHub](https://github.com/RooVetGit/Roo-Code/blob/main/prompting/custom%20instructions%20library/roo-code-memory-bank.md) | [Documentation](https://docs.roo.vet/improving-your-prompting-skills/custom-instructions-library/roo-code-memory-bank)), a system that helps maintain perfect documentation across memory resets.

## Installation

```bash
# Install globally with npm
npm install -g memorybank
```

## Usage

The tool assumes your Memory Bank files are in the current directory. You can optionally specify a different directory with --docs-path.

```bash
# Run in current directory
memorybank

# Run with incomplete items only
memorybank --incomplete

# Run in a specific directory
memorybank --docs-path=/path/to/docs

# Run in a specific directory with incomplete items only
memorybank --docs-path=/path/to/docs --incomplete
```

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

## Documentation Directory

The tool looks for Memory Bank files in the current directory by default. You can optionally specify a different location using the `--docs-path` argument:

```bash
# Use current directory
memorybank

# Use specific directory
memorybank --docs-path=/path/to/docs

# Use directory with home expansion
memorybank --docs-path=~/workspace/project/docs
```

The directory must contain the following Memory Bank files:
- productContext.md
- activeContext.md
- systemPatterns.md
- techContext.md
- progress.md

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
# Clone the repository
git clone <repository-url>
cd memorybank

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Run linting with auto-fix
npm run lint:fix

# Build the project
npm run build
```

## Related Documentation

- [Roo Code's Memory Bank Documentation](https://docs.roo.vet/improving-your-prompting-skills/custom-instructions-library/roo-code-memory-bank) - Official documentation
- [Roo Code's Memory Bank GitHub](https://github.com/RooVetGit/Roo-Code/blob/main/prompting/custom%20instructions%20library/roo-code-memory-bank.md) - Source repository

## License

MIT
