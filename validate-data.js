'use strict';
/** Validates data.js: schema, uniqueness, value ranges and that every tag is part of the engine vocabulary. */
const { PEOPLE, PLACES } = require('../data');
const { KNOWN_TAGS, plain } = require('../engine');

const errors = [];
const err = (rec, msg) => errors.push(`${rec.n || '(unnamed)'}: ${msg}`);
const names = new Map();
const COUNTRIES = ['india', 'pakistan'];

for (const r of [...PEOPLE, ...PLACES]) {
  if (!r.n || typeof r.n !== 'string') err(r, 'missing name');
  if (!COUNTRIES.includes(r.c)) err(r, `country must be one of ${COUNTRIES}`);
  if (![1, 2, 3].includes(r.lv)) err(r, 'level must be 1, 2 or 3');
  if (typeof r.info !== 'string' || r.info.length < 25 || r.info.length > 260) err(r, 'info must be 25-260 characters');
  if (!Array.isArray(r.tags) || !r.tags.length) err(r, 'needs at least one tag');
  for (const t of r.tags || []) if (!KNOWN_TAGS.has(t)) err(r, `unknown tag "${t}" (add it to BASE in engine.js)`);
  if (new Set(r.tags).size !== (r.tags || []).length) err(r, 'duplicate tags');
  for (const n of [r.n, ...(r.al || [])]) {
    const k = plain(n);
    if (!k) err(r, `empty alias "${n}"`);
    else if (names.has(k) && names.get(k) !== r.n) err(r, `name/alias "${n}" is also used by ${names.get(k)}`);
    else names.set(k, r.n);
  }
  if (r.type === 'person') {
    if (!['m', 'f'].includes(r.g)) err(r, 'gender must be m or f');
    if (!Number.isInteger(r.b)) err(r, 'birth year must be an integer');
    if (r.d != null && (!Number.isInteger(r.d) || r.d < r.b)) err(r, 'death year must be >= birth year');
    if (r.d == null && r.b < 1900) err(r, 'born before 1900 but has no death year');
    if (!r.from || !r.from.includes(',') && !r.from) err(r, 'missing birthplace');
  } else {
    if (r.y != null && !Number.isInteger(r.y)) err(r, 'year must be an integer or null');
    if (!r.loc) err(r, 'missing location');
    const kind = ['natural', 'man-made'].filter((k) => r.tags.includes(k));
    if (kind.length !== 1 && !r.tags.includes('city')) err(r, 'places need exactly one of: natural, man-made (cities are exempt)');
    if (r.tags.includes('natural') && r.tags.includes('man-made')) err(r, 'cannot be natural and man-made');
  }
}
const count = (list, c) => list.filter((r) => r.c === c).length;
for (const c of COUNTRIES) for (const [label, list] of [['people', PEOPLE], ['places', PLACES]]) if (count(list, c) < 8) errors.push(`only ${count(list, c)} ${label} for ${c} (need at least 8)`);
for (const lv of [1, 2, 3]) if ([...PEOPLE, ...PLACES].filter((r) => r.lv === lv).length < 10) errors.push(`fewer than 10 records at level ${lv}`);

if (errors.length) {
  console.error(`Data validation FAILED (${errors.length}):\n - ${errors.join('\n - ')}`);
  process.exit(1);
}
console.log(`Data OK: ${PEOPLE.length} people, ${PLACES.length} places, ${names.size} unique names/aliases.`);
