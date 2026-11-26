/**
 * What runs over staged files before a commit.
 *
 * This was a block in package.json listing the commands directly, which hands
 * every staged path to each command on one command line. Windows caps a command
 * line at about 32k characters, so a wide change — a refactor touching a
 * hundred files — failed the hook with "The command line is too long" rather
 * than with anything about the code, and the only ways forward were to bypass
 * the hook or to split the commit to suit the tool.
 *
 * Past a threshold the commands run over the repository instead of over a list
 * of paths. That is slower, and it checks files the commit did not touch, which
 * for a change that size is the cheaper trade: the alternative is a hook that
 * cannot run at all.
 */

/** Above this many staged files, pass a directory instead of each path. */
const MANY_FILES = 40;

/** @param {string[]} files - The staged paths matching the pattern. */
const lintAndFormat = (files) =>
  files.length > MANY_FILES
    ? ['eslint --fix .', 'prettier --write .']
    : [`eslint --fix ${files.join(' ')}`, `prettier --write ${files.join(' ')}`];

/** @param {string[]} files - The staged paths matching the pattern. */
const format = (files) =>
  files.length > MANY_FILES ? ['prettier --write .'] : [`prettier --write ${files.join(' ')}`];

export default {
  '*.{js,mjs,cjs,ts,tsx}': lintAndFormat,
  '*.{json,md,yml,yaml,css}': format,
};
