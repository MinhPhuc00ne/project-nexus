## Summary of Changes

<!-- Briefly describe the purpose of this Merge Request. What problem does it solve, or what capability does it introduce? -->

-
-
-

## Key Changes

-
-
-

## Verification and Testing

<!-- Step-by-step instructions for reviewers to verify these changes locally -->

1. Start required dependencies: `...`
2. Trigger the endpoint or action: `...`
3. Expected result: `...`

## Visual Assets (UI Changes)

<!-- Attach screenshots, screen recordings, or animated graphics for user interface changes -->

## Author Checklist Before Requesting Review

- [ ] Code complies with `docs/standards/CLEAN_CODE.md` and `docs/standards/WRITING_STYLE.md`.
- [ ] Ran `npm run lint` with zero errors and zero warnings.
- [ ] Ran `npm run format:check` to verify Prettier compliance.
- [ ] Strictly no `any` type annotations (`@typescript-eslint/no-explicit-any`).
- [ ] Functions and public methods declare explicit return types.
- [ ] Strictly no stray or inline comments (`// ...`); documentation adheres to TSDoc or JSDoc format (`/** ... */`).
- [ ] No leftover `console.log` statements in production logic.
- [ ] Rebased onto latest `origin/dev` with all merge conflicts resolved locally.
- [ ] Merge Request title follows Conventional Commits specification (`feat(...)`, `fix(...)`, etc.).
- [ ] Assigned author and designated at least one qualified reviewer.
