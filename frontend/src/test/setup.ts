import '@testing-library/jest-dom/vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import '../i18n';

/**
 * Registers the jest-dom matchers on the `expect` the tests actually use.
 *
 * The `/vitest` import above is the documented way and is what declares the
 * matchers to TypeScript, but it extends the `expect` imported by that module. Vite hands workers their
 * modules through its own graph, and intermittently that was a different
 * instance from the global `expect` these tests call with `globals: true`: the
 * matchers landed somewhere nothing could see them, and every assertion using
 * one failed with "Invalid Chai property: toHaveTextContent" — seventeen files
 * at a time, green again on the next run, which made it look like flakiness in
 * the tests rather than in how they were wired.
 *
 * Extending both the imported `expect` and the global one costs nothing and
 * leaves no instance out.
 */
const globalExpect = (globalThis as { expect?: typeof expect }).expect;
expect.extend(jestDomMatchers);
if (globalExpect && globalExpect !== expect) globalExpect.extend(jestDomMatchers);

afterEach(() => {
  cleanup();
});
