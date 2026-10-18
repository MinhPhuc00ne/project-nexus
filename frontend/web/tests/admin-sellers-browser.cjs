// Isolated Chrome session with intercepted APIs. Never approves real database records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');

const output = path.join(__dirname, 'artifacts', 'admin-sellers');
fs.mkdirSync(output, { recursive: true });
const profileDir = fs.mkdtempSync(path.join(output, 'chrome-'));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base = process.env.TEST_WEB_URL || 'http://localhost:5173';
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const assertions = [];
const requests = [];
const exceptions = [];
let role = 'ADMIN';
let rejectFails = true;
let approveFails = true;
let listFails = false;
const records = Array.from({ length: 11 }, (_, index) => ({
  id: `request-${index + 1}`, userId: `buyer-${index + 1}`, storeName: `API Test Store ${index + 1}`,
  phone: '0900000000', businessEmail: 'shop@example.test', identityCardNumber: 'TEST-ID',
  attachmentUrl: '/uploads/seller-proofs/test.pdf', storeDescription: 'Business registration evidence',
  status: 'PENDING', rejectionReason: null, reviewedByAdminId: null, reviewedAt: null,
  createdAt: '2026-10-18T08:00:00.000Z', updatedAt: '2026-10-18T08:00:00.000Z',
  user: { id: `buyer-${index + 1}`, fullName: `Applicant ${index + 1}`, email: `buyer${index + 1}@example.test` },
}));

async function main() {
  const deadline = Date.now() + 15000;
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  while (!fs.existsSync(portFile)) {
    if (Date.now() > deadline) throw new Error('Chrome did not start its debugging endpoint');
    await delay(100);
  }
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, 'open');
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 12000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const respond = async (event) => {
    const url = new URL(event.request.url);
    const route = url.pathname.replace('/api/v1', '');
    const method = event.request.method;
    const body = event.request.postData ? JSON.parse(event.request.postData) : undefined;
    requests.push({ route, method, query: url.search, body });
    let status = 200;
    let data;
    let message;
    if (method === 'OPTIONS') data = {};
    else if (route === '/users/me') data = { id: 'admin-test', role, fullName: 'Test Admin', email: 'admin@example.test' };
    else if (route === '/admin/seller-requests') {
      if (listFails) { status = 500; message = 'List unavailable'; }
      const filtered = records.filter(record => !url.searchParams.get('status') || record.status === url.searchParams.get('status'));
      const page = Number(url.searchParams.get('page') || 1);
      const limit = Number(url.searchParams.get('limit') || 10);
      data = { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) };
    } else if (route.startsWith('/admin/seller-requests/')) {
      const parts = route.split('/');
      const record = records.find(value => value.id === parts[3]);
      if (!record) { status = 404; message = 'Not found'; }
      else if (method === 'GET') data = record;
      else if ((parts[4] === 'reject' && rejectFails) || (parts[4] === 'approve' && approveFails)) { status = 500; message = 'Review unavailable'; }
      else {
        record.status = parts[4] === 'approve' ? 'APPROVED' : 'REJECTED';
        record.rejectionReason = body?.rejectionReason || null;
        data = { request: record, message: 'Review saved', user: { id: record.userId, role: record.status === 'APPROVED' ? 'SELLER' : 'BUYER' } };
      }
    } else { status = 404; message = 'Unexpected API route'; }
    await send('Fetch.fulfillRequest', {
      requestId: event.requestId, responseCode: status,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
        { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, OPTIONS' },
      ],
      body: Buffer.from(JSON.stringify(status >= 400 ? { message } : { data })).toString('base64'),
    });
  };
  socket.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data);
    if (event.id) {
      const entry = pending.get(event.id);
      if (!entry) return;
      clearTimeout(entry.timer); pending.delete(event.id);
      if (event.error) entry.reject(new Error(event.error.message)); else entry.resolve(event.result);
    } else if (event.method === 'Fetch.requestPaused') void respond(event.params).catch(error => exceptions.push(error.message));
    else if (event.method === 'Runtime.exceptionThrown') exceptions.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
  });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/v1/*' }] });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    const until = Date.now() + 12000;
    while (Date.now() < until) {
      try { if (await evaluate(expression)) return; } catch { /* A navigation replaces the document. */ }
      await delay(75);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  const click = async (label) => {
    const found = await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled); if(!button)return false; button.click();return true;})()`);
    assert.ok(found, `Button unavailable: ${label}`);
  };
  const check = async (name, action) => { await action(); assertions.push(name); console.log('PASS', name); };
  const navigate = async route => { await send('Page.navigate', { url: base + route }); };
  await navigate('/admin/sellers');
  await check('Unauthenticated visitors must sign in; no review API is called', async () => {
    await waitFor('document.body.innerText.includes("Đăng nhập bằng tài khoản Admin")');
    assert.equal(requests.filter(r => r.route.startsWith('/admin/seller-requests')).length, 0);
  });
  await evaluate(`localStorage.setItem('nexus:auth-token','test-token');localStorage.setItem('nexus:auth-user',JSON.stringify({id:'admin-test',email:'admin@example.test',role:'ADMIN'}));`);
  await navigate('/admin/sellers');
  await check('Admin sees real API records and pending count instead of demo sellers', async () => {
    await waitFor('document.body.innerText.includes("API Test Store 1")');
    const content = await evaluate('document.body.innerText');
    assert.ok(content.includes('11 hồ sơ chờ'));
    assert.ok(!content.includes('Artisan Dragon Gems'));
    assert.ok(content.includes('Applicant 1'));
  });
  await check('Pagination loads the second server page', async () => {
    await click('Trang sau'); await waitFor('document.body.innerText.includes("API Test Store 11")');
    assert.ok(requests.some(r => r.query.includes('page=2')));
    await click('Trang trước'); await waitFor('document.body.innerText.includes("API Test Store 1")');
  });
  await check('Detail loads applicant and evidence through the detail API', async () => {
    await click('Xem hồ sơ'); await waitFor('!!document.querySelector("[role=dialog] a[target=_blank]")');
    assert.equal(await evaluate('document.querySelector("[role=dialog] a[target=_blank]").pathname'), '/uploads/seller-proofs/test.pdf');
    assert.ok(requests.some(r => r.route === '/admin/seller-requests/request-1' && r.method === 'GET'));
    await evaluate('document.querySelector("[role=dialog] button[aria-label]").click()');
  });
  await check('Reject requires a reason and preserves the dialog when the API fails', async () => {
    await click('Từ chối');
    assert.equal(await evaluate('document.querySelector("[role=dialog] button[type=submit]").disabled'), true);
    await evaluate(`(() => {const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'  Missing evidence  ');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await click('Xác nhận'); await waitFor('document.body.innerText.includes("Review unavailable")');
    assert.equal(records[0].status, 'PENDING');
    assert.ok(await evaluate('!!document.querySelector("[role=dialog]")'));
  });
  await check('Reject submits the trimmed reason and refreshes the pending count', async () => {
    rejectFails = false;
    await click('Xác nhận'); await waitFor('!document.querySelector("[role=dialog]")&&document.body.innerText.includes("10 hồ sơ chờ")');
    assert.equal(records[0].status, 'REJECTED');
    assert.equal(records[0].rejectionReason, 'Missing evidence');
    assert.ok(!(await evaluate('document.body.innerText')).includes('API Test Store 1\n'));
  });
  await check('Rejected filter shows the persisted decision', async () => {
    await click('Đã từ chối'); await waitFor('document.body.innerText.includes("Missing evidence")');
    assert.ok(requests.some(r => r.query.includes('status=REJECTED')));
    await click('Chờ duyệt'); await waitFor('document.body.innerText.includes("API Test Store 2")');
  });
  await check('Approve does not update the row before server success', async () => {
    await click('Phê duyệt & mở gian hàng'); await click('Xác nhận');
    await waitFor('document.body.innerText.includes("Review unavailable")');
    assert.equal(records[1].status, 'PENDING');
    approveFails = false;
    await click('Xác nhận');
    await waitFor('!document.querySelector("[role=dialog]")&&document.body.innerText.includes("9 hồ sơ chờ")');
    assert.equal(records[1].status, 'APPROVED');
    await click('Đã duyệt'); await waitFor('document.body.innerText.includes("API Test Store 2")');
  });
  await check('Request errors show Retry without a false empty state', async () => {
    listFails = true; await click('Làm mới');
    await waitFor('document.body.innerText.includes("List unavailable")');
    assert.ok(!(await evaluate('document.body.innerText')).includes('Không có hồ sơ phù hợp.'));
    listFails = false; await click('Thử lại'); await waitFor('document.body.innerText.includes("API Test Store 2")');
  });
  await check('Legacy staff approval URL redirects to admin', async () => {
    await navigate('/staff/seller-approvals');
    await waitFor('location.pathname==="/admin/sellers"&&document.body.innerText.includes("API Test Store 3")');
  });
  await check('Buyer and support staff are blocked before fetching admin records', async () => {
    for (const deniedRole of ['BUYER', 'SUPPORT_STAFF']) {
      role = deniedRole;
      const before = requests.filter(r => r.route.startsWith('/admin/')).length;
      await navigate('/admin/sellers');
      await waitFor('document.body.innerText.includes("Chỉ quản trị viên ADMIN")');
      assert.equal(requests.filter(r => r.route.startsWith('/admin/')).length, before);
    }
  });
  await check('Staff inbox no longer exposes seller approval actions', async () => {
    await navigate('/staff/inbox'); await waitFor('!!document.querySelector("nav[aria-label]")');
    assert.ok(!(await evaluate('document.body.innerText')).includes('Duyệt Hồ Sơ Seller'));
  });
  role = 'ADMIN'; await navigate('/admin/sellers');
  await waitFor('document.body.innerText.includes("API Test Store 3")');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await check('Mobile review page has no horizontal overflow', async () => {
    const dimensions = await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');
    assert.ok(dimensions.scroll <= dimensions.width, JSON.stringify(dimensions));
  });
  const capture = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, 'mobile.png'), Buffer.from(capture.data, 'base64'));
  assert.deepEqual(exceptions, []);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ mockedApi: true, assertions, requests, exceptions }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  socket?.close();
  const exited = once(chrome, 'exit');
  chrome.kill();
  await Promise.race([exited, delay(3000)]);
  if (path.dirname(path.resolve(profileDir)) !== path.resolve(output)) throw new Error('Unexpected browser profile path');
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});
