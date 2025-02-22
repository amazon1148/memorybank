# memorybank

**Keep your Roo Code Memory Bank in check, streamline collaboration, and boost your productivity.**

`memorybank` is a command-line tool designed to help you manage your project documentation when working with Roo Code and its Memory Bank system. It provides a fast and easy way to track the status of your project's context, ensuring accuracy, preventing data loss, and facilitating seamless collaboration within your software development lifecycle.

## Installation

```bash
# Install globally with npm
npm install -g memorybank
```

## Usage

The tool assumes your Memory Bank files are in the current directory. You can optionally specify a different directory with `--docs-path`.

```bash
# Run in current directory
memorybank

# Run and show incomplete items only
memorybank --incomplete

# Run in a specific directory
memorybank --docs-path=/path/to/docs

# Run in a specific directory with incomplete items only
memorybank --docs-path=/path/to/docs --incomplete
```

## Key Benefits

*   **Maintain Context Accuracy:** Quickly see the status (✅ ⚠️ ❌) of your Memory Bank documentation, ensuring your project context is always up-to-date and preventing knowledge gaps.
*   **Prevent Data Loss:** Get an instant view of the Git status of your documentation files, reminding you to keep them version-controlled and avoid accidental overwrites.
*   **Streamline Collaboration:** Share a comprehensive status report, including documentation paths or Git repository URL, with other agents (search, chatbots, etc.) and team members, facilitating efficient collaboration.
*   **Reduce Costs and Stay Focused:** Manage your context effectively, minimizing what is loaded into your IDE Agent's working memory, and ensuring that the correct context is available to switch between tasks while reducing the processing time and the cost of using the AI.
*   **Uninterrupted Workflow:** Check and update documentation status and git repository status using the CLI, allowing you to maintain your coding flow without pausing your IDE agent.

## Features

-   Parse markdown files with memorybank items
-   Display status with emoji indicators (✅ ⚠️ ❌)
-   Filter incomplete items with `--incomplete` flag
-   Native support for Roo Code's Memory Bank files:
    -   `productContext.md`
    -   `activeContext.md`
    -   `systemPatterns.md`
    -   `techContext.md`
    -   `progress.md`
-   Git status display for documentation files
-   Output documentation file paths and Git repository information for easy sharing with other agents.

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

-   `productContext.md`
-   `activeContext.md`
-   `systemPatterns.md`
-   `techContext.md`
-   `progress.md`

## memorybank Format

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

-   [Cline/Roo Code's Memory Bank Documentation](https://docs.cline.bot/improving-your-prompting-skills/custom-instructions-library/cline-memory-bank) - Official documentation

## License

MIT