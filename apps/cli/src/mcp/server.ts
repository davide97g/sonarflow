#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fetchSonarIssues } from "../packages/versioning/index.js";

dotenv.config({ quiet: true });

const cwd = process.cwd();
const resolvedConfigPath = process.env.SONARFLOW_CONFIG_PATH
  ? path.resolve(cwd, process.env.SONARFLOW_CONFIG_PATH)
  : path.join(cwd, ".sonarflowrc.json");
const projectRoot = path.dirname(resolvedConfigPath);

interface SonarflowConfig {
  repoName: string;
  gitOrganization: string;
  sonarProjectKey: string;
  outputPath?: string;
  rulePath?: string;
  [key: string]: unknown;
}

interface SonarIssue {
  severity?: string;
  component?: string;
  rule?: string;
  [key: string]: unknown;
}

interface SonarIssuesResponse {
  issues?: SonarIssue[];
  [key: string]: unknown;
}

const readConfig = (): SonarflowConfig | null => {
  if (!fs.existsSync(resolvedConfigPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(resolvedConfigPath, "utf8")) as SonarflowConfig;
  } catch {
    return null;
  }
};

const getOutputDir = (): string => {
  const config = readConfig();
  const outputPath = config?.outputPath ?? ".sonarflow";
  return path.join(projectRoot, outputPath.replace(/\/$/, ""));
};

const readJsonFile = <T>(filePath: string): T | null => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
};

const server = new McpServer(
  {
    name: "sonarflow",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// sonarflow_fetch
server.registerTool<ZodRawShapeCompat, ZodRawShapeCompat>(
  "sonarflow_fetch",
  {
    title: "Fetch SonarQube issues",
    description:
      "Run the same fetch as 'sonarflow fetch': detect branch/PR, fetch Sonar issues, measures, quality gate, and save to .sonarflow/. Pass 'pr' to fetch by Sonar PR link or PR number (API URL from config). Returns a short summary.",
    inputSchema: {
      branch: z.string().optional(),
      sonarPrLink: z.string().optional(),
      pr: z
        .string()
        .optional()
        .describe(
          "Sonar PR/quality-gate URL (any host) or raw PR number; API URL is built from config"
        ),
      verbose: z.boolean().optional(),
    } as unknown as ZodRawShapeCompat,
  },
  async (args: {
    branch?: string;
    sonarPrLink?: string;
    pr?: string;
    verbose?: boolean;
  }) => {
    const verbose = args.verbose ?? false;
    const noop = () => {};
    const origLog = console.log;
    const origWarn = console.warn;
    if (!verbose) {
      console.log = noop;
      console.warn = noop;
    }
    try {
      if (args.pr != null && args.pr.length > 0) {
        await fetchSonarIssues(null, args.pr, verbose, projectRoot);
      } else {
        const branch = args.branch ?? null;
        const sonarPrLink = args.sonarPrLink ?? null;
        await fetchSonarIssues(branch, sonarPrLink, verbose, projectRoot);
      }
    } catch (err) {
      console.log = origLog;
      console.warn = origWarn;
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: message }) }],
      };
    }
    console.log = origLog;
    console.warn = origWarn;
    const outDir = getOutputDir();
    const issuesPath = path.join(outDir, "issues.json");
    const qualityGatePath = path.join(outDir, "quality-gate.json");
    const issues = readJsonFile<SonarIssuesResponse>(issuesPath);
    const qualityGate = readJsonFile<Record<string, unknown>>(qualityGatePath);
    const issueCount = issues?.issues?.length ?? 0;
    const projectStatus = qualityGate?.projectStatus as { status?: string } | undefined;
    const summary = {
      ok: true,
      issueCount,
      qualityGateStatus: projectStatus?.status ?? "unknown",
      paths: {
        issues: issuesPath,
        qualityGate: qualityGatePath,
      },
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
    };
  }
);

// sonarflow_get_issues
server.registerTool<ZodRawShapeCompat, ZodRawShapeCompat>(
  "sonarflow_get_issues",
  {
    title: "Get SonarQube issues",
    description:
      "Read .sonarflow/issues.json with optional filters by severity, component (file path), or rule.",
    inputSchema: {
      severity: z.string().optional(),
      component: z.string().optional(),
      rule: z.string().optional(),
      limit: z.number().optional(),
    } as unknown as ZodRawShapeCompat,
  },
  async (args: { severity?: string; component?: string; rule?: string; limit?: number }) => {
    const outDir = getOutputDir();
    const issuesPath = path.join(outDir, "issues.json");
    const data = readJsonFile<SonarIssuesResponse>(issuesPath);
    if (!data?.issues) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "No issues file found. Run sonarflow fetch first.",
              path: issuesPath,
            }),
          },
        ],
      };
    }
    let list = data.issues;
    if (args.severity) {
      const sev = args.severity.toUpperCase();
      list = list.filter((i) => (i.severity ?? "").toUpperCase() === sev);
    }
    if (args.component) {
      const comp = args.component;
      list = list.filter(
        (i) =>
          (i.component ?? "").includes(comp) ||
          (typeof i.component === "string" && comp.includes(i.component))
      );
    }
    if (args.rule) {
      list = list.filter((i) => (i.rule ?? "").includes(args.rule as string));
    }
    if (typeof args.limit === "number" && args.limit > 0) {
      list = list.slice(0, args.limit);
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total: list.length, issues: list }, null, 2),
        },
      ],
    };
  }
);

// sonarflow_get_issues_by_file
server.registerTool<ZodRawShapeCompat, ZodRawShapeCompat>(
  "sonarflow_get_issues_by_file",
  {
    title: "Get issues grouped by file",
    description:
      "Read .sonarflow/issues.json and group issues by file (component) for fix-by-file workflows.",
    inputSchema: {
      limit: z.number().optional(),
    } as unknown as ZodRawShapeCompat,
  },
  async (args: { limit?: number }) => {
    const outDir = getOutputDir();
    const issuesPath = path.join(outDir, "issues.json");
    const data = readJsonFile<SonarIssuesResponse>(issuesPath);
    if (!data?.issues) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "No issues file found. Run sonarflow fetch first.",
              path: issuesPath,
            }),
          },
        ],
      };
    }
    const byFile: Record<string, SonarIssue[]> = {};
    for (const issue of data.issues) {
      const comp = (issue.component ?? "unknown") as string;
      if (!byFile[comp]) byFile[comp] = [];
      byFile[comp].push(issue);
    }
    const entries = Object.entries(byFile);
    const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : entries.length;
    const limited = entries
      .slice(0, limit)
      .map(([file, issues]) => ({ file, issues, count: issues.length }));
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ totalFiles: entries.length, byFile: limited }, null, 2),
        },
      ],
    };
  }
);

// sonarflow_get_quality_gate
server.registerTool<ZodRawShapeCompat, ZodRawShapeCompat>(
  "sonarflow_get_quality_gate",
  {
    title: "Get quality gate status",
    description: "Read .sonarflow/quality-gate.json and return status and conditions.",
  },
  async () => {
    const outDir = getOutputDir();
    const filePath = path.join(outDir, "quality-gate.json");
    const data = readJsonFile<Record<string, unknown>>(filePath);
    if (!data) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "No quality gate file found. Run sonarflow fetch first.",
              path: filePath,
            }),
          },
        ],
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
);

// sonarflow_get_measures
server.registerTool<ZodRawShapeCompat, ZodRawShapeCompat>(
  "sonarflow_get_measures",
  {
    title: "Get SonarQube measures",
    description:
      "Read key metrics from .sonarflow/measures.json (coverage, duplication, violations, etc.). Optionally filter by metric keys.",
    inputSchema: {
      metricKeys: z.string().optional(),
    } as unknown as ZodRawShapeCompat,
  },
  async (args: { metricKeys?: string }) => {
    const outDir = getOutputDir();
    const filePath = path.join(outDir, "measures.json");
    const data = readJsonFile<Record<string, unknown>>(filePath);
    if (!data) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "No measures file found. Run sonarflow fetch first.",
              path: filePath,
            }),
          },
        ],
      };
    }
    const component = data.component as
      | { measures?: Array<{ metric?: string; value?: string }> }
      | undefined;
    const measures = component?.measures ?? [];
    let result: Record<string, string | number> = {};
    for (const m of measures) {
      if (m.metric == null || m.value == null) continue;
      const num = Number.parseFloat(m.value);
      result[m.metric] = Number.isNaN(num) ? m.value : num;
    }
    const metricKeysStr = typeof args.metricKeys === "string" ? args.metricKeys : "";
    if (metricKeysStr.trim()) {
      const keys = new Set(metricKeysStr.split(",").map((k: string) => k.trim()));
      const filtered: Record<string, string | number> = {};
      for (const k of keys) {
        if (result[k] !== undefined) filtered[k] = result[k];
      }
      result = filtered;
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// sonarflow_get_config
server.registerTool<ZodRawShapeCompat, ZodRawShapeCompat>(
  "sonarflow_get_config",
  {
    title: "Get Sonarflow config",
    description: "Read and return .sonarflowrc.json (rulePath, outputPath, sonarProjectKey, etc.).",
  },
  async () => {
    const config = readConfig();
    if (!config) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Config not found. Run 'sonarflow init' to set up the project.",
              path: resolvedConfigPath,
            }),
          },
        ],
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(config, null, 2) }],
    };
  }
);

// sonarflow_get_autofix_rule
server.registerTool<ZodRawShapeCompat, ZodRawShapeCompat>(
  "sonarflow_get_autofix_rule",
  {
    title: "Get autofix rule content",
    description:
      "Read the Sonarflow autofix rule file from the path specified in config (rulePath).",
  },
  async () => {
    const config = readConfig();
    const rulePath = config?.rulePath;
    if (!rulePath) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error:
                "No rulePath in config. Run 'sonarflow init' and set rulePath in .sonarflowrc.json.",
            }),
          },
        ],
      };
    }
    const fullPath = path.isAbsolute(rulePath) ? rulePath : path.join(projectRoot, rulePath);
    if (!fs.existsSync(fullPath)) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "Rule file not found.", path: fullPath }),
          },
        ],
      };
    }
    const content = fs.readFileSync(fullPath, "utf8");
    return {
      content: [{ type: "text" as const, text: content }],
    };
  }
);

// sonarflow_check_setup
server.registerTool<ZodRawShapeCompat, ZodRawShapeCompat>(
  "sonarflow_check_setup",
  {
    title: "Check Sonarflow setup",
    description:
      "Check if the project is initialized (.sonarflowrc.json exists) and has fetched data (.sonarflow/issues.json).",
  },
  async () => {
    const hasConfig = readConfig() !== null;
    const outDir = getOutputDir();
    const issuesPath = path.join(outDir, "issues.json");
    const hasIssues = fs.existsSync(issuesPath);
    const result = {
      initialized: hasConfig,
      hasFetchedData: hasIssues,
      configPath: resolvedConfigPath,
      issuesPath,
      suggestion: !hasConfig
        ? "Run 'sonarflow init' to configure the project."
        : !hasIssues
          ? "Run 'sonarflow fetch' to fetch SonarQube issues."
          : "Setup complete. You can use other sonarflow tools to read issues and fix them.",
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
void main();
