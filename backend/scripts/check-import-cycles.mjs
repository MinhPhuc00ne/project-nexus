#!/usr/bin/env node
/**
 * Fails the build when the backend's import graph contains a cycle.
 *
 * Two graphs are checked. The file graph catches a direct `a imports b imports
 * a`, which TypeScript tolerates and NestJS papers over with `forwardRef`. The
 * module graph is the one that matters architecturally: when two domain folders
 * import each other, neither can be understood, tested or extracted on its own,
 * and that is what the module split is undoing.
 *
 * Usage: node scripts/check-import-cycles.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '../src');
const modulesRoot = path.join(srcRoot, 'modules');

/** Collects every TypeScript source file under a directory. */
function collectFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts') && !entry.endsWith('.spec.ts')) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Reads the relative import specifiers out of one file.
 *
 * Only relative imports matter: a package import cannot create a cycle inside
 * this source tree. Type-only imports are included deliberately, because a
 * folder that needs another folder's types is still coupled to it.
 */
function readRelativeImports(file) {
  const source = readFileSync(file, 'utf8');
  const specifiers = [];
  const patterns = [
    /\bfrom\s+['"](\.[^'"]*)['"]/g,
    /\bimport\s+['"](\.[^'"]*)['"]/g,
    /\brequire\(\s*['"](\.[^'"]*)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) specifiers.push(match[1]);
  }
  return specifiers;
}

/** Resolves an import specifier to a file in the graph, or null. */
function resolveImport(fromFile, specifier, known) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base + '.ts',
    path.join(base, 'index.ts'),
    base, // already an exact path
  ];
  for (const candidate of candidates) {
    if (known.has(candidate)) return candidate;
  }
  return null;
}

/** Which domain module a file belongs to, or null for shared code. */
function moduleOf(file) {
  if (!file.startsWith(modulesRoot + path.sep)) return null;
  return file.slice(modulesRoot.length + 1).split(path.sep)[0];
}

/**
 * Finds every strongly connected component with more than one node, plus any
 * node that imports itself (Tarjan's algorithm, iterative so a deep graph
 * cannot overflow the stack).
 */
function findCycles(graph) {
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  for (const root of graph.keys()) {
    if (index.has(root)) continue;
    const work = [{ node: root, edge: 0 }];

    while (work.length > 0) {
      const frame = work[work.length - 1];
      const { node } = frame;

      if (frame.edge === 0) {
        index.set(node, counter);
        low.set(node, counter);
        counter += 1;
        stack.push(node);
        onStack.add(node);
      }

      const edges = [...(graph.get(node) ?? [])];
      if (frame.edge < edges.length) {
        const next = edges[frame.edge];
        frame.edge += 1;
        if (!index.has(next)) {
          work.push({ node: next, edge: 0 });
        } else if (onStack.has(next)) {
          low.set(node, Math.min(low.get(node), index.get(next)));
        }
        continue;
      }

      if (low.get(node) === index.get(node)) {
        const component = [];
        let member;
        do {
          member = stack.pop();
          onStack.delete(member);
          component.push(member);
        } while (member !== node);
        const selfReferential = component.length === 1 && (graph.get(node) ?? new Set()).has(node);
        if (component.length > 1 || selfReferential) components.push(component);
      }

      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1].node;
        low.set(parent, Math.min(low.get(parent), low.get(node)));
      }
    }
  }

  return components;
}

function main() {
  const asJson = process.argv.includes('--json');
  const files = collectFiles(srcRoot);
  const known = new Set(files);

  const fileGraph = new Map(files.map((file) => [file, new Set()]));
  const moduleGraph = new Map();
  const moduleEdgeExamples = new Map();

  for (const file of files) {
    const fromModule = moduleOf(file);
    if (fromModule && !moduleGraph.has(fromModule)) moduleGraph.set(fromModule, new Set());

    for (const specifier of readRelativeImports(file)) {
      const target = resolveImport(file, specifier, known);
      if (!target || target === file) continue;
      fileGraph.get(file).add(target);

      const toModule = moduleOf(target);
      if (!fromModule || !toModule || fromModule === toModule) continue;
      if (!moduleGraph.has(toModule)) moduleGraph.set(toModule, new Set());
      moduleGraph.get(fromModule).add(toModule);
      const key = `${fromModule} -> ${toModule}`;
      if (!moduleEdgeExamples.has(key)) {
        moduleEdgeExamples.set(
          key,
          `${path.relative(srcRoot, file)} -> ${path.relative(srcRoot, target)}`,
        );
      }
    }
  }

  const fileCycles = findCycles(fileGraph);
  const moduleCycles = findCycles(moduleGraph);

  const forwardRefs = files.filter((file) => /\bforwardRef\s*\(/.test(readFileSync(file, 'utf8')));

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          files: files.length,
          fileCycles: fileCycles.map((c) => c.map((f) => path.relative(srcRoot, f))),
          moduleCycles,
          forwardRefs: forwardRefs.map((f) => path.relative(srcRoot, f)),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Scanned ${files.length} source files in ${moduleGraph.size} modules.`);

    if (moduleCycles.length > 0) {
      console.error(`\n${moduleCycles.length} module cycle(s):`);
      for (const component of moduleCycles) {
        console.error(`  - ${component.sort().join(' <-> ')}`);
        for (const from of component) {
          for (const to of moduleGraph.get(from) ?? []) {
            if (!component.includes(to)) continue;
            console.error(
              `      ${from} -> ${to}   e.g. ${moduleEdgeExamples.get(`${from} -> ${to}`)}`,
            );
          }
        }
      }
    }

    if (fileCycles.length > 0) {
      console.error(`\n${fileCycles.length} file cycle(s):`);
      for (const component of fileCycles) {
        console.error(`  - ${component.map((f) => path.relative(srcRoot, f)).join(' <-> ')}`);
      }
    }

    if (forwardRefs.length > 0) {
      console.error(`\n${forwardRefs.length} file(s) using forwardRef:`);
      for (const file of forwardRefs) console.error(`  - ${path.relative(srcRoot, file)}`);
    }
  }

  const failures = moduleCycles.length + fileCycles.length + forwardRefs.length;
  if (failures > 0) {
    console.error(
      `\nImport graph check FAILED: ${moduleCycles.length} module cycle(s), ` +
        `${fileCycles.length} file cycle(s), ${forwardRefs.length} forwardRef use(s).`,
    );
    process.exit(1);
  }

  console.log('Import graph is acyclic: no module cycles, no file cycles, no forwardRef.');
}

main();
