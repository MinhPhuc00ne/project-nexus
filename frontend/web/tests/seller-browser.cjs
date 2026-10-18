const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const out = path.resolve('artifacts/seller-browser');
fs.mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:5173';
const api = 'http://localhost:3001/api/v1';
const password = 'SellerTest@2026';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const network = [];
const errors = [];
let cdp;

async function connect() {
  const target = await (await fetch('http://127.0.0.1:9222/json/new?' + encodeURIComponent(base + '/login'), { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, 'open');
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    } else if (message.method === 'Network.responseReceived' && message.params.response.url.includes('/api/v1/')) {
      const { url, status } = message.params.response;
      network.push({ url, status });
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  return { send, close: () => socket.close() };
}

async function evaluate(expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { if (await evaluate(expression)) return; } catch { /* Navigation replaces the execution context. */ }
    await delay(100);
  }
  throw new Error('Timed out: ' + expression);
}
async function navigate(route) {
  await cdp.send('Page.navigate', { url: base + route });
  await waitFor('document.readyState === "complete" && document.body.innerText.length > 20');
}
async function screenshot(name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data, 'base64'));
}
async function clickButton(label) {
  const clicked = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(label)})); if (!b) return false; b.click(); return true; })()`);
  if (!clicked) throw new Error('Missing button: ' + label);
}
async function login() {
  await navigate('/login');
  await waitFor('!!document.querySelector("input[type=email]")');
  await evaluate(`(() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for (const [selector,value] of [['input[type=email]','seller.e2e@nexus.test'],['input[type=password]',${JSON.stringify(password)}]]) {const input=document.querySelector(selector);setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));} })()`);
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await waitFor('location.pathname === "/seller" && !!document.querySelector("h1")');
}
async function backend(expression) {
  return evaluate(`(async () => { const api=${JSON.stringify(api)}; const token=localStorage.getItem('nexus:auth-token'); ${expression} })()`);
}
async function check(name, action) {
  try {
    const detail = await action();
    results.push({ name, status: 'PASS', detail });
    console.log('PASS', name, detail ? JSON.stringify(detail) : '');
  } catch (error) {
    results.push({ name, status: 'FAIL', detail: error.message });
    console.log('FAIL', name, error.message);
    await screenshot('failure-' + results.length).catch(() => {});
  }
}

(async () => {
  cdp = await connect();
  await waitFor('!!document.querySelector("input[type=email]")');
  await evaluate('localStorage.clear()');
  await check('Unauthenticated seller route redirects to login', async () => {
    await navigate('/seller/orders');
    await waitFor('location.pathname === "/login"');
  });
  await check('Seller logs in through the actual login form', async () => {
    await login();
    await waitFor('document.body.innerText.includes("1.250.000")');
    await screenshot('seller-dashboard-desktop');
    return { path: await evaluate('location.pathname'), walletDisplayed: true };
  });
  await check('Seller dashboard reload retains the authenticated session', async () => {
    await cdp.send('Page.reload');
    await waitFor('location.pathname === "/seller" && !!document.querySelector("h1")');
  });
  await check('All seller screens retain navigation and logout', async () => {
    const pages = ['/seller/products','/seller/products/new','/seller/orders','/seller/orders/test-order','/seller/inventory','/seller/auctions','/seller/auctions/new','/seller/finance','/seller/disputes','/seller/settings'];
    for (const page of pages) {
      await navigate(page);
      await waitFor('!!document.querySelector("nav[aria-label]")');
      const hasLogout = await evaluate('[...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Đăng xuất")');
      if (!hasLogout) throw new Error('Missing logout: ' + page);
    }
    return { pages: pages.length };
  });
  await check('Seller dashboard works at mobile viewport', async () => {
    await navigate('/seller');
    await waitFor('!!document.querySelector("h1")');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await screenshot('seller-dashboard-mobile');
    const dimensions = await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');
    if (dimensions.scroll > dimensions.width) throw new Error('Horizontal overflow: ' + JSON.stringify(dimensions));
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  });
  await check('Switch seller to buyer persists mode in the real database', async () => {
    await clickButton('Chuyển sang người mua');
    await waitFor('location.pathname === "/buyer"');
    const state = await backend("const r=await fetch(api+'/users/me',{headers:{Authorization:'Bearer '+token}});return (await r.json()).data;");
    if (state.isSellerActive !== false || state.role !== 'SELLER') throw new Error('Wrong persisted seller mode');
    return { role: state.role, isSellerActive: state.isSellerActive };
  });
  await check('Buyer header returns an approved seller to seller dashboard', async () => {
    await clickButton('Kênh Người Bán');
    await waitFor('location.pathname === "/seller" && !!document.querySelector("h1")');
    const active = await backend("const r=await fetch(api+'/users/me',{headers:{Authorization:'Bearer '+token}});return (await r.json()).data.isSellerActive;");
    if (!active) throw new Error('Seller mode was not activated');
  });
  await check('A temporary network failure shows Retry and preserves the seller login', async () => {
    await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await evaluate("window.dispatchEvent(new Event('focus'))");
    await waitFor('!!document.querySelector("[role=alert]")');
    await screenshot('seller-network-error');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await clickButton('Thử lại');
    await waitFor('!!document.querySelector("nav[aria-label]")');
  });
  await check('Existing GET /seller/profile works with the normal login token', async () => {
    const result = await backend("const r=await fetch(api+'/seller/profile',{headers:{Authorization:'Bearer '+token}});return {status:r.status,body:await r.text()};");
    if (result.status !== 200) throw new Error('HTTP '+result.status+': '+result.body.slice(0,650));
  });
  await check('Existing PATCH /seller/toggle-mode works with the normal login token', async () => {
    const result = await backend("const r=await fetch(api+'/seller/toggle-mode',{method:'PATCH',headers:{Authorization:'Bearer '+token}});return {status:r.status,body:await r.text()};");
    if (result.status !== 200) throw new Error('HTTP '+result.status+': '+result.body.slice(0,650));
  });
  let previousRefresh;
  await check('Seller logout clears credentials and revokes the server refresh token', async () => {
    await navigate('/seller');
    await waitFor('!!document.querySelector("h1")');
    previousRefresh = await evaluate("localStorage.getItem('nexus:auth-refresh-token')");
    const primary = cdp;
    const secondary = await connect();
    cdp = secondary;
    await navigate('/seller');
    await waitFor('!!document.querySelector("h1")');
    cdp = primary;
    await clickButton('Đăng xuất');
    await waitFor('location.pathname === "/login"');
    const credentials = await evaluate("['nexus:auth-user','nexus:auth-token','nexus:auth-refresh-token'].map(k=>localStorage.getItem(k))");
    if (credentials.some(Boolean)) throw new Error('Credentials remain after logout');
    await delay(300);
    const status = await backend(`const r=await fetch(api+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:${JSON.stringify(previousRefresh)}})});return r.status;`);
    if (status !== 401) throw new Error('Logged-out refresh token still works: HTTP '+status);
    cdp = secondary;
    await waitFor('location.pathname === "/login"');
    cdp = primary;
    secondary.close();
    return { otherTabAlsoLoggedOut: true };
  });
  await check('Browser Back cannot restore seller content after logout', async () => {
    await evaluate('history.back()');
    await delay(600);
    await waitFor('!location.pathname.startsWith("/seller") && !document.body.innerText.includes("NEXUS Seller")');
    await navigate('/seller/orders');
    await waitFor('location.pathname === "/login"');
  });
  await check('Real buyer/admin/staff accounts are blocked from seller routes', async () => {
    for (const role of ['BUYER','ADMIN','SUPPORT_STAFF']) {
      await navigate('/login');
      await backend(`const r=await fetch(api+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:${JSON.stringify(role.toLowerCase()+'.e2e@nexus.test')},password:${JSON.stringify(password)}})});const d=(await r.json()).data;if(!r.ok)throw new Error('Test login HTTP '+r.status);localStorage.setItem('nexus:auth-user',JSON.stringify(d.user));localStorage.setItem('nexus:auth-token',d.accessToken);localStorage.setItem('nexus:auth-refresh-token',d.refreshToken);`);
      await navigate('/seller/products');
      await waitFor('location.pathname === "/"');
    }
  });
  await check('Seller session expires even with a valid refresh token (refresh behavior)', async () => {
    await login();
    const original = await evaluate("localStorage.getItem('nexus:auth-token')");
    const env = require('dotenv').parse(fs.readFileSync('.env'));
    const jwt = require('jsonwebtoken');
    const claims = jwt.decode(original);
    delete claims.exp; delete claims.iat;
    const expired = jwt.sign(claims, env.JWT_SECRET, { expiresIn: -1 });
    await evaluate(`localStorage.setItem('nexus:auth-token',${JSON.stringify(expired)})`);
    await navigate('/seller');
    await waitFor('location.pathname === "/login"');
    await screenshot('expired-session-login');
    return { redirectsToLogin: true, refreshTokenStillStored: await evaluate("!!localStorage.getItem('nexus:auth-refresh-token')") };
  });
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ environment: { frontend: base, backend: api, database: 'nexus_seller_e2e_20261018', browser: 'Chrome headless via CDP', mockedRequests: false }, results, network, errors }, null, 2));
  console.log('RESULTS', path.join(out, 'results.json'));
})().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => cdp?.close());
