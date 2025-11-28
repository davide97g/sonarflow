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
 * Maps SonarQube severity values to the new classification
 */
const mapSeverity = (severity: string): string => {
  const mapping: Record<string, string> = {
    BLOCKER: "Blocker",
    CRITICAL: "High",
    MAJOR: "Medium",
    MINOR: "Low",
    INFO: "Info",
  };
  return mapping[severity.toUpperCase()] || severity;
};

/**
 * Gets the color function for a severity level
 */
const getSeverityColor = (severity: string): typeof chalk => {
  const mapped = mapSeverity(severity);
  const mappedUpper = mapped.toUpperCase();
  const severityUpper = severity.toUpperCase();

  // Color mapping based on SonarQube UI
  const colorMap: Record<string, typeof chalk> = {
    BLOCKER: chalk.grey,
    HIGH: chalk.red,
    MEDIUM: chalk.hex("#FF8C00"), // Orange
    LOW: chalk.hex("#8B4513"), // Brown
    INFO: chalk.whiteBright,
    // Legacy mappings
    CRITICAL: chalk.red,
    MAJOR: chalk.hex("#FF8C00"), // Orange
    MINOR: chalk.hex("#8B4513"), // Brown
  };

  return colorMap[mappedUpper] || colorMap[severityUpper] || chalk.white;
};

/**
 * Gets the order/priority of a severity level (lower = higher priority)
 */
const getSeverityOrder = (severity: string): number => {
  const mapped = mapSeverity(severity);
  const order: Record<string, number> = {
    Blocker: 1,
    High: 2,
    Medium: 3,
    Low: 4,
    Info: 5,
  };
  return order[mapped] || 99;
};

/**
 * Gets emoji and color for a metric based on its category
 */
const getMetricStyle = (metricKey: string): { emoji: string; color: typeof chalk } => {
  const key = metricKey.toLowerCase();

  // Coverage & Testing metrics (Green/Blue)
  if (
    key.includes("coverage") ||
    key.includes("test") ||
    key.includes("uncovered") ||
    key.includes("line_coverage") ||
    key.includes("branch_coverage")
  ) {
    return { emoji: "📊", color: chalk.green };
  }

  // Duplication metrics (Orange)
  if (key.includes("duplicated") || key.includes("duplication")) {
    return { emoji: "📋", color: chalk.hex("#FF8C00") }; // Orange
  }

  // Security metrics (Red)
  if (key.includes("security") || key.includes("vulnerability") || key.includes("hotspot")) {
    return { emoji: "🔒", color: chalk.red };
  }

  // Reliability & Bugs (Yellow/Orange)
  if (key.includes("reliability") || key.includes("bug") || key.includes("error")) {
    return { emoji: "🐛", color: chalk.yellow };
  }

  // Maintainability & Code Quality (Purple)
  if (
    key.includes("sqale") ||
    key.includes("technical_debt") ||
    key.includes("maintainability") ||
    key.includes("code_smell") ||
    key.includes("debt")
  ) {
    return { emoji: "🔧", color: chalk.hex("#9370DB") }; // Purple
  }

  // Violations & Issues (Red/Orange)
  if (
    key.includes("violation") ||
    key.includes("blocker") ||
    key.includes("critical") ||
    key.includes("major")
  ) {
    if (key.includes("blocker") || key.includes("critical")) {
      return { emoji: "🚨", color: chalk.red };
    }
    return { emoji: "⚠️", color: chalk.hex("#FF8C00") }; // Orange
  }

  // Minor/Info violations (Yellow)
  if (key.includes("minor") || key.includes("info")) {
    return { emoji: "ℹ️", color: chalk.yellow };
  }

  // Rating metrics (Blue)
  if (key.includes("rating")) {
    return { emoji: "⭐", color: chalk.blue };
  }

  // Lines & Size metrics (Cyan)
  if (
    key.includes("lines") ||
    key.includes("ncloc") ||
    key.includes("statements") ||
    key.includes("files")
  ) {
    return { emoji: "📝", color: chalk.cyan };
  }

  // Default (Gray)
  return { emoji: "📈", color: chalk.gray };
};

/**
 * Formats and displays quality gate status with metric comparison
 */
const formatQualityGateStatus = (
  qualityGateStatus: Record<string, unknown>,
  projectMetrics: Record<string, string | number>
): void => {
  const projectStatus = qualityGateStatus.projectStatus as
    | {
        status?: string;
        conditions?: Array<{
          status?: string;
          metricKey?: string;
          comparator?: string;
          errorThreshold?: string;
          warningThreshold?: string;
          actualValue?: string;
          periodIndex?: number;
        }>;
      }
    | undefined;

  if (!projectStatus) {
    return;
  }

  const status = projectStatus.status || "UNKNOWN";
  const conditions = projectStatus.conditions || [];

  // Color mapping for status
  const statusColorMap: Record<string, typeof chalk> = {
    OK: chalk.green,
    WARN: chalk.yellow,
    ERROR: chalk.red,
  };

  const statusColor = statusColorMap[status] || chalk.white;
  const statusIcon = status === "OK" ? "✅" : status === "WARN" ? "⚠️" : "❌";

  console.log();
  console.log(chalk.whiteBright("🚪 Quality Gate Status:"));
  console.log(statusColor(`  ${statusIcon} ${status}`));

  if (conditions.length > 0) {
    console.log();
    console.log(chalk.whiteBright("  Conditions & Metrics Comparison:"));

    // Calculate column widths (accounting for emoji + space = 3 chars, plus extra padding)
    const maxMetricLength =
      Math.max(
        ...conditions.map((c) => {
          const metricKey = c.metricKey || "";
          const { emoji } = getMetricStyle(metricKey);
          const displayName = metricKey
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
          return `${emoji} ${displayName}`.length;
        }),
        "METRIC".length
      ) + 3; // Add extra padding for better alignment
    const maxStatusLength = Math.max(
      ...conditions.map((c) => (c.status || "").length),
      "STATUS".length
    );
    const maxActualLength = Math.max(
      ...conditions.map((c) => (c.actualValue || "-").length),
      "ACTUAL".length,
      10
    );
    const maxThresholdLength = Math.max(
      ...conditions.map((c) => (c.errorThreshold || c.warningThreshold || "-").length),
      "THRESHOLD".length,
      10
    );
    // Print header
    const header = `  ┌${"─".repeat(maxMetricLength + 2)}┬${"─".repeat(maxStatusLength + 2)}┬${"─".repeat(maxActualLength + 2)}┬${"─".repeat(maxThresholdLength + 2)}┐`;
    const footer = `  └${"─".repeat(maxMetricLength + 2)}┴${"─".repeat(maxStatusLength + 2)}┴${"─".repeat(maxActualLength + 2)}┴${"─".repeat(maxThresholdLength + 2)}┘`;
    const separator = `  ├${"─".repeat(maxMetricLength + 2)}┼${"─".repeat(maxStatusLength + 2)}┼${"─".repeat(maxActualLength + 2)}┼${"─".repeat(maxThresholdLength + 2)}┤`;

    console.log(header);
    console.log(
      `  │ ${"METRIC".padEnd(maxMetricLength)} │ ${"STATUS".padEnd(maxStatusLength)} │ ${"ACTUAL".padStart(maxActualLength)} │ ${"THRESHOLD".padStart(maxThresholdLength)} │`
    );
    console.log(separator);

    // Print conditions
    for (const condition of conditions) {
      const metricKey = condition.metricKey || "UNKNOWN";
      const conditionStatus = condition.status || "UNKNOWN";
      const actualValue = condition.actualValue || "-";
      const errorThreshold = condition.errorThreshold || "";
      const warningThreshold = condition.warningThreshold || "";
      const threshold = errorThreshold || warningThreshold || "-";
      const comparator = condition.comparator || "";

      // Get emoji and color for the metric
      const { emoji, color: metricColor } = getMetricStyle(metricKey);

      // Format metric key for display (remove underscores, capitalize)
      const displayMetric = `${emoji} ${metricKey
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")}`;

      // Color based on condition status
      const conditionIcon = conditionStatus === "OK" ? "✓" : conditionStatus === "WARN" ? "⚠" : "✗";
      const statusColor = statusColorMap[conditionStatus] || chalk.white;

      // Format threshold with comparator
      let thresholdDisplay = threshold;
      if (threshold !== "-" && comparator) {
        const comparatorSymbol =
          comparator === "GT" ? ">" : comparator === "LT" ? "<" : comparator === "EQ" ? "=" : "";
        thresholdDisplay = `${comparatorSymbol} ${threshold}`;
      }

      // Build the line with metric color for metric name, status color for status
      const metricPart = metricColor(displayMetric.padEnd(maxMetricLength));
      const statusPart = statusColor(`${conditionIcon} ${conditionStatus}`.padEnd(maxStatusLength));
      const line = `  │ ${metricPart} │ ${statusPart} │ ${actualValue.padStart(maxActualLength)} │ ${thresholdDisplay.padStart(maxThresholdLength)} │`;
      console.log(line);
    }

    console.log(footer);

    // Also show related overall metrics (not just "new_" metrics)
    const relatedMetrics: Array<{ key: string; value: string | number }> = [];
    const shownMetricKeys = new Set(conditions.map((c) => c.metricKey));

    // Find related metrics (e.g., if new_duplicated_lines_density is shown, also show duplicated_lines_density)
    for (const condition of conditions) {
      const metricKey = condition.metricKey || "";
      if (metricKey.startsWith("new_")) {
        const baseMetric = metricKey.replace(/^new_/, "");
        if (projectMetrics[baseMetric] !== undefined && !shownMetricKeys.has(baseMetric)) {
          relatedMetrics.push({ key: baseMetric, value: projectMetrics[baseMetric] });
          shownMetricKeys.add(baseMetric);
        }
      }
    }

    // Also show key metrics that are commonly checked
    const keyMetrics = [
      "duplicated_lines_density",
      "coverage",
      "bugs",
      "vulnerabilities",
      "code_smells",
      "security_hotspots",
      "security_rating",
      "reliability_rating",
      "sqale_rating",
    ];

    for (const keyMetric of keyMetrics) {
      if (
        projectMetrics[keyMetric] !== undefined &&
        !shownMetricKeys.has(keyMetric) &&
        !relatedMetrics.some((m) => m.key === keyMetric)
      ) {
        relatedMetrics.push({ key: keyMetric, value: projectMetrics[keyMetric] });
      }
    }

    if (relatedMetrics.length > 0) {
      console.log();
      console.log(chalk.whiteBright("  Related Project Metrics:"));
      for (const { key, value } of relatedMetrics) {
        const displayKey = key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
        const { emoji, color } = getMetricStyle(key);
        console.log(color(`    ${emoji} ${displayKey}: ${value}`));
      }
    }
  } else {
    // If no conditions, show available project metrics
    console.log();
    console.log(chalk.whiteBright("  Available Project Metrics:"));
    const metricEntries = Object.entries(projectMetrics).slice(0, 20); // Show first 20
    if (metricEntries.length > 0) {
      for (const [key, value] of metricEntries) {
        const displayKey = key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
        const { emoji, color } = getMetricStyle(key);
        console.log(color(`    ${emoji} ${displayKey}: ${value}`));
      }
      if (Object.keys(projectMetrics).length > 20) {
        console.log(
          chalk.gray(`    ... and ${Object.keys(projectMetrics).length - 20} more metrics`)
        );
      }
    }
  }
};

/**
 * Formats a table for issues by severity with colors
 */
const formatSeverityTable = (severityCounts: Record<string, number>): void => {
  // Map and aggregate severities
  const mappedCounts: Record<string, number> = {};
  for (const [severity, count] of Object.entries(severityCounts)) {
    const mapped = mapSeverity(severity);
    mappedCounts[mapped] = (mappedCounts[mapped] || 0) + count;
  }

  // Sort by order (Blocker, High, Medium, Low, Info)
  const sortedEntries = Object.entries(mappedCounts).sort(
    ([a], [b]) => getSeverityOrder(a) - getSeverityOrder(b)
  );

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

  // Print header
  console.log(header);
  console.log(`│ ${"SEVERITY".padEnd(maxSeverityLength)} │ ${"COUNT".padStart(maxCountLength)} │`);
  console.log(separator);

  // Print data rows with colors
  for (const [severity, count] of sortedEntries) {
    const colorFn = getSeverityColor(severity);
    const line = `│ ${severity.padEnd(maxSeverityLength)} │ ${count.toString().padStart(maxCountLength)} │`;
    console.log(colorFn(line));
  }

  // Print footer
  console.log(footer);
};

/**
 * Extracts all metrics from measures, issues, and security hotspots
 */
const extractAllMetrics = (
  measures: Record<string, unknown>,
  issues: SonarIssuesResponse,
  securityHotspots: Record<string, unknown>
): Record<string, string | number> => {
  const metrics: Record<string, string | number> = {};

  // Extract measures
  const component = measures.component as
    | { measures?: Array<{ metric?: string; value?: string }> }
    | undefined;

  if (component?.measures) {
    for (const measure of component.measures) {
      if (measure.metric && measure.value !== undefined && measure.value !== null) {
        // Try to parse as number, otherwise keep as string
        const numValue = Number.parseFloat(measure.value);
        metrics[measure.metric] = Number.isNaN(numValue) ? measure.value : numValue;
      }
    }
  }

  // Extract issue counts by type and severity
  if (issues.issues && Array.isArray(issues.issues)) {
    let bugs = 0;
    let vulnerabilities = 0;
    let codeSmells = 0;
    const severityCounts: Record<string, number> = {};

    for (const issue of issues.issues) {
      const type = (issue.type as string)?.toUpperCase();
      const severity = (issue.severity as string)?.toUpperCase() || "UNKNOWN";

      if (type === "BUG") bugs++;
      else if (type === "VULNERABILITY") vulnerabilities++;
      else if (type === "CODE_SMELL") codeSmells++;

      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    }

    metrics.violations = issues.issues.length;
    metrics.bugs = bugs;
    metrics.vulnerabilities = vulnerabilities;
    metrics.code_smells = codeSmells;
    metrics.blocker_violations = severityCounts.BLOCKER || 0;
    metrics.critical_violations = severityCounts.CRITICAL || 0;
    metrics.major_violations = severityCounts.MAJOR || 0;
    metrics.minor_violations = severityCounts.MINOR || 0;
    metrics.info_violations = severityCounts.INFO || 0;
  }

  // Extract security hotspots (only if not already in measures)
  const hotspots = securityHotspots.hotspots as Array<unknown> | undefined;
  if (hotspots && metrics.security_hotspots === undefined) {
    metrics.security_hotspots = hotspots.length;
    // Count by status
    let reviewed = 0;
    let toReview = 0;
    for (const hotspot of hotspots) {
      const status = (hotspot as { status?: string })?.status?.toUpperCase();
      if (status === "REVIEWED") reviewed++;
      else toReview++;
    }
    metrics.security_hotspots_reviewed = reviewed;
    metrics.security_hotspots_to_review = toReview;
  }

  return metrics;
};

/**
 * Extracts coverage and duplication percentages from measures (for backward compatibility)
 */
const extractMetrics = (
  measures: Record<string, unknown>
): {
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

/**
 * Builds the SonarQube project URL for viewing issues
 */
const buildSonarProjectUrl = (
  config: Config,
  fetchOptions: { branch?: string; pullRequest?: string }
): string => {
  const baseUrl = config.sonarBaseUrl || "https://sonarcloud.io";
  const projectKey = config.sonarProjectKey || config.repoName;

  // Normalize base URL (remove /api/... if present)
  const normalizedUrl = baseUrl.replace(/\/api\/.*$/, "").replace(/\/$/, "");

  // Build URL based on SonarCloud vs SonarQube
  if (config.publicSonar && config.sonarOrganization) {
    // SonarCloud format
    const params = new URLSearchParams({
      id: projectKey,
      organization: config.sonarOrganization,
    });

    if (fetchOptions.pullRequest) {
      params.set("pullRequest", fetchOptions.pullRequest);
    } else if (fetchOptions.branch) {
      params.set("branch", fetchOptions.branch);
    }

    return `${normalizedUrl}/project/issues?${params.toString()}`;
  } else {
    // Private SonarQube format
    const params = new URLSearchParams({
      id: projectKey,
    });

    if (fetchOptions.pullRequest) {
      params.set("pullRequest", fetchOptions.pullRequest);
    } else if (fetchOptions.branch) {
      params.set("branch", fetchOptions.branch);
    }

    return `${normalizedUrl}/dashboard?${params.toString()}`;
  }
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
      console.log(chalk.whiteBright(`🔧 Using configuration: ${JSON.stringify(config, null, 2)}`));
    }

    // Check if Sonar is private and exit gracefully if token is missing
    const isPrivateSonar = !config.publicSonar;
    if (isPrivateSonar && !process.env.SONAR_TOKEN) {
      console.warn(
        chalk.yellow(
          "⚠️  Warning: SONAR_TOKEN environment variable is required for private Sonar instances."
        )
      );
      console.warn(chalk.gray(`   Create a token at: https://sonarcloud.io/account/security`));
      console.log(); // Add spacing before exit
      return;
    }

    // Get current git branch
    const currentBranch =
      branchName || execSync("git branch --show-current", { encoding: "utf8" }).trim();
    if (verbose) {
      console.log(chalk.whiteBright(`Current branch: ${currentBranch}`));
    }

    // Initialize SonarQube extractor
    const extractor = new SonarIssueExtractor(verbose);

    let issues: SonarIssuesResponse;
    let usedSource: string;
    let fetchOptions: { branch?: string; pullRequest?: string } = {};

    if (sonarPrLink) {
      // If PR link is provided, fetch issues from that PR
      if (verbose) {
        console.log(chalk.whiteBright(`Using provided SonarQube PR link: ${sonarPrLink}`));
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

        // Fallback to main if no issues found
        if (!issues.issues || issues.issues.length === 0) {
          if (verbose) {
            console.warn(
              chalk.yellow("No issues found for current branch. Falling back to branch: main")
            );
          }
          issues = await extractor.fetchIssuesForBranch("main", config);
          fetchOptions = { branch: "main" };
          usedSource = "main";
        }
      }
    }

    // Extract duplications, coverage, security issues, and quality gate status
    if (verbose) {
      console.log(
        chalk.whiteBright(
          "📊 Fetching duplications, coverage, security hotspots, and quality gate status..."
        )
      );
      console.log(
        chalk.whiteBright(
          `   Using fetch options: ${JSON.stringify(fetchOptions)} for source: ${usedSource}`
        )
      );
    }
    const [measures, securityHotspots, qualityGateStatus] = await Promise.all([
      extractor.fetchMeasures(config, fetchOptions).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (verbose) {
          console.warn(chalk.yellow(`⚠️  Failed to fetch measures: ${errorMessage}`));
        } else {
          // In non-verbose mode, still log errors but more concisely
          console.warn(chalk.yellow(`⚠️  Failed to fetch measures for ${usedSource}`));
        }
        return {};
      }),
      extractor.fetchSecurityHotspots(config, fetchOptions).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (verbose) {
          console.warn(chalk.yellow(`⚠️  Failed to fetch security hotspots: ${errorMessage}`));
        } else {
          // In non-verbose mode, still log errors but more concisely
          console.warn(chalk.yellow(`⚠️  Failed to fetch security hotspots for ${usedSource}`));
        }
        return {};
      }),
      extractor.fetchQualityGateStatus(config, fetchOptions).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (verbose) {
          console.warn(chalk.yellow(`⚠️  Failed to fetch quality gate status: ${errorMessage}`));
        } else {
          // In non-verbose mode, still log errors but more concisely
          console.warn(chalk.yellow(`⚠️  Failed to fetch quality gate status for ${usedSource}`));
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
        console.log(chalk.whiteBright(`📁 Saved measures to: ${measuresPath}`));
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
          chalk.whiteBright(`📁 Saved ${hotspotsCount} security hotspot(s) to: ${hotspotsPath}`)
        );
      }
    }

    // Save quality gate status if available
    if (qualityGateStatus && Object.keys(qualityGateStatus).length > 0) {
      const qualityGatePath = path.join(sonarDir, "quality-gate.json");
      fs.writeFileSync(qualityGatePath, JSON.stringify(qualityGateStatus, null, 2));
      if (verbose) {
        console.log(chalk.whiteBright(`📁 Saved quality gate status to: ${qualityGatePath}`));
      }
    }

    if (verbose) {
      console.log(
        chalk.green(
          `✅ Successfully fetched ${issues.issues?.length || 0} issues (source: ${usedSource})`
        )
      );
      console.log(chalk.whiteBright(`📁 Saved to: ${issuesPath}`));
    }

    // Display summary
    if (issues.issues && issues.issues.length > 0) {
      const severityCounts: Record<string, number> = {};
      for (const issue of issues.issues) {
        const severity = issue.severity || "UNKNOWN";
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      }

      // Map and aggregate severities
      const mappedCounts: Record<string, number> = {};
      for (const [severity, count] of Object.entries(severityCounts)) {
        const mapped = mapSeverity(severity);
        mappedCounts[mapped] = (mappedCounts[mapped] || 0) + count;
      }

      // Sort by order (Blocker, High, Medium, Low, Info)
      const sortedEntries = Object.entries(mappedCounts).sort(
        ([a], [b]) => getSeverityOrder(a) - getSeverityOrder(b)
      );

      if (verbose) {
        console.log(chalk.whiteBright("\n📊 Issues by severity:"));
        for (const [severity, count] of sortedEntries) {
          const colorFn = getSeverityColor(severity);
          console.log(colorFn(`  ${severity}: ${count}`));
        }
      } else {
        // Non-verbose: Show table format with colors
        console.log(chalk.whiteBright("\n📊 Issues by severity:"));
        formatSeverityTable(severityCounts);
      }
    }

    // Extract and display metrics (coverage, duplication, security hotspots)
    const metrics = extractMetrics(measures);

    // Extract all project metrics for quality gate comparison
    const allProjectMetrics = extractAllMetrics(measures, issues, securityHotspots);

    // Display quality gate status if available with metric comparison
    if (qualityGateStatus && Object.keys(qualityGateStatus).length > 0) {
      formatQualityGateStatus(qualityGateStatus, allProjectMetrics);
    }

    if (!verbose) {
      console.log();
      if (metrics.coverage !== null && metrics.coverage !== undefined) {
        console.log(chalk.whiteBright(`Coverage: ${metrics.coverage}%`));
      }
      if (metrics.duplication !== null && metrics.duplication !== undefined) {
        console.log(chalk.whiteBright(`Duplicated lines: ${metrics.duplication}%`));
      }
    }

    // Display final message with SonarQube URL and local file path
    const sonarUrl = buildSonarProjectUrl(config, fetchOptions);
    console.log();
    console.log(
      chalk.gray(`For further information see ${sonarUrl} and saved issues here: ${issuesPath}`)
    );
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
