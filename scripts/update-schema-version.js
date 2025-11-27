#!/usr/bin/env node

/**
 * Updates the schema file's $id field and CLI package.json version with the current package version.
 * This script is called during the release process via standard-version hooks (postbump).
 * Stages the updated files so standard-version includes them in its release commit.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

try {
  // Read package.json to get current version
  const packageJsonPath = join(rootDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const version = packageJson.version;

  if (!version) {
    console.error("❌ No version found in package.json");
    process.exit(1);
  }

  // Read and update schema file
  const schemaPath = join(rootDir, "schemas", "sonarflowrc.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

  // Update $id field with new version
  const oldId = schema.$id;
  schema.$id = `https://raw.githubusercontent.com/davide97g/sonarflow/v${version}/schemas/sonarflowrc.schema.json`;

  // Write updated schema
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + "\n", "utf8");

  console.log(`✅ Updated schema $id: ${oldId} → ${schema.$id}`);

  // Read and update CLI package.json version
  const cliPackageJsonPath = join(rootDir, "apps", "cli", "package.json");
  const cliPackageJson = JSON.parse(readFileSync(cliPackageJsonPath, "utf8"));
  const oldCliVersion = cliPackageJson.version;
  cliPackageJson.version = version;

  // Write updated CLI package.json
  writeFileSync(cliPackageJsonPath, JSON.stringify(cliPackageJson, null, 2) + "\n", "utf8");

  console.log(`✅ Updated CLI package.json version: ${oldCliVersion} → ${version}`);

  // Stage the schema file and CLI package.json
  // Standard-version will commit these along with the root package.json and CHANGELOG
  try {
    const schemaRelativePath = "schemas/sonarflowrc.schema.json";
    const cliPackageRelativePath = "apps/cli/package.json";

    // Stage both files so standard-version includes them in its commit
    try {
      execSync(`git add ${schemaRelativePath} ${cliPackageRelativePath}`, {
        cwd: rootDir,
        stdio: "pipe",
      });
      console.log(`✅ Staged schema and CLI package.json for commit`);
    } catch (addError) {
      console.error("⚠️  Warning: Failed to stage files:", addError instanceof Error ? addError.message : String(addError));
      // Don't fail the entire process if staging fails
    }
  } catch (gitError) {
    // For any other git errors, log but don't fail
    console.error(
      "⚠️  Warning: Git operation failed:",
      gitError instanceof Error ? gitError.message : String(gitError)
    );
  }
} catch (error) {
  console.error(
    "❌ Error updating schema and CLI package versions:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
