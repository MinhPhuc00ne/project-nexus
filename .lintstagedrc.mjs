/**
 * What runs over staged files before a commit.
 *
 * Windows caps command lines at ~32k characters, so staging a large refactor
 * used to trigger a slow full-repository fallback. Chunking staged paths into
 * batches of 40 with `--cache` keeps every commit fast and scoped to staged
 * files only.
 */

const CHUNK_SIZE = 40;

/** @param {string[]} items */
const chunk = (items) => {
  const batches = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    batches.push(items.slice(i, i + CHUNK_SIZE));
  }
  return batches;
};

/** @param {string[]} files - The staged paths matching the pattern. */
const lintAndFormat = (files) =>
  chunk(files).flatMap((batch) => {
    const quoted = batch.map((file) => `"${file}"`).join(' ');
    return [`eslint --cache --fix ${quoted}`, `prettier --cache --write ${quoted}`];
  });

/** @param {string[]} files - The staged paths matching the pattern. */
const format = (files) =>
  chunk(files).map((batch) => {
    const quoted = batch.map((file) => `"${file}"`).join(' ');
    return `prettier --cache --write ${quoted}`;
  });

export default {
  '*.{js,mjs,cjs,ts,tsx}': lintAndFormat,
  '*.{json,md,yml,yaml,css}': format,
};
