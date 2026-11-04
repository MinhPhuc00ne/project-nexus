# Technical Writing Style Guide

This document establishes the mandatory standards for authoring technical documentation, engineering guides, commit messages, and source code annotations across Project Nexus.

## 1. Core Principles of Technical Writing

### Objective and Direct Technical Tone

- Present information factually, objectively, and verifiably.
- Avoid promotional language, marketing slogans, and informal personal pronouns.
- Use the active voice, concise phrasing, and focus strictly on the technical responsibilities of each component.

### Formal Conjunctions and Terminology

- Always write the word "and" explicitly instead of using the ampersand character ("&").
- Avoid arbitrary abbreviations or technical shorthand unless formally defined within the document context.

### Typography and Formatting Rules

- Prohibit mid-sentence bolding for emotional emphasis. Emphasis must arise naturally from sentence structure and information hierarchy.
- Prohibit robotic lists that prefix bullet items with a bold term followed by a colon. Instead, express thoughts using complete, fluent sentences or structured comparative tables.

## 2. Code Comments and Annotation Rules

### Absolute Prohibition of Meaningless Inline Comments

- Strictly forbid single-line inline comments (`// ...`) that narrate obvious syntax or reiterate line-by-line mechanics, such as step numbering, database invocation notes, or identifier checks.
- Code must be self-documenting through expressive variable, function, interface, and class names adhering to clean code standards.

### Standardization of Formal Documentation Blocks

- For TypeScript and JavaScript codebases, employ formal TSDoc or JSDoc documentation blocks (`/** ... */`) for classes, interfaces, types, service methods, controller endpoints, helper functions, and WebSocket event handlers.
- Documentation blocks must detail component responsibilities, explain parameter semantics using `@param`, define return values with `@returns`, and document potential exceptions with `@throws`.
- For Prisma schema definitions, use triple-slash documentation comments (`/// ...`) preceding models and significant fields to support automated schema documentation generation.

## 3. Documentation Scope and Boundaries

### Root README.md

The root README file serves strictly as the highest-level project overview and entry point:

- Summarizes the purpose and application scope of Project Nexus.
- Outlines the complete technology stack inventory across the monorepo.
- Illustrates the symmetric top-level repository structure.
- Provides standard quickstart instructions for local development workflows.
- Hosts the complete documentation index referencing every technical specification markdown document in the repository.
- Avoids duplicating deep architectural models, data schemas, or detailed business workflows found in the `docs/` hierarchy.

### Root CONTRIBUTING.md

The contributing guidelines focus exclusively on developer contribution lifecycles:

- Defines branch naming conventions and lifecycle workflows.
- Enforces commit message standards using Conventional Commits.
- Outlines Merge Request creation, review, and verification protocols.
- Documents optional workstation workflows using the `glab` command-line utility.
- Excludes architectural overviews and setup instructions covered in `README.md` and `docs/`.

### The docs/ Hierarchy

The `docs/` directory stores all in-depth engineering specifications:

- `docs/architecture/`: Modular Monolith architectural models, domain boundaries, business rules, and design patterns.
- `docs/standards/`: Clean code criteria, design principles, naming conventions, and technical writing style guidelines.
- `docs/backend/`: Server-side architecture, domain modules, database orchestration, and NestJS service guides.
- `docs/frontend/`: Client-side architecture, state orchestration, UI design systems, and component contracts.
- `docs/api/`: REST API interface endpoints, payload schemas, and WebSocket gateway events.
- `docs/srs/`: Software requirements specification, role-based access matrices, and escrow commerce workflows.
