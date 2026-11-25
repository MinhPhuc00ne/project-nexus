# Contributing to Project Nexus

This document defines the branching model, commit conventions, pull request checks, and GitHub CLI workflow for contributors.

## 1. Branching Strategy

- `main` holds release-ready production code and accepts changes only through pull requests from `dev` or `hotfix/*`.
- `dev` serves as the active integration branch for feature, bugfix, refactor, and documentation pull requests.
- `feat/*`, `fix/*`, `refactor/*`, and `docs/*` are short-lived branches created from `dev`.

Create a working branch from `dev`:

```bash
git checkout dev
git pull origin dev
git checkout -b feat/your-change
```

## 2. Commit Message Convention

Husky and `commitlint` enforce Conventional Commits on every commit:

```text
<type>(<scope>): <subject>
```

Allowed types include `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, and `build`. Keep subjects lowercase, imperative, and concise.

Examples:

```text
feat(auction): enforce server-side bid increment validation
fix(order): prevent duplicate escrow release on concurrent callbacks
docs(api): refresh OpenAPI specification for wallet endpoints
```

## 3. Local Verification Before Opening a Pull Request

Run all checks locally before pushing your branch:

```bash
npm run format:check
npm run lint
npm run i18n:check
npm run docs:check
npm run build
npm test
```

## 4. Pull Request Workflow with GitHub CLI

1. Push your branch to GitHub:
   ```bash
   git push -u origin feat/your-change
   ```
2. Create a pull request targeting `dev`:
   ```bash
   gh pr create --base dev --title "feat(scope): short summary" --body "Summary of changes and verification steps."
   ```
3. Monitor GitHub Actions CI status:
   ```bash
   gh pr checks
   ```
4. Merge once all required checks pass and review comments are resolved.

## 5. Additional References

- [Code Standards and Sonar Quality Gate](docs/docs/quality/code-standards.md)
- [Testing and CI Pipeline](docs/docs/quality/testing-ci.md)
- [Operations Runbook](docs/docs/operations/runbook.md)
