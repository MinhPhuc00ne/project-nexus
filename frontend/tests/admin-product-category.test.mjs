import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    AbortController,
    Error,
    require: (name) => {
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const jsx = (type, props) => ({ type, props });
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = find(child, predicate);
    if (result) return result;
  }
}
const button = (tree, text) =>
  find(
    tree,
    (node) =>
      node.type === 'button' &&
      [node.props.children]
        .flat()
        .some((child) => typeof child === 'string' && child.trim() === text),
  );

function setup(
  overrides = {},
  product = { id: 'product-1', title: 'Watch', category: { id: 'root', name: 'Root' } },
) {
  const slots = [];
  let cursor;
  const root = { id: 'root', name: 'Root', parentId: null, level: 1 };
  const tree = load('utils/category-tree.ts');
  const calls = { created: [], saved: [], changed: 0, success: [] };
  const component = load('components/adminDashboard/Products/ProductCategoryDialog.tsx', {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [
          slots[index],
          (value) => {
            slots[index] = typeof value === 'function' ? value(slots[index]) : value;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useEffect(callback, dependencies) {
        const index = cursor++;
        if (!slots[index] || dependencies.some((value, i) => !Object.is(value, slots[index][i]))) {
          slots[index] = dependencies;
          callback();
        }
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': {},
    '../../../services/admin': {
      getCategoryTree: async () => [root],
      createCategory: async (dto) => {
        calls.created.push(dto);
        return {
          id: 'new',
          name: dto.name,
          parentId: dto.parentId || null,
          level: dto.parentId ? 2 : 1,
        };
      },
      updateAdminProductCategory: async (...args) => {
        calls.saved.push(args);
        return { success: true, message: 'Updated' };
      },
      ...overrides,
    },
    '../../../services/auth': { getStoredToken: () => 'session' },
    '../../../contexts/AuthContext': { useAuth: () => ({ token: 'session' }) },
    '../../../utils/category-tree': tree,
    '../../Popup': { default: 'popup' },
    '../shared/AdminUI': { Button: 'button' },
  }).default;
  return {
    calls,
    render() {
      cursor = 0;
      return component({
        product,
        onClose() {},
        onSaved: (message) => calls.success.push(message),
        onCategoriesChanged: () => {
          calls.changed++;
        },
      });
    },
  };
}

test('category assignment uses the existing backend endpoint and payload', async () => {
  let request;
  const service = load('services/adminCommerce.ts', {
    './adminRequest': {
      adminRequest: async (config) => {
        request = config;
        return { success: true };
      },
    },
  });
  const dto = { categoryId: 'cat-2', reason: 'Reclassified' };
  await service.updateAdminProductCategory('product/1', dto);
  assert.equal(request.url, '/admin/products/product%2F1/category');
  assert.equal(request.method, 'PATCH');
  assert.equal(request.data, dto);
});

test('an uncategorized product can select and save a backend category', async () => {
  const app = setup({}, { id: 'product-1', title: 'Watch', category: null });
  app.render();
  await tick();
  let view = app.render();
  assert.equal(view.props.title, 'Gắn danh mục sản phẩm');
  find(view, (node) => node.type === 'select').props.onChange({ target: { value: 'root' } });
  view = app.render();
  find(view, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(app.calls.saved.length, 1);
  assert.equal(app.calls.saved[0][0], 'product-1');
  assert.equal(app.calls.saved[0][1].categoryId, 'root');
  assert.equal(app.calls.success[0], 'Updated');
});

test('creating selects the new child category and assignment failures can retry without recreating', async () => {
  let attempts = 0;
  const app = setup({
    updateAdminProductCategory: async () => {
      attempts++;
      if (attempts === 1) throw Error('Backend rejected assignment');
      return { success: true, message: 'Updated' };
    },
  });
  app.render();
  await tick();
  let view = app.render();
  button(view, 'Thêm danh mục mới').props.onClick();
  view = app.render();
  find(view, (node) => node.type === 'input').props.onChange({ target: { value: 'New child' } });
  const section = find(view, (node) => node.type === 'section');
  find(section, (node) => node.type === 'select').props.onChange({ target: { value: 'root' } });
  view = app.render();
  button(view, 'Tạo và chọn').props.onClick();
  await tick();
  view = app.render();
  assert.equal(app.calls.created.length, 1);
  assert.equal(app.calls.created[0].parentId, 'root');
  assert.equal(app.calls.changed, 1);
  assert.equal(attempts, 0);
  assert.equal(find(view, (node) => node.type === 'select').props.value, 'new');
  assert.equal(
    find(view, (node) => node.type === 'option' && node.props.value === 'new').props.children,
    'Root / New child',
  );
  find(view, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  view = app.render();
  assert.equal(
    find(view, (node) => node.props?.role === 'alert').props.children,
    'Backend rejected assignment',
  );
  assert.equal(app.calls.success.length, 0);
  find(view, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(attempts, 2);
  assert.equal(app.calls.created.length, 1);
  assert.equal(app.calls.success[0], 'Updated');
});
