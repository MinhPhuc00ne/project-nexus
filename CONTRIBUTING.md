# Contributing to Project Nexus

This is a guide for contributing to **Project Nexus**! This document outlines our branching strategy, commit guidelines, code standards, and the Merge Request lifecycle on GitLab.

---

## 1. Git Branching Strategy

We use a standard branching strategy to keep our codebase clean, stable, and production-ready.

```text
feature/<module>-<task>  ──(MR)──>  dev  ──(MR)──>  main (Production)
bugfix/<module>-<task>   ────────────┘
```

- `main`: Protected branch containing production-ready code. Direct commits and direct merges without peer review are prohibited.
- `dev`: The integration branch for current sprint development. All feature branches branch off from `dev` and merge back into `dev`.
- `feature/<module>-<task>`: Dedicated branches for active development (e.g., `feature/auction-live-board`, `feature/identity-oauth`).
- `bugfix/<module>-<task>`: Dedicated branches for resolving defects during development.
- `hotfix/<issue>`: Urgent production fixes branching directly off `main` and merged back into both `main` and `dev`.

---

## 2. Commit Message Standards

All commit messages must strictly comply with the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/) specification.\
Commits must be atomic—each commit encapsulates a single logical change.

### Format

```text
<type>(<scope>): <short description>
```

### Allowed Types (enforced via `commitlint.config.js`):

- `feat`: A new user-facing feature or API capability.
- `fix`: A bug fix.
- `docs`: Documentation updates only.
- `style`: Formatting, missing semi-colons, white-space fixes (no production code change).
- `refactor`: Code restructuring without bug fixes or new features.
- `test`: Adding or refactoring unit or integration tests.
- `chore`: Maintenance, repository configuration, dependency bumps.
- `perf`: Performance optimizations.
- `ci`: CI/CD pipeline modifications.
- `build`: Build system or dependency management changes.
- `revert`: Reverting a previous commit.

---

## 3. Coding Standards

All contributors must adhere to our formal engineering specifications:

- Read and follow [CLEAN_CODE.md](./docs/standards/CLEAN_CODE.md) for naming conventions, formatting, ESLint rules, strict TypeScript (`no-explicit-any`), and DTO validation.
- Read [DESIGN_PRINCIPLES.md](./docs/standards/DESIGN_PRINCIPLES.md) for SOLID, KISS, YAGNI, DRY, and Twelve-Factor App guidelines.
- Read [DESIGN_PATTERNS.md](./docs/architecture/DESIGN_PATTERNS.md) for Repository, Strategy (PayOS/Stripe/GHN), In-Process Observer/Events, PostgreSQL ACID transactions, and Three.js lifecycle management.
- Read [ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md) for modular boundaries, in-process event communication (`@nestjs/event-emitter`), and presentation layers.

Quick Quality Checklist Before Committing

- [ ] No `any` type used (`@typescript-eslint/no-explicit-any`).
- [ ] Public methods have explicit return types.
- [ ] Code formatted with Prettier (`npm run format:check`).
- [ ] Code passes all linter checks (`npm run lint`).
- [ ] No `console.log` statements in production logic.
- [ ] Inputs validated using DTOs with `class-validator`.
- [ ] Commit message conforms to Conventional Commits (enforced via `commitlint`).

---

## 4. Merge Request Process

1. Local Verification: Ensure your code passes all linting, formatting, and test suites locally (`npm run lint` and `npm run format:check`).
2. Rebase: Always sync and rebase the latest changes from `origin/dev` before pushing:

   ```bash
   git checkout dev && git pull origin dev
   git checkout feature/your-feature
   git rebase dev
   ```

3. Push to GitLab:

   ```bash
   git push -u origin feature/your-feature
   ```

4. Create Merge Request (MR):
   - Target Branch: Must always target `dev` (never `main`).
   - Title: Must follow Conventional Commits format matching the primary change (e.g., `feat(auction): add live bidding broadcast`).
   - Description: Fill out the official MR template (automatically loaded from `.gitlab/merge_request_templates/default.md`).
   - Options: Check `Delete source branch when merge request is accepted`.
   - Assignee: Assign yourself.
   - Reviewer: Assign your Tech Lead, Mentor, or at least 1 peer reviewer.
5. Code Review: Address all reviewer comments. Make required fixes directly on your local branch, commit, and push. Mark discussions as resolved once completed.
6. Merge: Once approved (minimum 1 approval required) and CI passes, the MR will be merged into `dev`.
