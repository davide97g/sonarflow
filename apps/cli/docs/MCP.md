# Sonarflow MCP Server

The Sonarflow CLI includes an MCP (Model Context Protocol) server so AI editors can call Sonarflow tools over stdio. This document lists the tools and how to configure Cursor (or other MCP clients).

## Running the server

```bash
npx sonarflow mcp start
```

Or after building the CLI from source:

```bash
node path/to/apps/cli/dist/mcp/server.js
```

The server uses **stdio** transport: the editor spawns the process and communicates via stdin/stdout. By default, the server looks for `.sonarflowrc.json` in the **current working directory** (project root when the editor spawns with cwd set to the workspace). All tools resolve paths from that project root.

You can override the config location with the **configPath** attribute:

- **Environment variable** `SONARFLOW_CONFIG_PATH`: path to the `.sonarflowrc.json` file (absolute or relative to process cwd). Set this in your MCP server config if the config file is not in the process cwd.
- **CLI option** `--config-path <path>`: when starting via `npx sonarflow mcp start --config-path <path>`, the server uses that path for the config file.

Example with custom config path:

```bash
npx sonarflow mcp start --config-path /path/to/project/.sonarflowrc.json
```

Or in Cursor MCP config, set `env.SONARFLOW_CONFIG_PATH` to the path to your `.sonarflowrc.json` if the server’s cwd is not the project root.

The server loads `dotenv` with `quiet: true` so no logs are written to stdout (required for the MCP protocol).

## Cursor configuration

Add the Sonarflow MCP server in Cursor Settings → MCP, or in your config file (e.g. project `.cursor/mcp.json` or user MCP settings).

### Using npx (recommended)

```json
{
  "mcpServers": {
    "sonarflow": {
      "command": "npx",
      "args": ["sonarflow", "mcp", "start"]
    }
  }
}
```

If your `.sonarflowrc.json` is not in the process cwd (e.g. Cursor does not set cwd to the workspace), add `env` with `SONARFLOW_CONFIG_PATH`:

```json
{
  "mcpServers": {
    "sonarflow": {
      "command": "npx",
      "args": ["sonarflow", "mcp", "start"],
      "env": {
        "SONARFLOW_CONFIG_PATH": "/absolute/path/to/your/project/.sonarflowrc.json"
      }
    }
  }
}
```

Alternatively, pass the path via CLI: `"args": ["sonarflow", "mcp", "start", "--config-path", "/path/to/.sonarflowrc.json"]`.

### Using local install

If Sonarflow is installed as a dependency in the project:

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

### Using absolute path (e.g. development)

```json
{
  "mcpServers": {
    "sonarflow": {
      "command": "node",
      "args": ["/path/to/sonarflow/apps/cli/dist/mcp/server.js"]
    }
  }
}
```

Ensure the project has been initialized (`sonarflow init`) and that you have run `sonarflow fetch` at least once so the tools have config and issue data to read.

## Tools reference

### sonarflow_fetch

Runs the same logic as `sonarflow fetch`: detects branch/PR, fetches Sonar issues, measures, quality gate, and writes `.sonarflow/*.json`. You can pass a Sonar PR link or PR number via `pr`; the API URL is always built from config. Returns a short summary.

| Argument       | Type    | Description                                                                 |
|----------------|---------|-----------------------------------------------------------------------------|
| `branch`       | string  | Optional. Branch name (default: current branch).                            |
| `sonarPrLink`  | string  | Optional. SonarQube PR URL to fetch from (legacy).                          |
| `pr`           | string  | Optional. Sonar PR/quality-gate URL (any host) or raw PR number; API URL from config. |
| `verbose`      | boolean | Optional. Enable verbose logging.                                           |

### sonarflow_get_issues

Reads `.sonarflow/issues.json` and optionally filters the result.

| Argument    | Type   | Description                                |
|-------------|--------|--------------------------------------------|
| `severity`  | string | Optional. e.g. BLOCKER, CRITICAL, MAJOR.   |
| `component` | string | Optional. Filter by file path (component). |
| `rule`      | string | Optional. Filter by rule key.              |
| `limit`     | number | Optional. Max number of issues to return.  |

### sonarflow_get_issues_by_file

Reads `.sonarflow/issues.json` and groups issues by file (component).

| Argument | Type   | Description                                  |
|----------|--------|----------------------------------------------|
| `limit`  | number | Optional. Max number of files to return.     |

### sonarflow_get_quality_gate

Reads `.sonarflow/quality-gate.json` and returns the full object (status and conditions). No arguments.

### sonarflow_get_measures

Reads `.sonarflow/measures.json` and returns metric key/value pairs (coverage, duplication, violations, etc.).

| Argument    | Type   | Description                                           |
|-------------|--------|-------------------------------------------------------|
| `metricKeys`| string | Optional. Comma-separated list of metric keys to include. |

### sonarflow_get_config

Reads `.sonarflowrc.json` and returns the config (rulePath, outputPath, sonarProjectKey, etc.). No arguments.

### sonarflow_get_autofix_rule

Reads the autofix rule file from the path in config (`rulePath`). No arguments.

### sonarflow_check_setup

Checks whether the project has `.sonarflowrc.json` and `.sonarflow/issues.json`. Returns a suggestion to run `sonarflow init` or `sonarflow fetch` if needed. No arguments.
