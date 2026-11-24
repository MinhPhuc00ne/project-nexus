import { test } from 'vitest';
import { load } from './helpers/load-module.mjs';
import assert from 'node:assert/strict';

const phoneLabel = 'Điện tử / Điện thoại';

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = find(child, predicate);
    if (result) return result;
  }
}
async function setup(initialValue = '', disabled = false) {
  const slots = [];
  const effects = [];
  const changes = [];
  let cursor;
  let value = initialValue;
  let validity;
  const control = {
    focus() {},
    select() {},
    setCustomValidity(message) {
      validity = message;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      useId: () => 'picker',
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [
          slots[index],
          (next) => {
            slots[index] = typeof next === 'function' ? next(slots[index]) : next;
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
        if (!slots[index] || dependencies.some((dep, i) => !Object.is(dep, slots[index][i]))) {
          slots[index] = dependencies;
          effects.push(callback);
        }
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': {},
  };
  const component = await load('components/seller/SellerCategoryPicker.tsx', dependencies);
  const options = [
    { id: 'watch', label: 'Thời trang / Đồng hồ' },
    { id: 'phone', label: phoneLabel },
    { id: 'book', label: 'Sách / Truyện' },
  ];
  return {
    changes,
    get validity() {
      return validity;
    },
    render() {
      cursor = 0;
      const tree = component.default({
        options,
        value,
        disabled,
        onChange: (id) => {
          changes.push(id);
          value = id;
        },
      });
      const input = find(tree, (node) => node.type === 'input');
      input.props.ref.current = control;
      effects.splice(0).forEach((callback) => callback());
      return { tree, input };
    },
  };
}
function focus(input) {
  input.props.onFocus({ currentTarget: { select() {} } });
}
function key(input, value) {
  let prevented = false;
  input.props.onKeyDown({
    key: value,
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {},
  });
  return prevented;
}

test('typing filters by full category path without accents and never commits the query', async () => {
  const app = await setup('phone');
  let { input } = app.render();
  assert.equal(input.props.value, phoneLabel);
  focus(input);
  ({ input } = app.render());
  input.props.onChange({ target: { value: 'thoi trang dong ho' } });
  const view = app.render();
  assert.ok(
    find(
      view.tree,
      (node) =>
        node.props?.role === 'option' &&
        node.props.children[0].props.children === 'Thời trang / Đồng hồ',
    ),
  );
  assert.equal(
    find(
      view.tree,
      (node) =>
        node.props?.role === 'option' && node.props.children[0].props.children === phoneLabel,
    ),
    undefined,
  );
  assert.equal(app.changes.length, 0);
  key(view.input, 'Escape');
  assert.equal(app.render().input.props.value, phoneLabel);
});

test('selection commits the category ID and closes the dropdown', async () => {
  const app = await setup();
  let { input } = app.render();
  focus(input);
  ({ input } = app.render());
  input.props.onChange({ target: { value: 'dong ho' } });
  ({ input } = app.render());
  assert.equal(key(input, 'Enter'), true);
  const view = app.render();
  assert.equal(app.changes[0], 'watch');
  assert.equal(view.input.props.value, 'Thời trang / Đồng hồ');
  assert.equal(view.input.props['aria-expanded'], false);
  assert.equal(app.validity, '');
});

test('unmatched text cannot become a category and remains invalid until a real option is chosen', async () => {
  const app = await setup();
  let { input } = app.render();
  focus(input);
  ({ input } = app.render());
  input.props.onChange({ target: { value: 'nonexistent' } });
  const view = app.render();
  assert.ok(find(view.tree, (node) => node.props?.role === 'status'));
  key(view.input, 'Enter');
  assert.equal(app.changes.length, 0);
  assert.ok(app.validity);
  key(view.input, 'Tab');
  assert.equal(app.render().input.props.value, '');
});

test('keyboard navigation selects the last option with ArrowUp and disabled controls stay closed', async () => {
  const app = await setup();
  let { input } = app.render();
  focus(input);
  ({ input } = app.render());
  key(input, 'ArrowUp');
  ({ input } = app.render());
  key(input, 'Enter');
  assert.equal(app.changes[0], 'book');
  const disabled = await setup('phone', true);
  focus(disabled.render().input);
  assert.equal(disabled.render().input.props['aria-expanded'], false);
});
