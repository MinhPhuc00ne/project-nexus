import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const source = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
  const module = { exports: {} };
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    URLSearchParams,
    require: (name) => {
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}
const base = 'components/adminDashboard/Auctions/';
const policy = load(`${base}auctionManagementAvailability.ts`);

test('edit and delete eligibility matches backend status and bid rules', () => {
  for (const status of [
    'DRAFT',
    'SCHEDULED',
    'ACTIVE',
    'EXTENDED',
    'ENDED',
    'SETTLED',
    'CANCELLED',
    'FAILED',
  ]) {
    const row = { status, totalBidsCount: 0 };
    assert.equal(!policy.auctionEditReason(row), ['DRAFT', 'SCHEDULED'].includes(status));
    assert.equal(!policy.auctionDeleteReason(row), !['ACTIVE', 'EXTENDED'].includes(status));
  }
  for (const row of [
    { totalBidsCount: 1 },
    { totalBidsCount: 0, _count: { bids: 1 } },
    { totalBidsCount: 0, _count: { bids: 0, awards: 1 } },
  ])
    assert.ok(policy.auctionDeleteReason({ status: 'SCHEDULED', ...row }));
});

test('API wrappers use authenticated PATCH and DELETE endpoints and propagate server errors', async () => {
  const calls = [];
  const api = load('services/auction.service.ts', {
    './api': {
      apiRequest: async (...args) => {
        calls.push(args);
        return { success: true, deletedId: 'room-1' };
      },
    },
    './auth': {},
    './auction-response.helpers': {},
    './auction-socket.service': {},
  });
  const payload = { title: 'Updated', consignmentDeadline: null, imageUrl: null };
  await api.adminUpdateAuctionApi('room-1', payload);
  await api.adminDeleteAuctionApi('room-1');
  assert.equal(calls[0][0], '/auctions/admin/room-1');
  assert.equal(calls[0][1].method, 'PATCH');
  assert.equal(calls[0][1].body, payload);
  assert.equal(calls[0][1].requireAuth, true);
  assert.equal(calls[1][1].method, 'DELETE');
  assert.equal(calls[1][1].requireAuth, true);
  const failing = load('services/auction.service.ts', {
    './api': {
      apiRequest: async () => {
        throw Error('Already has bids');
      },
    },
    './auth': {},
    './auction-response.helpers': {},
    './auction-socket.service': {},
  });
  await assert.rejects(failing.adminDeleteAuctionApi('room-1'), /Already has bids/);
});

const jsx = (type, props) => ({ type, props });
function hooks() {
  const slots = [];
  let cursor = 0;
  return {
    render: (component, props) => {
      cursor = 0;
      return component(props);
    },
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [
          slots[index],
          (value) => {
            slots[index] = typeof value === 'function' ? value(slots[index]) : value;
          },
        ];
      },
      useRef: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useEffect: (fn) => {
        fn();
      },
    },
  };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  const children = [node.props?.children].flat(Infinity);
  for (const child of children) {
    const result = find(child, predicate);
    if (result) return result;
  }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

function createFormSetup({ hasImage = true, promotionFails = false } = {}) {
  const harness = hooks();
  const calls = { creates: 0, promotions: 0, completed: 0, errors: [] };
  const component = load(`${base}CreateAuctionDialog.tsx`, {
    react: harness.react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': {},
    '../../../services/api': {},
    '../../../services/auction.service': {
      adminCreateAuctionApi: async (payload) => {
        calls.creates++;
        return { ...payload, id: 'created', status: 'SCHEDULED' };
      },
    },
    '../../../services/auth': { getStoredToken: () => 'session' },
    '../../ToastNotification': {
      useToast: () => ({ success() {}, error: (message) => calls.errors.push(message) }),
    },
    '../../Popup': {},
    '../shared/AdminUI': {},
    '../../../utils/date-time': { minEndDateTime() {} },
    './ConsignmentDeadlineField': {},
    './auctionManagementAvailability': policy,
    './auctionBannerPromotion': {
      promoteAuctionBanner: async () => {
        calls.promotions++;
        if (promotionFails) throw Error('Unavailable');
      },
    },
  }).default;
  const props = {
    onClose() {},
    onCreated: () => {
      calls.completed++;
    },
  };
  const render = () => harness.render(component, props);
  find(render(), (node) => node.type === 'input' && node.props.autoFocus).props.onChange({
    target: { value: 'New room' },
  });
  const dateField = (text) =>
    find(
      find(
        render(),
        (node) =>
          node.type === 'label' &&
          [node.props.children]
            .flat()
            .some((value) => typeof value === 'string' && value.trim() === text),
      ),
      (node) => node.type === 'input',
    );
  dateField('Bắt đầu').props.onChange({ target: { value: '2030-01-01T10:00' } });
  dateField('Kết thúc').props.onChange({ target: { value: '2030-01-01T12:00' } });
  if (hasImage)
    find(
      render(),
      (node) => node.type === 'input' && node.props.inputMode === 'url',
    ).props.onChange({ target: { value: 'https://example.com/room.png' } });
  return { calls, render };
}

test('create switch works as a promotion request and validates the image before creating', async () => {
  const app = createFormSetup();
  let tree = app.render();
  const toggle = find(tree, (node) => node.props?.role === 'switch');
  assert.equal(toggle.props.disabled, false);
  toggle.props.onClick();
  tree = app.render();
  assert.equal(find(tree, (node) => node.props?.role === 'switch').props['aria-checked'], true);
  find(tree, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(app.calls.creates, 1);
  assert.equal(app.calls.promotions, 1);
  assert.equal(app.calls.completed, 1);

  const missing = createFormSetup({ hasImage: false });
  find(missing.render(), (node) => node.props?.role === 'switch').props.onClick();
  find(missing.render(), (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(missing.calls.creates, 0);
});

test('promotion failure preserves successful room creation and directs retry to the banner button', async () => {
  const app = createFormSetup({ promotionFails: true });
  find(app.render(), (node) => node.props?.role === 'switch').props.onClick();
  find(app.render(), (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(app.calls.creates, 1);
  assert.equal(app.calls.completed, 1);
  assert.equal(app.calls.errors.length, 1);
  assert.match(app.calls.errors[0], /Lên banner/);
});

test('edit form sends PATCH data, preserves original date precision, and clears deadline explicitly', async () => {
  const harness = hooks();
  const calls = [];
  const form = load(`${base}CreateAuctionDialog.tsx`, {
    react: harness.react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': {},
    '../../../services/api': {},
    '../../../services/auction.service': {
      adminCreateAuctionApi: () => {
        throw Error('Edit must not create');
      },
      adminUpdateAuctionApi: async (...args) => {
        calls.push(args);
        return { id: args[0] };
      },
    },
    '../../../services/auth': { getStoredToken: () => 'session' },
    '../../ToastNotification': { useToast: () => ({ success() {} }) },
    '../../Popup': {},
    '../shared/AdminUI': {},
    '../../../utils/date-time': { minEndDateTime() {} },
    './ConsignmentDeadlineField': {},
    './auctionManagementAvailability': policy,
    './auctionBannerPromotion': {},
  }).default;
  let saved;
  const props = {
    auction: {
      id: 'room-1',
      status: 'SCHEDULED',
      title: 'Original',
      description: '',
      imageUrl: '/images/test.png',
      minBuyerReputation: 40,
      minSellerReputation: 50,
      startTime: '2030-01-01T10:00:12.123Z',
      endTime: '2030-01-01T12:00:12.123Z',
      consignmentDeadline: '2030-01-01T11:00:12.123Z',
    },
    onCreated: (row) => {
      saved = row;
    },
    onClose() {},
  };
  let tree = harness.render(form, props);
  find(tree, (node) => node.props?.onChange && node.props?.startTime).props.onChange('');
  tree = harness.render(form, props);
  find(tree, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'room-1');
  assert.equal(calls[0][1].startTime, props.auction.startTime);
  assert.equal(calls[0][1].endTime, props.auction.endTime);
  assert.equal(calls[0][1].consignmentDeadline, null);
  assert.equal(calls[0][1].imageUrl, '/images/test.png');
  assert.equal(saved.id, 'room-1');
});

test('delete confirmation prevents duplicate requests and closes only after server confirms deletion', async () => {
  const harness = hooks();
  let calls = 0;
  let complete;
  let deleted = 0;
  const dialog = load(`${base}DeleteAuctionDialog.tsx`, {
    react: harness.react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../Popup': {},
    '../shared/AdminUI': {},
    '../../../services/auction.service': {
      adminDeleteAuctionApi: () => {
        calls++;
        return new Promise((resolve) => {
          complete = resolve;
        });
      },
    },
    '../../../services/auth': { getStoredToken: () => 'session' },
    '../../ToastNotification': { useToast: () => ({ success() {} }) },
    './auctionManagementAvailability': policy,
  }).default;
  const tree = harness.render(dialog, {
    auction: { id: 'room-1', title: 'Room', status: 'DRAFT', totalBidsCount: 0 },
    onClose() {},
    onDeleted: () => {
      deleted++;
    },
  });
  const button = tree.props.footer.props.children[1];
  button.props.onClick();
  button.props.onClick();
  assert.equal(calls, 1);
  assert.equal(deleted, 0);
  complete({ success: true, deletedId: 'room-1' });
  await tick();
  assert.equal(deleted, 1);
});
