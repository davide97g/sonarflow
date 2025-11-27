#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import dotenv from "dotenv";
import { SonarIssueExtractor } from "../sonar/index.js";

// Suppress dotenv logs
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
console.log = () => {};
console.warn = () => {};
dotenv.config();
console.log = originalConsoleLog;
console.warn = originalConsoleWarn;

interface Config {
  repoName: string;
  gitOrganization: string;
  sonarProjectKey: string;
  sonarOrganization?: string;
  gitProvider: "github" | "bitbucket";
  outputPath?: string;
  sonarBaseUrl?: string;
  publicSonar?: boolean;
  sonarMode?: "standard" | "custom";
  rulesFlavor?: "safe" | "vibe-coder" | "yolo";
  [key: string]: unknown;
}

interface SonarIssuesResponse {
  issues?: Array<{ severity?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * Loads configuration from .sonarflowrc.json
 * @returns Configuration object
 */
const loadConfiguration = (): Config => {
  const configPath = path.join(process.cwd(), ".sonarflowrc.json");

  if (!fs.existsSync(configPath)) {
    throw new Error("Configuration file not found: .sonarflowrc.json");
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as Config;

  // Validate required configuration
  if (!config.gitProvider) {
    throw new Error("gitProvider is required in configuration");
  }

  if (!["github", "bitbucket"].includes(config.gitProvider)) {
    throw new Error("gitProvider must be either 'github' or 'bitbucket'");
  }

  return config;
};

/**
 * Detects PR ID based on the configured git provider
 * @param branch - Current git branch name
 * @param gitProvider - Git provider (github or bitbucket)
 * @param verbose - Enable verbose logging
 * @returns PR ID if found, null otherwise
 */
const detectPrId = async (
  repoName: string,
  branch: string,
  organization: string,
  gitProvider: "github" | "bitbucket",
  verbose: boolean = false
): Promise<string | null> => {
  const extractor = new SonarIssueExtractor(verbose);
  if (gitProvider === "github") {
    return await extractor.detectGitHubPrId(branch);
  }
  if (gitProvider === "bitbucket") {
    return await extractor.detectBitbucketPrId(branch, repoName, organization);
  }

  return null;
};

/**
 * Formats a table for issues by severity
 */
const formatSeverityTable = (severityCounts: Record<string, number>): string => {
  const sortedEntries = Object.entries(severityCounts).sort(([, a], [, b]) => b - a);
  const maxSeverityLength = Math.max(
    ...sortedEntries.map(([severity]) => severity.length),
    "SEVERITY".length
  );
  const maxCountLength = Math.max(
    ...sortedEntries.map(([, count]) => count.toString().length),
    "COUNT".length
  );

  const header = `┌${"─".repeat(maxSeverityLength + 2)}┬${"─".repeat(maxCountLength + 2)}┐`;
  const footer = `└${"─".repeat(maxSeverityLength + 2)}┴${"─".repeat(maxCountLength + 2)}┘`;
  const separator = `├${"─".repeat(maxSeverityLength + 2)}┼${"─".repeat(maxCountLength + 2)}┤`;

  let table = header + "\n";
  table += `│ ${"SEVERITY".padEnd(maxSeverityLength)} │ ${"COUNT".padStart(maxCountLength)} │\n`;
  table += separator + "\n";

  for (const [severity, count] of sortedEntries) {
    table += `│ ${severity.padEnd(maxSeverityLength)} │ ${count.toString().padStart(maxCountLength)} │\n`;
  }

  table += footer;
  return table;
};

/**
 * Extracts coverage and duplication percentages from measures
 */
const extractMetrics = (measures: Record<string, unknown>): {
  coverage: string | null;
  duplication: string | null;
} => {
  let coverage: string | null = null;
  let duplication: string | null = null;

  // Measures structure: { component: { measures: [{ metric: "coverage", value: "85.5" }, ...] } }
  const component = measures.component as
    | { measures?: Array<{ metric?: string; value?: string }> }
    | undefined;

  if (component?.measures) {
    for (const measure of component.measures) {
      if (measure.metric === "coverage" || measure.metric === "new_coverage") {
        coverage = measure.value || null;
      }
      if (
        measure.metric === "duplicated_lines_density" ||
        measure.metric === "new_duplicated_lines_density"
      ) {
        duplication = measure.value || null;
      }
    }
  }

  return { coverage, duplication };
};

export const fetchSonarIssues = async (
  branchName: string | null = null,
  sonarPrLink: string | null = null,
  verbose: boolean = false
): Promise<void> => {
  try {
    // Load configuration
    const config = loadConfiguration();
    if (verbose) {
      console.log(chalk.blue(`🔧 Using configuration: ${JSON.stringify(config, null, 2)}`));
    }

    // Get current git branch
    const currentBranch =
      branchName || execSync("git branch --show-current", { encoding: "utf8" }).trim();
    if (verbose) {
      console.log(chalk.blue(`Current branch: ${currentBranch}`));
    }

    // Initialize SonarQube extractor
    const extractor = new SonarIssueExtractor(verbose);

    let issues: SonarIssuesResponse;
    let usedSource: string;
    let fetchOptions: { branch?: string; pullRequest?: string } = {};

    if (sonarPrLink) {
      // If PR link is provided, fetch issues from that PR
      if (verbose) {
        console.log(chalk.blue(`Using provided SonarQube PR link: ${sonarPrLink}`));
      }
      // Extract PR key from link
      const prKeyMatch = sonarPrLink.match(/pullRequest=([^&]+)/);
      const prKey = prKeyMatch ? prKeyMatch[1] : null;
      if (!prKey) {
        throw new Error(
          "Invalid SonarQube PR link format. Expected format: https://sonarcloud.io/project/issues?id=project&pullRequest=PR_KEY"
        );
      }
      issues = await extractor.fetchIssuesForPr(sonarPrLink, config);
      fetchOptions = { pullRequest: prKey };
      usedSource = `PR: ${sonarPrLink}`;
    } else {
      // Try to automatically detect PR ID from current branch
      const detectedPrId = await detectPrId(
        config.repoName,
        currentBranch,
        config.gitOrganization,
        config.gitProvider,
        verbose
      );

      if (detectedPrId) {
        // Use detected PR ID
        if (verbose) {
          console.log(chalk.green(`🚀 Using automatically detected PR ID: ${detectedPrId}`));
        }
        issues = await extractor.fetchIssuesForPrId(detectedPrId, config);
        fetchOptions = { pullRequest: detectedPrId };
        usedSource = `PR #${detectedPrId} (auto-detected from branch: ${currentBranch})`;
      } else {
        // Fallback to branch-based approach
        if (verbose) {
          console.warn(chalk.yellow("📋 No PR detected, falling back to branch-based approach"));
        }
        issues = await extractor.fetchIssuesForBranch(currentBranch, config);
        fetchOptions = { branch: currentBranch };
        usedSource = currentBranch;

        // Fallback to develop if no issues found
        if (!issues.issues || issues.issues.length === 0) {
          if (verbose) {
            console.warn(
              chalk.yellow("No issues found for current branch. Falling back to branch: develop")
            );
          }
          issues = await extractor.fetchIssuesForBranch("develop", config);
          fetchOptions = { branch: "develop" };
          usedSource = "develop";
        }
      }
    }

    // Extract duplications, coverage, and security issues
    if (verbose) {
      console.log(chalk.blue("📊 Fetching duplications, coverage, and security hotspots..."));
    }
    const [measures, securityHotspots] = await Promise.all([
      extractor.fetchMeasures(config, fetchOptions).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (verbose) {
          console.warn(chalk.yellow(`⚠️  Failed to fetch measures: ${errorMessage}`));
        }
        return {};
      }),
      extractor.fetchSecurityHotspots(config, fetchOptions).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (verbose) {
          console.warn(chalk.yellow(`⚠️  Failed to fetch security hotspots: ${errorMessage}`));
        }
        return {};
      }),
    ]);

    // Save issues to file
    const outputPath = config.outputPath || ".sonarflow/";
    const sonarDir = path.join(process.cwd(), outputPath);
    if (!fs.existsSync(sonarDir)) {
      fs.mkdirSync(sonarDir, { recursive: true });
    }

    const issuesPath = path.join(sonarDir, "issues.json");
    fs.writeFileSync(issuesPath, JSON.stringify(issues, null, 2));

    // Save measures (duplications and coverage) if available
    if (measures && Object.keys(measures).length > 0) {
      const measuresPath = path.join(sonarDir, "measures.json");
      fs.writeFileSync(measuresPath, JSON.stringify(measures, null, 2));
      if (verbose) {
        console.log(chalk.blue(`📁 Saved measures to: ${measuresPath}`));
      }
    }

    // Save security hotspots if available
    if (securityHotspots && Object.keys(securityHotspots).length > 0) {
      const hotspotsPath = path.join(sonarDir, "security-hotspots.json");
      fs.writeFileSync(hotspotsPath, JSON.stringify(securityHotspots, null, 2));
      if (verbose) {
        const hotspotsCount =
          (securityHotspots as { hotspots?: Array<unknown> }).hotspots?.length || 0;
        console.log(
          chalk.blue(`📁 Saved ${hotspotsCount} security hotspot(s) to: ${hotspotsPath}`)
        );
      }
    }

    if (verbose) {
      console.log(
        chalk.green(
          `✅ Successfully fetched ${issues.issues?.length || 0} issues (source: ${usedSource})`
        )
      );
      console.log(chalk.blue(`📁 Saved to: ${issuesPath}`));
    }

    // Display summary
    if (issues.issues && issues.issues.length > 0) {
      const severityCounts: Record<string, number> = {};
      for (const issue of issues.issues) {
        const severity = issue.severity || "UNKNOWN";
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      }

      if (verbose) {
        console.log(chalk.blue("\n📊 Issues by severity:"));
        const sortedEntries = Object.entries(severityCounts).sort(([, a], [, b]) => b - a);
        for (const [severity, count] of sortedEntries) {
          console.log(chalk.blue(`  ${severity}: ${count}`));
        }
      } else {
        // Non-verbose: Show table format
        console.log(chalk.blue("\n📊 Issues by severity:"));
        console.log(formatSeverityTable(severityCounts));
      }
    }

    // Extract and display metrics (coverage, duplication, security hotspots)
    const metrics = extractMetrics(measures);
    const hotspotsCount =
      (securityHotspots as { hotspots?: Array<unknown> })?.hotspots?.length || 0;

    if (!verbose) {
      console.log();
      if (metrics.coverage !== null) {
        console.log(chalk.blue(`Coverage: ${metrics.coverage}%`));
      }
      if (metrics.duplication !== null) {
        console.log(chalk.blue(`Duplicated lines: ${metrics.duplication}%`));
      }
      if (hotspotsCount > 0) {
        console.log(chalk.blue(`Security hotspots: ${hotspotsCount}`));
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`❌ Error fetching SonarQube issues: ${errorMessage}`));
    process.exit(1);
  }
};

// Only execute if this file is run directly (not imported)
// In ESM, we check if the current file matches the entry point
if (
  import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/") || "") ||
  (typeof process !== "undefined" && process.argv[1]?.includes("versioning"))
) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const branchName = args[0] || null;
  const sonarPrLink = args[1] || null;

  // Execute the main function
  await fetchSonarIssues(branchName, sonarPrLink);
}
