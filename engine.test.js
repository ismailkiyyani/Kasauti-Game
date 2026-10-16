'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const e = require('../engine');

const rec = (n) => e.RECORDS.find((r) => r.n === n);
const A = (n, q) => e.answer(rec(n), q).a;

test('type, country, gender and life status', () => {
  assert.equal(A('Mahatma Gandhi', 'Is it a person?'), 'Yes');
  assert.equal(A('Mahatma Gandhi', 'Is it a place?'), 'No');
  assert.equal(A('Mahatma Gandhi', 'Is he alive?'), 'No');
  assert.equal(A('Mahatma Gandhi', 'Is it from Pakistan?'), 'No');
  assert.equal(A('Malala Yousafzai', 'Is it a woman?'), 'Yes');
  assert.equal(A('Malala Yousafzai', 'Is she alive?'), 'Yes');
  assert.equal(A('Malala Yousafzai', 'Is she a Nobel laureate?'), 'Yes');
  assert.equal(A('Imran Khan', 'Is he Pakistani?'), 'Yes');
});

test('professions, regions and OR questions', () => {
  assert.equal(A('Sachin Tendulkar', 'Is he a cricketer?'), 'Yes');
  assert.equal(A('Sachin Tendulkar', 'Is he an actor?'), 'No');
  assert.equal(A('Sachin Tendulkar', 'Is he from Mumbai?'), 'Yes');
  assert.equal(A('Sachin Tendulkar', 'Is he from Kerala?'), 'No');
  assert.equal(A('Rabindranath Tagore', 'Is he a poet or a scientist?'), 'Yes');
  assert.equal(A('Rabindranath Tagore', 'Is he not a scientist?'), 'Yes');
});

test('years, centuries, ages and first letter', () => {
  assert.equal(A('Mahatma Gandhi', 'Was he born before 1900?'), 'Yes');
  assert.equal(A('Mahatma Gandhi', 'Was he born in the 19th century?'), 'Yes');
  assert.equal(A('Mahatma Gandhi', 'Did he die after 1950?'), 'No');
  assert.equal(A('Taj Mahal', 'Was it built in the 1600s?'), 'Yes');
  assert.equal(A('Taj Mahal', 'Was it built after 1700?'), 'No');
  assert.equal(A('Taj Mahal', 'Is it older than 300 years?'), 'Yes');
  assert.equal(A('Taj Mahal', 'Was it built before independence?'), 'Yes');
  assert.equal(A('Mohenjo-daro', 'Was it built before 1000 BCE?'), 'Yes');
  assert.equal(A('Taj Mahal', 'Does it start with the letter T?'), 'Yes');
});

test('place kinds, builders, UNESCO and natural vs man-made', () => {
  assert.equal(A('Taj Mahal', 'Is it a tomb?'), 'Yes');
  assert.equal(A('Taj Mahal', 'Was it built by Shah Jahan?'), 'Yes');
  assert.equal(A('Taj Mahal', 'Is it a UNESCO World Heritage Site?'), 'Yes');
  assert.equal(A('Taj Mahal', 'Is it a temple?'), 'No');
  assert.equal(A('K2', 'Is it natural?'), 'Yes');
  assert.equal(A('K2', 'Is it a mountain?'), 'Yes');
  assert.equal(A('K2', 'Is it a building?'), 'No');
  assert.equal(A('Badshahi Mosque', 'Is it in Lahore?'), 'Yes');
  assert.equal(A('Badshahi Mosque', 'Is it in the north?'), 'No'); // Lahore is in Punjab, tagged "east" for Pakistan
});

test('unclear questions and guess-like questions are not answered Yes/No', () => {
  assert.equal(A('Taj Mahal', 'Is the sky blue?'), 'Unclear');
  assert.equal(A('Taj Mahal', ''), 'Unclear');
  const g = e.answer(rec('Taj Mahal'), 'Is it the Taj Mahal?');
  assert.equal(g.a, 'Unclear');
  assert.match(g.note, /guess/i);
});

test('judge accepts aliases and small typos but not other answers', () => {
  const g = rec('Mahatma Gandhi');
  assert.ok(e.judge(g, 'Gandhi'));
  assert.ok(e.judge(g, 'mahatma gandi'));
  assert.ok(!e.judge(g, 'Nehru'));
  assert.ok(e.judge(rec('Taj Mahal'), 'the taj mahal'));
});

test('hints never contain the secret and move to new topics', () => {
  for (const r of e.RECORDS) {
    const h = e.hint(r, []);
    assert.ok(!e.plain(h).includes(e.plain(r.n)), `${r.n}: hint leaks the name`);
  }
  const g = rec('Mahatma Gandhi');
  assert.match(e.hint(g, []), /person or a place/);
  assert.match(e.hint(g, ['Is it a person?']), /country/i);
});

test('clues summarise single-fact answers only', () => {
  const log = [
    { q: 'Is it a person?', a: 'Yes' },
    { q: 'Is he a cricketer or an actor?', a: 'No' },
    { q: 'Is it from India?', a: 'Yes' },
    { g: 1, q: 'Gandhi', a: 'No' },
  ];
  assert.deepEqual(e.clues(log).map((c) => [c.tag, c.ok]), [['person', true], ['india', true]]);
});

test('pick respects topic, country and difficulty', () => {
  for (let i = 0; i < 40; i++) {
    const r = e.pick({ topic: 'place', country: 'pakistan', difficulty: 'easy' });
    assert.equal(r.type, 'place'); assert.equal(r.c, 'pakistan'); assert.equal(r.lv, 1);
  }
  const used = e.RECORDS.filter((r) => r.type === 'place' && r.c === 'pakistan' && r.lv === 1).map((r) => r.n);
  assert.ok(e.pick({ topic: 'place', country: 'pakistan', difficulty: 'easy' }, used.slice(1)).n === used[0]);
});

test('facts describe the secret', () => {
  const f = Object.fromEntries(e.facts(rec('Taj Mahal')));
  assert.equal(f.Country, 'India'); assert.equal(f['UNESCO site'], 'Yes');
  assert.match(Object.fromEntries(e.facts(rec('Ashoka'))).Born, /304 BCE/);
});
