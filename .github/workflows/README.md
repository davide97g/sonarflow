# GitHub Actions Workflows

## Automated Release Workflows

This repository uses automated versioning and releases via GitHub Actions.

### Workflows

#### 1. Beta Release (`release-beta.yml`)
**Triggers:** Push to `develop` branch

**Behavior:**
- Creates beta/pre-release versions (e.g., `v0.2.4-beta.1`, `v0.2.4-beta.2`)
- Only releases if there are version-bump commits (`feat:`, `fix:`, `perf:`, `refactor:`, or `BREAKING CHANGE:`)
- Publishes the CLI package as `sonarflow` to npm with `beta` tag
- Skips release if only documentation or chore commits

**Version Format:**
- Beta releases: `v{version}-beta.{increment}`
- Example: `v0.2.4-beta.1` → `v0.2.4-beta.2`

#### 2. Production Release (`release-production.yml`)
**Triggers:** Push to `main` branch

**Behavior:**
- Creates production releases (e.g., `v0.2.4`, `v0.3.0`)
- Automatically determines version bump based on commit types:
  - `feat:` → minor bump (0.2.3 → 0.3.0)
  - `fix:` → patch bump (0.2.3 → 0.2.4)
  - `BREAKING CHANGE:` → major bump (0.2.3 → 1.0.0)
- Only releases if there are version-bump commits
- Publishes the CLI package as `sonarflow` to npm with `latest` tag
- Creates GitHub Release with CHANGELOG.md content

**Version Format:**
- Production releases: `v{version}`
- Example: `v0.2.3` → `v0.2.4` (patch) or `v0.3.0` (minor)

### Workflow Process

Both workflows follow this process:

1. **Checkout** code with full git history
2. **Setup** Bun runtime
3. **Install** dependencies
4. **Build** the project
5. **Lint** the code
6. **Check** for version-bump commits
7. **Create** release:
   - Bump version in `package.json`
   - **Update schema version** in `schemas/sonarflowrc.schema.json` (`$id` field)
   - Update `CHANGELOG.md`
   - Create git tag
8. **Push** changes and tags to repository
9. **Publish** the CLI package to npm as `sonarflow`

### Commit Message Requirements

For automated releases to work, commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

**Version-bump commits:**
- `feat:` - New features (minor bump)
- `fix:` - Bug fixes (patch bump)
- `perf:` - Performance improvements (patch bump)
- `refactor:` - Code refactoring (patch bump)
- `BREAKING CHANGE:` - Breaking changes (major bump)

**Non-version-bump commits (skipped in release):**
- `docs:` - Documentation changes
- `chore:` - Build/tooling changes
- `style:` - Code style changes
- `test:` - Test changes

### Example Workflow

```
develop branch:
  commit: "feat: add new feature"
  → GitHub Actions triggers
  → Creates v0.2.4-beta.1
  → Publishes sonarflow package to npm with 'beta' tag

main branch (merge from develop):
  → GitHub Actions triggers
  → Creates v0.2.4 (production)
  → Publishes sonarflow package to npm with 'latest' tag
  → Creates GitHub Release
```

### Skipping Releases

Releases are automatically skipped if:
- No commits since last tag
- Only non-version-bump commits (docs, chore, style, test)
- No conventional commits detected

### Installing Packages

**Beta version:**
```bash
npm install sonarflow@beta
```

**Production version:**
```bash
npm install sonarflow@latest
# or without tag (defaults to latest)
npm install sonarflow
```

### Troubleshooting

**Workflow not triggering:**
- Ensure commits follow conventional format
- Check that changes are not in ignored paths
- Verify branch name matches (`develop` or `main`)

**Version not bumping:**
- Check commit messages match conventional format
- Verify there are version-bump commits since last tag
- Review workflow logs for specific errors

**Publishing fails:**
- Ensure `NPM_TOKEN` secret is set in GitHub Actions secrets
- Verify the npm token has publish permissions for the `sonarflow` package
- Check that package name matches in `apps/cli/package.json` (should be `sonarflow`)
- Verify the CLI package has been built before publishing

