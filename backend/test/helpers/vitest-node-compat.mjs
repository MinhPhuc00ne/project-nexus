import { mock } from 'node:test';
import { test as vitestTest } from 'vitest';

function createNodeTestContext() {
  const afterHooks = [];
  const restores = [];

  const ctx = {
    mock: {
      method(target, propertyName, implementation) {
        const spied = mock.method(target, propertyName, implementation);
        restores.push(() => spied.mock.restore());
        return spied;
      },
      fn(...args) {
        return mock.fn(...args);
      },
    },
    after(fn) {
      afterHooks.push(fn);
    },
    async test(_name, fnOrOptions, maybeFn) {
      const fn = typeof fnOrOptions === 'function' ? fnOrOptions : maybeFn;
      if (typeof fn === 'function') {
        await fn(ctx);
      }
    },
  };

  async function cleanup() {
    while (restores.length > 0) {
      const restore = restores.pop();
      restore();
    }
    while (afterHooks.length > 0) {
      const hook = afterHooks.pop();
      await hook();
    }
  }

  return { ctx, cleanup };
}

export function test(name, optionsOrFn, maybeFn) {
  const options = typeof optionsOrFn === 'object' && optionsOrFn !== null ? optionsOrFn : {};
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn;
  const register = options.skip ? vitestTest.skip : vitestTest;

  return register(name, async () => {
    const { ctx, cleanup } = createNodeTestContext();
    try {
      await fn(ctx);
    } finally {
      await cleanup();
    }
  });
}

export { mock };
export default test;
