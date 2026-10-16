'use strict';
process.env.KASOTI_AI_DELAY = '0';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Replace the "ws" package with a stub so tests need no network sockets.
const fakeWs = { WebSocketServer: class { on(ev, fn) { if (ev === 'connection') fakeWs.onConn = fn; } } };
const origLoad = Module._load;
Module._load = function (req, ...rest) { return req === 'ws' ? fakeWs : origLoad.call(this, req, ...rest); };
const { rooms } = require('../server.js');
const engine = require('../engine');

const client = () => {
  const ws = { readyState: 1, out: [], h: {}, on(e, f) { this.h[e] = f; }, send(d) { this.out.push(JSON.parse(d)); } };
  fakeWs.onConn(ws);
  return ws;
};
const send = (ws, o) => ws.h.message(JSON.stringify(o));
const last = (ws, t) => [...ws.out].reverse().find((m) => m.t === t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('friends: host starts as Keeper; secret is hidden from Seekers', () => {
  const H = client(), G = client(), K = client();
  send(H, { t: 'create', name: 'Host' });
  const code = last(H, 'state').code;
  assert.equal(last(H, 'state').players[0].team, 'B');
  send(G, { t: 'join', code, name: 'Gus', team: 'A' });
  send(K, { t: 'join', code, name: 'Kim', team: 'B' });
  send(G, { t: 'confirm' }); send(K, { t: 'confirm' });
  send(G, { t: 'secret', secret: 'nope' });                    // Seekers cannot set it
  assert.equal(last(H, 'state').secretSet, false);
  send(K, { t: 'secret', secret: 'Eiffel Tower' });
  assert.equal(last(G, 'state').secret, undefined);
  assert.equal(last(K, 'state').secret, 'Eiffel Tower');
  send(H, { t: 'start' }); send(H, { t: 'skip' });
  assert.equal(last(H, 'state').phase, 'playing');
});

test('friends: turns rotate, one question at a time, answers editable, guess verdict ends round', () => {
  const H = client(), A = client(), B = client(), K = client();
  send(H, { t: 'create', name: 'Host' });
  const code = last(H, 'state').code;
  send(A, { t: 'join', code, name: 'Ann', team: 'A' }); send(B, { t: 'join', code, name: 'Bob', team: 'A' }); send(K, { t: 'join', code, name: 'Kim', team: 'B' });
  [A, B, K].forEach((w) => send(w, { t: 'confirm' }));
  send(K, { t: 'secret', secret: 'Mount Everest' }); send(H, { t: 'start' }); send(H, { t: 'skip' });
  const turn = () => { const s = last(H, 'state'); return s.players.find((p) => p.id === s.asker).name; };
  assert.equal(turn(), 'Ann');
  send(A, { t: 'ask', text: 'q1' });
  assert.equal(turn(), 'Bob');                                  // turn moved on
  send(B, { t: 'ask', text: 'blocked' });
  assert.equal(last(H, 'state').log.length, 1);                 // previous question still unanswered
  send(H, { t: 'ans', i: 0, a: 'No' }); send(H, { t: 'ans', i: 0, a: 'Yes' });
  assert.deepEqual([last(H, 'state').log[0].a, last(H, 'state').log[0].ed], ['Yes', 1]);
  send(B, { t: 'pass' }); assert.equal(turn(), 'Ann');
  send(B, { t: 'role', role: 'asker', pid: last(B, 'state').you });   // non-host cannot reassign turns
  assert.equal(turn(), 'Ann');
  send(A, { t: 'hint' }); assert.equal(last(H, 'state').log.length, 1); // hints locked before 10 questions
  send(A, { t: 'guess', text: 'Everest' }); send(H, { t: 'verdict', i: 1, ok: true });
  assert.deepEqual([last(H, 'state').phase, last(H, 'state').result.winner], ['ended', 'A']);
});

test('friends: leave, kick and end game', () => {
  const H = client(), G = client(), K = client();
  send(H, { t: 'create', name: 'Host' }); const code = last(H, 'state').code;
  send(G, { t: 'join', code, name: 'Gus', team: 'A' }); send(K, { t: 'join', code, name: 'Kim', team: 'B' });
  send(H, { t: 'kick', pid: last(K, 'state').you });
  assert.ok(last(K, 'kicked')); assert.equal(last(H, 'state').players.length, 2);
  send(G, { t: 'leave' }); assert.ok(last(G, 'left'));
  send(H, { t: 'endgame' }); assert.ok(last(H, 'closed')); assert.equal(rooms.has(code), false);
});

test('AI mode: offline engine picks a secret and answers', async () => {
  const P = client();
  send(P, { t: 'createai', name: 'Zed', topic: 'person', country: 'pakistan', difficulty: 'easy', limit: 10 });
  let s = last(P, 'state');
  assert.equal(s.ai, true); assert.equal(s.phase, 'countdown'); assert.equal(s.secret, undefined);
  assert.match(s.aiCat, /People/); assert.ok(s.players.some((p) => p.id === 'AI'));
  const room = [...rooms.values()].find((r) => r.ai && r.host === s.you), rec = room.ai.rec;
  assert.equal(rec.type, 'person'); assert.equal(rec.c, 'pakistan'); assert.equal(rec.lv, 1);
  send(P, { t: 'skip' });
  send(P, { t: 'ask', text: 'Is it a person?' }); await sleep(5);
  assert.equal(last(P, 'state').log[0].a, 'Yes');
  send(P, { t: 'ask', text: 'Is it from India?' }); await sleep(5);
  assert.equal(last(P, 'state').log[1].a, 'No');
  send(P, { t: 'ask', text: 'Is the sky blue?' }); await sleep(5);
  const u = last(P, 'state').log[2];
  assert.deepEqual([u.a, u.u], ['Unclear', 1]); assert.ok(u.note);
  assert.equal(last(P, 'state').used, 2);                       // unclear answers are free
  assert.deepEqual(last(P, 'state').clues.map((c) => c.tag), ['person', 'india']);
  send(P, { t: 'guess', text: 'definitely wrong' }); await sleep(5);
  s = last(P, 'state');
  assert.deepEqual([s.phase, s.result.why, s.result.winner], ['ended', 'wrong', 'B']);
  assert.equal(s.result.name, rec.n); assert.ok(s.result.facts.length >= 4); assert.ok(s.result.info);
});

test('AI mode: hints after 10 questions, correct guess wins, play again, leave', async () => {
  const P = client();
  send(P, { t: 'createai', name: 'Zed', topic: 'place', country: 'india' });
  send(P, { t: 'skip' });
  const room = [...rooms.values()].find((r) => r.ai && r.host === last(P, 'state').you), rec = room.ai.rec;
  send(P, { t: 'hint' }); assert.equal(last(P, 'state').log.length, 0);
  for (let i = 0; i < 10; i++) { send(P, { t: 'ask', text: 'Is it a place?' }); await sleep(2); }
  assert.equal(last(P, 'state').used, 10);
  send(P, { t: 'hint' }); await sleep(5);
  const h = last(P, 'state').log.at(-1);
  assert.ok(h.h && h.r && !engine.plain(h.r).includes(engine.plain(rec.n)));
  send(P, { t: 'guess', text: rec.n }); await sleep(5);
  assert.deepEqual([last(P, 'state').phase, last(P, 'state').result.winner], ['ended', 'A']);
  send(P, { t: 'next' });
  const s = last(P, 'state');
  assert.deepEqual([s.phase, s.round, s.log.length], ['countdown', 2, 0]);
  send(P, { t: 'leave' }); assert.ok(last(P, 'left'));
});
