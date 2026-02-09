# Sonarflow

[![Production Release](https://github.com/davide97g/sonarflow/actions/workflows/release-production.yml/badge.svg)](https://github.com/davide97g/sonarflow/actions/workflows/release-production.yml)

<p align="center">
  <img src="./public/logo.svg" alt="Sonarflow logo" width="128" />
</p>

<p align="center">
  <a href="https://sonarflow.dev/">🌐 Website</a>
</p>

CLI utility for fetching SonarQube issues. Automatically detects PR IDs from branches and fetches SonarQube issues for code quality analysis. Includes AI editor integration for automated issue fixing. Supports GitHub and Bitbucket.

## Installation

Since this package is published to GitHub Packages, you'll need to authenticate to install it.

### Install the package

```bash
npm install sonarflow
```

Or install globally:

```bash
npm install -g sonarflow
```

## Quick Start

### 1. Initialize Configuration

Run the interactive setup to configure your project:

```bash
npx sonarflow init
```

This will:

- Create `.sonarflowrc.json` with your project settings (repo, visibility, publicSonar, output path, preferred AI editor)
- Add npm scripts to your `package.json`
- Create AI editor rules for automated issue fixing (Cursor, VSCode, Windsurf)
- Install a workspace icon theme so `.sonarflowrc.json` uses a custom icon in VS Code/Cursor

### 2. Set Up Environment Variables

Create a `.env` file in your project root:

```env
# Git Provider (shared)
GIT_TOKEN=your-token                    # GitHub or Bitbucket token (required for PR detection)
GIT_EMAIL=your-email@example.com        # Required for Bitbucket PR detection; optional for GitHub or if you already have configured `git config user.email`

# GitHub (only if using GitHub)
GITHUB_OWNER=your-username-or-org
GITHUB_REPO=your-repo-name

# SonarQube/SonarCloud Configuration
SONAR_TOKEN=your-sonar-token            # Required for private Sonar; not needed if publicSonar=true
SONAR_ORGANIZATION=your-organization    # For SonarCloud
SONAR_COMPONENT_KEYS=your-project-key   # For SonarCloud fetch
SONAR_BASE_URL=https://sonarcloud.io/api/issues/search  # Optional override
SONAR_PROJECT_KEY=your-project-key      # SonarQube project identifier
```

Notes:

- If `.sonarflowrc.json` has `"publicSonar": true`, the tool won't require `SONAR_TOKEN`.
- For Bitbucket PR detection, both `GIT_EMAIL` and `GIT_TOKEN` are required.

## Access Tokens (How to Create + Required Scopes)

To use this CLI you'll need tokens for your Git provider and, when fetching from private projects, for Sonar.

- **GitHub Personal Access Token**
  - **What you need**: Classic token with minimal scopes
  - **Scopes**:
    - `read:packages` (required to install from GitHub Packages)
    - `repo` (required if your repository is private to detect PRs)
  - **Guide**: [Create a GitHub personal access token (classic)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

- **Bitbucket App Password**
  - **What you need**: App password for Bitbucket Cloud
  - **Permissions** (minimum recommended):
    - Repositories: `Read`
    - Pull requests: `Read`
    - Account: `Read` (to resolve email/user when needed)
  - You must also set `GIT_EMAIL` to your Bitbucket email in `.env`.
  - **Guide**: [Bitbucket Cloud — App passwords](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/)

- **Sonar Token**
  - Required only when fetching from private SonarQube/SonarCloud projects or when `.sonarflowrc.json` does not set `"publicSonar": true`.
  - **Scope**: Standard user token (no special permissions typically needed beyond access to the project)
  - **Guides**:
    - SonarCloud: [Generating and using tokens](https://docs.sonarcloud.io/advanced-setup/user-accounts/generating-and-using-tokens/)
    - SonarQube: [Generate and use tokens](https://docs.sonarsource.com/sonarqube/latest/user-guide/user-account/generate-and-use-tokens/)

After creating tokens, place them in your `.env` as shown in the "Set Up Environment Variables" section above.

## Usage

### Commands

#### Fetch SonarQube Issues

```bash
# Fetch issues for current branch (auto-detects PR on GitHub/Bitbucket)
npx sonarflow fetch

# Fetch issues for a specific branch
npx sonarflow fetch my-branch

# Fetch issues from a SonarQube PR link
npx sonarflow fetch my-branch https://sonarcloud.io/project/issues?id=project&pullRequest=PR_KEY
```

- Auto PR detection tries provider API first (GitHub or Bitbucket), then falls back to extracting from branch naming patterns.
- Issues are saved to `.sonarflow/issues.json`.

#### Initialize Configuration

```bash
# Interactive setup
npx sonarflow init
```

#### Check for Updates

```bash
# Check for updates and get latest version info
npx sonarflow update
```

#### Start MCP Server

```bash
# Start the MCP server for AI editors (stdio transport)
npx sonarflow mcp
```

Use this in Cursor or other MCP-enabled editors so the AI can call Sonarflow tools (fetch issues, read config, get issues by file, etc.) without running shell commands.

### As npm Scripts

After initialization, you can use the added npm scripts:

```bash
# Fetch issues
sonar:fetch
```

## Features

- **Automatic PR Detection**: Detects PR IDs from your current git branch using GitHub or Bitbucket APIs
- **Fallback Support**: Falls back to branch-based extraction if PR detection fails
- **PR Link Support**: Fetch issues directly using a SonarQube PR link
- **AI Editor Integration**: Creates rules for Cursor, VSCode, Windsurf for automated issue fixing
- **MCP Server**: Exposes Sonarflow as tools for AI editors (Cursor, etc.) via the Model Context Protocol
- **Custom Icon Theme**: Installs a local theme under `.vscode/icon-theme/` and sets `workbench.iconTheme` so `.sonarflowrc.json` is visually distinguished in your workspace
- **Issue Summary**: Displays a summary of issues by severity after fetching
- **Configuration Management**: Interactive setup for easy configuration
- **Update Checking**: Built-in command to check for updates and get latest version info

## Tech Stack

- **Language**: TypeScript (compiled to Node.js)
- **Runtime**: Node.js (>= 22.21.0)
- **Package Manager/Registry**: npm + GitHub Packages
- **Build/Bundle**: TypeScript `tsc`
- **TypeScript Native Reference**: [microsoft/typescript-go](https://github.com/microsoft/typescript-go) (TypeScript 7 native preview)
- **Lint/Format**: Biome
- **Lockfile**: Bun (for development reproducibility)
- **APIs**: SonarQube/SonarCloud REST APIs, GitHub REST API, Bitbucket Cloud API
- **Editor Integrations**: Cursor, VSCode (Copilot), Windsurf rule templates

## Updating the CLI

Since this CLI is designed to be used with `npx`, updating is simple:

### Always Get the Latest Version

```bash
# Use @latest to always get the most recent version
npx sonarflow@latest <command>
```

## How It Works

### Fetch Command

1. Detects the current git branch or uses provided branch name
2. Attempts to find associated PR using GitHub or Bitbucket API, or branch name pattern matching
3. Fetches SonarQube issues for the PR or branch
4. Saves issues to `.sonarflow/issues.json`
5. Displays a summary of fetched issues


### Init Command

1. Prompts for project configuration (repo name, git provider, visibility, etc.)
2. Creates configuration file `.sonarflowrc.json`
3. Updates `package.json` with npm scripts
4. Creates AI editor rules based on your editor choice

## Output Files

- `.sonarflow/issues.json` - Fetched SonarQube issues in JSON format
- `.sonarflowrc.json` - Project configuration
- `.cursor/rules/sonarflow-autofix.mdc` - Cursor AI rules (if selected)
- `.vscode/sonarflow-autofix.md` - VSCode rules (if selected)
- `.windsurf/rules/sonarflow-autofix.mdc` - Windsurf rules (if selected)
- `.rules/sonarflow-autofix.md` - Generic rules (if selected "other")

## AI Editor Integration

The tool creates specific rules for your chosen AI editor to help with automated SonarQube issue fixing:

- **Cursor**: Creates `.cursor/rules/sonarflow-autofix.mdc`
- **VSCode with Copilot**: Creates `.vscode/sonarflow-autofix.md`
- **Windsurf**: Creates `.windsurf/rules/sonarflow-autofix.mdc`
- **Other**: Creates `.rules/sonarflow-autofix.md`

These rules provide patterns and priorities for fixing common SonarQube issues.

## MCP Server

Sonarflow includes an [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server so AI editors (e.g. Cursor) can use Sonarflow via tools instead of terminal commands.

### Running the MCP server

```bash
npx sonarflow mcp
```

The server uses stdio: the editor spawns this command and communicates over stdin/stdout.

### Adding to Cursor

1. Open Cursor Settings → MCP (or edit `.cursor/mcp.json` in your project/user config).
2. Add a Sonarflow server entry. Example:

```json
{
  "mcpServers": {
    "sonarflow": {
      "command": "npx",
      "args": ["sonarflow", "mcp"]
    }
  }
}
```

For a project that has Sonarflow installed locally, you can use the CLI path:

```json
{
  "mcpServers": {
    "sonarflow": {
      "command": "node",
      "args": ["node_modules/sonarflow/dist/mcp/server.js"]
    }
  }
}
```

### Tools provided

| Tool | Description |
|------|-------------|
| **sonarflow_fetch** | Run the same fetch as `sonarflow fetch`; returns a short summary (issue count, quality gate status, file paths). |
| **sonarflow_get_issues** | Read `.sonarflow/issues.json` with optional filters: severity, component (file path), rule, limit. |
| **sonarflow_get_issues_by_file** | Same issues grouped by file (component) for "fix all issues in this file" workflows. |
| **sonarflow_get_quality_gate** | Read `.sonarflow/quality-gate.json` (status and conditions). |
| **sonarflow_get_measures** | Read key metrics from `.sonarflow/measures.json` (coverage, duplication, etc.); optional metric key filter. |
| **sonarflow_get_config** | Read `.sonarflowrc.json` (rulePath, outputPath, sonarProjectKey, etc.). |
| **sonarflow_get_autofix_rule** | Read the autofix rule file from the path in config (`rulePath`). |
| **sonarflow_check_setup** | Check if the project is initialized and has fetched data; suggests `sonarflow init` or `sonarflow fetch` if needed. |

All tools resolve paths from the current working directory (project root). Run `sonarflow init` and `sonarflow fetch` at least once so the AI has config and issue data to read.

## Requirements

- Node.js (>= 22.21.0)
- Git repository
- Git provider token (`GIT_TOKEN`) and, for Bitbucket, `GIT_EMAIL`
- SonarQube/SonarCloud access

## License

ISC
