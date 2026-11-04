# Contributing Guide

This document establishes the collaboration workflows, Git branching strategy, Conventional Commits specification, Merge Request lifecycle, and GitLab CLI (`glab`) operations for engineering contributors on Project Nexus.

## 1. Git Branching Strategy

The repository follows a streamlined GitFlow model centered on the protected `main` branch and the continuous integration `dev` branch.

### Core Branches

- `main`: Production release branch. Direct pushes to this branch are prohibited.
- `dev`: Central integration branch for ongoing development. All feature branches branch from `dev` and merge back into `dev` through Merge Requests.

### Working Branch Naming Conventions

- Feature branches: `feature/<module>-<feature-name>` (for example, `feature/auction-live-bid`, `feature/commerce-cod`).
- Bugfix branches during development: `bugfix/<module>-<bug-name>` (for example, `bugfix/chat-typing-status`).
- Hotfix branches for production: `hotfix/<incident-name>` (branches from `main` and must be merged into both `main` and `dev`).
- Refactoring branches: `refactor/<scope>` (for example, `refactor/modular-monolith-phase3`).

## 2. Conventional Commits Specification

All commit messages must adhere to Conventional Commits v1.0.0 and are verified automatically by the `commit-msg` Git hook.

### Syntax

```text
<type>(<scope>): <concise description in Standard US English>
```

### Commit Rules

- Commit subjects must not exceed 100 characters.
- Spell out the coordinating conjunction "and" instead of using the ampersand symbol "&".
- Use lowercase characters for commit type and scope identifiers.
- Inline explanations and stray comments are forbidden; documentation belongs in standard docstrings.

### Permitted Commit Types

- `feat`: Introduces a new business capability or feature.
- `fix`: Resolves a software bug or defect.
- `docs`: Documentation additions or modifications.
- `style`: Code formatting, whitespace, or punctuation changes without logic modifications.
- `refactor`: Code reorganization that neither fixes bugs nor alters functional behavior.
- `test`: Adds or modifies automated test suites.
- `chore`: Toolchain, repository maintenance, or dependency package updates.
- `perf`: Code optimizations improving computational or memory performance.
- `ci`: Modifications to continuous integration and delivery pipelines.
- `build`: Monorepo build system or external dependency changes.

## 3. Merge Request Lifecycle

Before submitting a Merge Request targeting the `dev` branch, run all local verification gates:

```bash
# Verify formatting against Prettier
npm run format:check

# Run static analysis and linting with ESLint
npm run lint

# Build the complete monorepo
npx turbo run build

# Execute automated unit test suites
npx turbo run test
```

After local verification passes successfully:

1. Rebase your working branch onto the latest `origin/dev`.
2. Push the branch to the remote GitLab repository.
3. Open a Merge Request targeting the `dev` branch using the template at `.gitlab/merge_request_templates/default.md`.
4. Ensure the GitLab CI pipeline passes all validate, build, and test stages.
5. Secure approval from designated code reviewers prior to merging.

## 4. GitLab CLI Automation (glab)

Contributors can use the official `glab` command-line utility to automate branch management, Merge Request creation, and pipeline inspections without navigating the web portal.

### Authenticate with the Internal GitLab Instance

```bash
glab auth login --hostname github.com
```

### Create a Merge Request from the Active Branch

```bash
glab mr create --target-branch dev --title "feat(auction): implement real-time bidding terminal" --description "Detailed summary of architectural and operational changes"
```

### Inspect Pipeline Status and Merge Request Details

```bash
glab mr view
glab ci status
```

### Merge an Approved Merge Request

```bash
glab mr merge <mr-id> --rebase --remove-source-branch
```

## 5. Architectural Standards References

Detailed requirements covering cyclomatic complexity limits, class length boundaries, docstring formatting, and system naming conventions are documented in:

- [Clean Code Standard](docs/standards/CLEAN_CODE.md)
- [Technical Writing Style Guide](docs/standards/WRITING_STYLE.md)
- [Naming Conventions](docs/standards/NAMING_CONVENTIONS.md)
