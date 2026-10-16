'use strict';
process.env.KASOTI_AI_DELAY = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');

// Real server (with a stubbed "ws") produces the states; index.html's script renders them into a fake DOM.
const fakeWs = { WebSocketServer: class { on(ev, fn) { if (ev === 'connection') fakeWs.onConn = fn; } } };
const origLoad = Module._load;
Module._load = function (req, ...rest) { return req === 'ws' ? fakeWs : origLoad.call(this, req, ...rest); };
require('../server.js');

const conn = () => { const ws = { readyState: 1, out: [], h: {}, on(e, f) { this.h[e] = f; }, send(d) { this.out.push(JSON.parse(d)); } }; fakeWs.onConn(ws); return ws; };
const send = (ws, o) => ws.h.message(JSON.stringify(o));
const last = (ws, t) => [...ws.out].reverse().find((m) => m.t === t);

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
const el = () => ({ innerHTML: '', value: '', style: {}, classList: { toggle() {}, add() {}, remove() {} }, remove() {}, select() {}, focus() {}, setSelectionRange() {} });
const app = el();
const ctx = {
  console, setInterval: () => 0, setTimeout: () => 0, clearTimeout() {}, innerWidth: 1400, performance, requestAnimationFrame() {}, cancelAnimationFrame() {},
  document: { querySelector: (s) => (s === '#app' ? app : null), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(), body: { appendChild() {}, classList: { toggle() {} } }, activeElement: null, title: '' },
  location: { hash: '', origin: 'http://x', protocol: 'http:', host: 'x' }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  WebSocket: function () {}, addEventListener() {}, navigator: {}, confirm: () => true, scrollTo() {},
};
vm.createContext(ctx);
vm.runInContext(script, ctx);
const render = (code) => { vm.runInContext(code, ctx); return app.innerHTML; };
const show = (st) => render(`S=${JSON.stringify(st)};draw()`);
const text = (h) => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (h, label) => assert.ok(!/undefined|NaN|\[object/.test(h), `${label}: render contains an invalid token`);

test('home, friends, join, host and AI setup screens render', () => {
  let h = render('S=null;home=null;draw()'); clean(h, 'home'); assert.match(h, /Play with friends/); assert.match(h, /Play with AI/);
  h = render("home='friends';draw()"); clean(h, 'friends'); assert.match(h, /Host a new game/);
  h = render("home='host';draw()"); clean(h, 'host'); assert.match(h, /Create game/);
  h = render("home='join';draw()"); clean(h, 'join');
  h = render("home='ai';draw()"); clean(h, 'ai setup');
  assert.match(h, /Surprise me/); assert.match(h, /Pakistan/); assert.match(h, /Difficulty/); assert.doesNotMatch(h, /own category/i);
});

test('friends mode renders lobby, countdown, playing and ended', () => {
  const H = conn(), A = conn(), K = conn();
  send(H, { t: 'create', name: 'Host' }); const code = last(H, 'state').code;
  send(A, { t: 'join', code, name: 'Ann', team: 'A' }); send(K, { t: 'join', code, name: 'Kim', team: 'B' });
  for (const w of [H, A, K]) clean(show(last(w, 'state')), 'lobby');
  [A, K].forEach((w) => send(w, { t: 'confirm' })); send(K, { t: 'secret', secret: 'Eiffel Tower' }); send(H, { t: 'start' });
  clean(show(last(H, 'state')), 'countdown'); send(H, { t: 'skip' });
  send(A, { t: 'ask', text: 'Is it big?' });
  for (const w of [H, A, K]) { const h = show(last(w, 'state')); clean(h, 'playing'); assert.match(h, /Who's playing|PLAYERS/i); }
  assert.doesNotMatch(show(last(A, 'state')), /Eiffel/);           // Seekers never see the secret
  assert.match(show(last(H, 'state')), /••••••••/);                 // Keepers see it masked until "View"
  send(H, { t: 'end' }); const h = show(last(H, 'state')); clean(h, 'ended'); assert.match(text(h), /Eiffel Tower/);
});

test('AI mode renders every phase, clue board, unclear answers and facts', async () => {
  const P = conn();
  send(P, { t: 'createai', name: 'Zed', topic: 'any', country: 'both', difficulty: 'any', limit: 10 });
  let h = show(last(P, 'state')); clean(h, 'ai countdown'); assert.match(h, /starts in/);
  send(P, { t: 'skip' });
  send(P, { t: 'ask', text: 'Is it a person?' }); await sleep(10);
  send(P, { t: 'ask', text: 'Is the sky blue?' }); await sleep(10);
  h = show(last(P, 'state')); clean(h, 'ai playing');
  assert.match(h, /Clue board/); assert.match(h, /Unclear/); assert.match(h, /Give up/);
  assert.doesNotMatch(h, /Pass my turn|Retry|chatdock|Invite/);     // AI mode hides friends-only controls
  assert.match(h, /class="chip"/);                                  // suggested questions
  send(P, { t: 'guess', text: 'definitely wrong' }); await sleep(10);
  h = show(last(P, 'state')); clean(h, 'ai ended');
  assert.match(h, /The AI’s secret was/); assert.match(h, /class="facts"/); assert.match(h, /Play again/);
});
