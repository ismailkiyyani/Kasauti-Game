'use strict';
/**
 * Kasoti "AI Keeper" - a small, fully offline question-answering engine.
 *
 * It does NOT use any external AI. Instead:
 *   1. data.js holds famous people/places of India & Pakistan with structured facts.
 *   2. parse() turns a yes/no question into predicates (tags, years, ages, first letter).
 *   3. answer() evaluates those predicates against the secret record -> Yes / No / Unclear.
 *
 * Public API: pick, answer, judge, hint, clues, facts, label, parse, RECORDS, KNOWN_TAGS, size
 */
const { PEOPLE, PLACES, EXTRA_REGIONS } = require('./data');

const NOW = 2026;
const strip = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const slug = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const plain = (s) => strip(s).toLowerCase().replace(/['\u2019`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/* ------------------------------------------------------------------ vocabulary
 * tag: [hintGroup, 'synonym|synonym|...']  (the tag's own name is added automatically) */
const BASE = {
  person: ['type', 'person|people|human|someone|somebody|individual|celebrity|personality'],
  place: ['type', 'place|location|landmark|site|destination|tourist spot|tourist attraction|tourist destination|somewhere'],
  male: ['type', 'male|man|men|boy|gentleman|guy'],
  female: ['type', 'female|woman|women|girl|lady'],
  famous: ['type', 'famous|popular|well known|world famous|renowned|celebrated'],
  'south-asia': ['type', 'asia|south asia|asian|indian subcontinent|subcontinent'],
  india: ['country', 'india|indian|indians|bharat|hindustan'],
  pakistan: ['country', 'pakistan|pakistani|pakistanis'],
  alive: ['life', 'alive|living|still alive|alive today|live today'],
  dead: ['life', 'dead|deceased|died|die|dies|passed away|no longer alive'],
  historical: ['life', 'historical|historic|from history|from the past'],
  ancient: ['life', 'ancient|prehistoric'],
  medieval: ['life', 'medieval|middle ages'],
  mughal: ['life', 'mughal|mughals|mughal era|mughal empire|mughal period'],
  colonial: ['life', 'colonial|colonial era|british era|british rule|british raj|raj|british period|british india'],
  modern: ['life', 'modern|recent'],
  'man-made': ['kind', 'man made|manmade|artificial|built by humans|made by humans'],
  natural: ['kind', 'natural|nature|naturally formed|made by nature'],
  cricketer: ['field', 'cricketer|cricket player|cricket|batsman|batter|bowler|plays cricket|wicketkeeper'],
  athlete: ['field', 'athlete|sportsperson|sportsman|sportswoman|sports person|player|sports star'],
  hockey: ['field', 'hockey|hockey player'],
  tennis: ['field', 'tennis|tennis player'],
  badminton: ['field', 'badminton'],
  boxing: ['field', 'boxer|boxing'],
  squash: ['field', 'squash'],
  javelin: ['field', 'javelin|javelin thrower'],
  actor: ['field', 'actor|actress|film star|movie star|film actor'],
  filmmaker: ['field', 'filmmaker|film director|director|film maker|movie director'],
  bollywood: ['field', 'bollywood|hindi cinema|hindi films|hindi film industry|hindi movies'],
  singer: ['field', 'singer|vocalist|playback singer|sings'],
  musician: ['field', 'musician|composer|music composer|musical artist'],
  qawwali: ['field', 'qawwali|qawwal|sufi music'],
  poet: ['field', 'poet|poetry|urdu poet|shayar'],
  writer: ['field', 'writer|author|novelist|wrote books|book writer'],
  politician: ['field', 'politician|political leader|statesman|in politics'],
  'prime-minister': ['field', 'prime minister|pm|prime ministers|head of government'],
  president: ['field', 'president|head of state'],
  ruler: ['field', 'ruler|king|queen|emperor|monarch|maharaja|maharani|sultan|rani|empress|raja'],
  'freedom-fighter': ['field', 'freedom fighter|independence fighter|revolutionary|freedom struggle|independence activist|freedom movement'],
  scientist: ['field', 'scientist|researcher'],
  physicist: ['field', 'physicist|physics'],
  mathematician: ['field', 'mathematician|mathematics|maths'],
  astronaut: ['field', 'astronaut|cosmonaut|went to space'],
  lawyer: ['field', 'lawyer|barrister|advocate'],
  'social-reformer': ['field', 'social reformer|reformer'],
  activist: ['field', 'activist|campaigner'],
  philanthropist: ['field', 'philanthropist|humanitarian|social worker|charity'],
  businessperson: ['field', 'businessman|businesswoman|businessperson|industrialist|entrepreneur|business tycoon|business'],
  'spiritual-leader': ['field', 'spiritual leader|monk|saint|spiritual|guru|swami'],
  military: ['field', 'military|army|general|soldier|army chief'],
  sports: ['field', 'sports|sport|sporting'],
  music: ['field', 'music|musical'],
  politics: ['field', 'politics|political'],
  cinema: ['field', 'cinema|film|films|movie|movies'],
  literature: ['field', 'literature|literary'],
  science: ['field', 'science|scientific'],
  religious: ['field', 'religion|religious|worship|place of worship|holy|sacred|pilgrimage'],
  architecture: ['field', 'architecture|architectural'],
  fort: ['field', 'fort|fortress|qila|citadel'],
  temple: ['field', 'temple|mandir'],
  mosque: ['field', 'mosque|masjid'],
  gurdwara: ['field', 'gurdwara'],
  tomb: ['field', 'tomb|mausoleum|burial place|grave|necropolis'],
  palace: ['field', 'palace'],
  monument: ['field', 'monument'],
  memorial: ['field', 'memorial'],
  tower: ['field', 'tower|minar|minaret'],
  museum: ['field', 'museum'],
  garden: ['field', 'garden|bagh'],
  lake: ['field', 'lake|jheel'],
  river: ['field', 'river'],
  mountain: ['field', 'mountain|peak|mount|summit'],
  valley: ['field', 'valley'],
  city: ['field', 'city|town|metropolis'],
  capital: ['field', 'capital|capital city'],
  bridge: ['field', 'bridge'],
  cave: ['field', 'cave|caves|rock cut'],
  ruins: ['field', 'ruins|archaeological site|excavation|ruined'],
  beach: ['field', 'beach|seaside'],
  statue: ['field', 'statue'],
  pass: ['field', 'mountain pass|pass'],
  stupa: ['field', 'stupa'],
  forest: ['field', 'forest|mangrove|jungle|woods'],
  building: ['field', 'building|structure'],
  marble: ['field', 'marble'],
  buddhist: ['field', 'buddhist|buddhism|buddha'],
  hindu: ['field', 'hindu|hinduism'],
  islamic: ['field', 'islamic|islam|muslim'],
  sikh: ['field', 'sikh|sikhism'],
  'shah-jahan': ['field', 'shah jahan|shahjahan'],
  akbar: ['field', 'akbar'],
  aurangzeb: ['field', 'aurangzeb'],
  british: ['field', 'built by the british|built by british|british architects|the british|british'],
  rajput: ['field', 'rajput|rajputs'],
  maratha: ['field', 'maratha|marathas'],
  'nobel-laureate': ['extra', 'nobel|nobel prize|nobel laureate|nobel prize winner'],
  'olympic-medalist': ['extra', 'olympic|olympics|olympic medalist|olympic medal'],
  'oscar-winner': ['extra', 'oscar|oscars|academy award|academy awards'],
  assassinated: ['extra', 'assassinated|assassination|assassinate|murdered'],
  executed: ['extra', 'executed|hanged|hung'],
  unesco: ['extra', 'unesco|world heritage|heritage site|world heritage site'],
};
/** Things people may ask about that no record has, so the honest answer is a firm "No". */
const NEVER = {
  chef: ['field', 'chef|cook'], farmer: ['field', 'farmer'], judge: ['field', 'judge'], comedian: ['field', 'comedian'],
  dancer: ['field', 'dancer'], pilot: ['field', 'pilot'], airport: ['field', 'airport'], stadium: ['field', 'stadium'],
  zoo: ['field', 'zoo'], waterfall: ['field', 'waterfall'], volcano: ['field', 'volcano'], 'railway-station': ['field', 'railway station|train station'],
};
const VOCAB = { ...BASE, ...NEVER };
const KNOWN_TAGS = new Set(Object.keys(VOCAB));

const REGION_ALIAS = {
  prayagraj: ['allahabad'], mumbai: ['bombay'], kolkata: ['calcutta'], chennai: ['madras'], bengaluru: ['bangalore'], varanasi: ['banaras', 'benares', 'kashi'],
  mysuru: ['mysore'], 'khyber-pakhtunkhwa': ['kpk', 'nwfp'], 'gilgit-baltistan': ['gilgit'], 'jammu-and-kashmir': ['kashmir', 'jammu kashmir'], delhi: ['new delhi'], odisha: ['orissa'],
};
const ZONES = {
  india: {
    north: 'delhi uttar-pradesh punjab haryana himachal-pradesh uttarakhand jammu-and-kashmir ladakh chandigarh rajasthan',
    south: 'tamil-nadu karnataka kerala telangana andhra-pradesh puducherry',
    east: 'west-bengal odisha bihar jharkhand', west: 'gujarat maharashtra goa rajasthan', central: 'madhya-pradesh chhattisgarh',
    northeast: 'assam sikkim manipur meghalaya mizoram nagaland tripura arunachal-pradesh',
  },
  pakistan: { north: 'gilgit-baltistan khyber-pakhtunkhwa islamabad', south: 'sindh', west: 'balochistan', east: 'punjab' },
};
const ZONE_SYN = { north: 'north|northern', south: 'south|southern', east: 'east|eastern', west: 'west|western', central: 'central|centre|center', northeast: 'northeast|north east|north eastern' };
const DOMAIN_FROM = {
  sports: 'cricketer athlete', music: 'singer musician qawwali', politics: 'politician prime-minister president freedom-fighter',
  cinema: 'actor filmmaker bollywood', literature: 'poet writer', science: 'scientist physicist mathematician astronaut',
  religious: 'spiritual-leader', architecture: 'building',
};
const HINT_GROUP_OF_ZONE = 'region';

/* ------------------------------------------------------------------ build records */
function build(raw) {
  const rec = { ...raw, names: [], set: null };
  rec.names = [raw.n, ...(raw.al || [])].map(plain);
  const set = new Set(raw.tags);
  set.add(raw.type); set.add(raw.c); set.add('famous'); set.add('south-asia');
  const slugs = String(raw.type === 'person' ? raw.from : raw.loc).split(',').map(slug).filter(Boolean);
  slugs.forEach((s) => set.add(s));
  const zs = ZONES[raw.c] || {};
  for (const [z, list] of Object.entries(zs)) if (list.split(' ').some((s) => slugs.includes(s))) set.add(z);
  if (raw.type === 'person') {
    set.add(raw.g === 'f' ? 'female' : 'male');
    set.add(raw.d == null ? 'alive' : 'dead');
    if (raw.d != null && raw.b < 1920) set.add('historical');
    if (raw.b < 600) set.add('ancient'); else if (raw.b < 1750) set.add('medieval'); else if (raw.b < 1947) set.add('colonial'); else set.add('modern');
  } else if (['ancient', 'medieval', 'colonial'].some((t) => set.has(t))) set.add('historical');
  for (const [dom, from] of Object.entries(DOMAIN_FROM)) if (from.split(' ').some((t) => set.has(t))) set.add(dom);
  if (set.has('bollywood')) set.add('cinema');
  rec.set = set; rec.slugs = slugs;
  return rec;
}
const RECORDS = [...PEOPLE, ...PLACES].map(build);
const NAME_SET = new Set(RECORDS.flatMap((r) => r.names.filter((n) => n.length >= 3)));

/* ------------------------------------------------------------------ phrase table */
const GROUP = {};
const PHRASES = [];
const addPhrase = (tag, group, list) => {
  GROUP[tag] = group;
  for (const p of list) { const ph = plain(p); if (ph) PHRASES.push([ph, tag]); }
};
for (const [tag, [group, syn]] of Object.entries(VOCAB)) addPhrase(tag, group, [tag.replace(/-/g, ' '), ...syn.split('|')]);
const regionSlugs = new Set([...RECORDS.flatMap((r) => r.slugs), ...EXTRA_REGIONS.map(slug)]);
for (const s of regionSlugs) { if (!KNOWN_TAGS.has(s)) addPhrase(s, HINT_GROUP_OF_ZONE, [s.replace(/-/g, ' '), ...(REGION_ALIAS[s] || [])]); }
for (const [z, syn] of Object.entries(ZONE_SYN)) addPhrase(z, HINT_GROUP_OF_ZONE, syn.split('|'));
PHRASES.sort((a, b) => b[0].length - a[0].length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PHRASE_RE = PHRASES.map(([ph, tag]) => [new RegExp(`(?<= )${esc(ph)}(?:s|es)?(?= )`, 'g'), tag]);

/* ------------------------------------------------------------------ parsing */
const VERB = '(?:born|birth|died|death|die|built|constructed|completed|established|founded|opened|erected|created|formed)';
const OPS = '(?:in|before|after|since|until|by|during)';
const RE_CENT = new RegExp(`(?: (${VERB}))? (${OPS}) (?:the )?(\\d{1,2})(?:st|nd|rd|th) century(?: (bc|bce))?(?= )`, 'g');
const RE_YEAR = new RegExp(`(?: (${VERB}))? (${OPS}) (?:the )?(?:year )?(\\d{3,4})(s)?(?: (bc|bce))?(?= )`, 'g');
const RE_INDEP = new RegExp(`(?: (${VERB}))? (before|after|since|during|in|by) (?:the )?(?:indian |pakistani )?(?:independence|partition)(?= )`, 'g');
const subjOf = (v) => (!v ? 'any' : /^(born|birth)$/.test(v) ? 'birth' : /^(died|death|die)$/.test(v) ? 'death' : 'built');
const NEG = /\b(not|isnt|arent|wasnt|werent|doesnt|didnt|dont|never|cannot|cant)\b/;

/** parse(question) -> { preds, neg, or, text } ; preds: {k:'tag',tag} | {k:'year',...} | {k:'age',...} | {k:'letter',ch} */
function parse(input) {
  const original = plain(input);
  let t = ` ${original} `;
  const stray = (/\b(born|birth)\b/.test(t) && 'birth') || (/\b(died|death|die)\b/.test(t) && 'death') || (/\b(built|constructed|completed|established|founded|opened|erected)\b/.test(t) && 'built') || 'any';
  const preds = [];
  t = t.replace(/ prior to /g, ' before ').replace(/ earlier than /g, ' before ').replace(/ later than /g, ' after ');
  t = t.replace(/ (older than|more than|over|at least) (\d{1,4}) years?(?: old)? /g, (_, w, n) => { preds.push({ k: 'age', op: 'gt', n: +n }); return ' '; });
  t = t.replace(/ (younger than|less than|under|at most) (\d{1,4}) years?(?: old)? /g, (_, w, n) => { preds.push({ k: 'age', op: 'lt', n: +n }); return ' '; });
  t = t.replace(/ (?:start|starts|begin|begins) with (?:the )?(?:letter )?([a-z]) /g, (_, ch) => { preds.push({ k: 'letter', ch }); return ' '; });
  t = t.replace(RE_CENT, (_, v, op, n, bc) => {
    n = +n; const lo = bc ? -n * 100 : (n - 1) * 100 + 1, hi = bc ? -((n - 1) * 100 + 1) : n * 100;
    preds.push({ k: 'year', op, lo, hi, subj: v ? subjOf(v) : stray }); return ' ';
  });
  t = t.replace(RE_INDEP, (_, v, op) => { preds.push({ k: 'year', op, lo: 1947, hi: 1947, subj: v ? subjOf(v) : stray }); return ' '; });
  t = t.replace(RE_YEAR, (_, v, op, y, s, bc) => {
    y = +y; if (bc) y = -y;
    const hi = s && !bc ? (y % 100 === 0 ? y + 99 : y + 9) : y;
    preds.push({ k: 'year', op, lo: y, hi, subj: v ? subjOf(v) : stray }); return ' ';
  });
  const tags = [];
  for (const [re, tag] of PHRASE_RE) {
    re.lastIndex = 0;
    if (re.test(` ${t.trim()} `.replace(/\s+/g, ' '))) { /* cheap pre-check */ }
    t = t.replace(re, () => { if (!tags.includes(tag)) tags.push(tag); return ' '; });
  }
  tags.forEach((tag) => preds.push({ k: 'tag', tag }));
  return { preds, neg: NEG.test(original), or: /\bor\b/.test(original) && tags.length >= 2, text: original };
}

/* ------------------------------------------------------------------ evaluation */
function yearOf(rec, subj) {
  const built = () => (rec.y == null ? (rec.set.has('natural') ? false : undefined) : rec.y);
  if (subj === 'death') return rec.type === 'person' ? (rec.d == null ? false : rec.d) : false;
  if (subj === 'birth') return rec.type === 'person' ? rec.b : false;
  if (subj === 'built') return rec.type === 'place' ? built() : false;
  return rec.type === 'person' ? rec.b : built();
}
function evalPred(rec, p) {
  if (p.k === 'tag') return rec.set.has(p.tag);
  if (p.k === 'letter') return plain(rec.n)[0] === p.ch;
  if (p.k === 'age') {
    if (rec.type !== 'place' || rec.y == null) return undefined;
    const age = NOW - rec.y; return p.op === 'gt' ? age > p.n : age < p.n;
  }
  const v = yearOf(rec, p.subj);
  if (v === undefined || v === false) return v;
  switch (p.op) {
    case 'before': return v < p.lo;
    case 'after': return v > p.hi;
    case 'since': return v >= p.lo;
    case 'until': case 'by': return v <= p.hi;
    default: return v >= p.lo && v <= p.hi;
  }
}
const combine = (vals, or) => {
  if (or) return vals.includes(true) ? true : vals.includes(undefined) ? undefined : false;
  return vals.includes(false) ? false : vals.includes(undefined) ? undefined : true;
};
const LEAD = /^(is|was|are|were|could|can|does|did|would|will)\s+(it|this|that|he|she|they|the answer|the secret|the person|the place)\s+(be\s+)?/;
function guessLike(q) {
  const s = plain(q).replace(LEAD, '').replace(/^(a|an|the)\s+/, '').replace(/\s+(the answer|the secret)$/, '');
  return NAME_SET.has(s);
}
const UNCLEAR = 'I can\u2019t answer that. Try asking about the type (person/place), country, gender, alive or not, profession, kind of place, state or city, era, or years (e.g. "born before 1950").';

/** answer(record, question) -> { a: 'Yes'|'No'|'Unclear', note? } */
function answer(rec, question) {
  if (!plain(question)) return { a: 'Unclear', note: UNCLEAR };
  if (guessLike(question)) return { a: 'Unclear', note: 'That sounds like a guess \u2014 use the Guess box. (This did not use up a question.)' };
  const p = parse(question);
  if (!p.preds.length) return { a: 'Unclear', note: UNCLEAR };
  const r = combine(p.preds.map((x) => evalPred(rec, x)), p.or);
  if (r === undefined) return { a: 'Unclear', note: 'I can\u2019t say for sure about that one. Try a different angle.' };
  return { a: (p.neg ? !r : r) ? 'Yes' : 'No' };
}

/* ------------------------------------------------------------------ guess judging */
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function judge(rec, guess) {
  const g = plain(guess).replace(/^(the|a|an)\s+/, '');
  if (!g) return false;
  return rec.names.some((n) => {
    const nn = n.replace(/^(the|a|an)\s+/, '');
    const tol = nn.length >= 10 ? 2 : nn.length >= 5 ? 1 : 0;
    return g === nn || lev(g, nn) <= tol;
  });
}

/* ------------------------------------------------------------------ hints, clues, facts */
const HINT_TEXT = {
  type: () => 'Try asking whether it is a person or a place.',
  country: () => 'Try asking which country it is linked to \u2014 India or Pakistan.',
  life: (r) => (r.type === 'person' ? 'Try asking whether the person is alive, or when they were born.' : 'Try asking whether it is natural or man-made, or how old it is.'),
  field: (r) => (r.type === 'person' ? 'Try asking about their field \u2014 sports, politics, music, cinema, science, writing or something else.' : 'Try asking what kind of place it is \u2014 a fort, temple, mosque, tomb, mountain, lake, city\u2026'),
  region: () => 'Try asking about the state, province or city \u2014 or whether it is in the north, south, east or west.',
  extra: (r) => (r.type === 'person' ? 'Try asking about a famous award or achievement, like an Olympic medal or the Nobel Prize.' : 'Try asking whether it is a UNESCO World Heritage Site, or who built it.'),
};
function hint(rec, asked) {
  const covered = new Set();
  for (const q of asked || []) for (const p of parse(q).preds) covered.add(p.k === 'tag' ? GROUP[p.tag] : p.k === 'letter' ? 'x' : 'life');
  const order = ['type', 'country', 'life', 'field', 'region', 'extra'];
  const next = order.find((g) => !covered.has(g)) || 'extra';
  return HINT_TEXT[next](rec);
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const labelOf = (tag) => ({ unesco: 'UNESCO site', 'south-asia': 'South Asia', 'man-made': 'Man-made' }[tag] || cap(tag.replace(/-/g, ' ')));
/** clues(log) -> [{tag,label,ok}] from single-fact questions already answered Yes/No */
function clues(log) {
  const out = new Map();
  for (const l of log || []) {
    if (l.g || l.h || l.u || (l.a !== 'Yes' && l.a !== 'No')) continue;
    const p = parse(l.q);
    if (p.preds.length !== 1 || p.preds[0].k !== 'tag' || p.neg || p.or) continue;
    const tag = p.preds[0].tag; out.set(tag, { tag, label: labelOf(tag), ok: l.a === 'Yes' });
  }
  return [...out.values()];
}
const fmtYear = (y) => (y < 0 ? `${-y} BCE` : String(y));
function facts(rec) {
  const f = [['Type', rec.type === 'person' ? 'Person' : 'Place'], ['Country', cap(rec.c)]];
  if (rec.type === 'person') {
    f.push(['Born', `${fmtYear(rec.b)} \u00b7 ${rec.from}`], ['Status', rec.d == null ? 'Alive' : `Died ${fmtYear(rec.d)}`]);
    f.push(['Known for', rec.tags.map(labelOf).join(', ')]);
  } else {
    f.push(['Location', rec.loc]);
    if (rec.y != null) f.push([rec.set.has('natural') ? 'Formed' : 'Built', `c. ${fmtYear(rec.y)}`]);
    f.push(['Kind', rec.tags.filter((t) => GROUP[t] === 'field' || t === 'natural' || t === 'man-made').map(labelOf).join(', ')]);
    f.push(['UNESCO site', rec.set.has('unesco') ? 'Yes' : 'No']);
  }
  return f;
}

/* ------------------------------------------------------------------ picking a secret */
const LV = { easy: 1, medium: 2, hard: 3 };
/** pick({topic:any|person|place, country:both|india|pakistan, difficulty:any|easy|medium|hard}, usedNames) */
function pick(opts = {}, used = []) {
  const o = { topic: 'any', country: 'both', difficulty: 'any', ...opts };
  let pool = RECORDS.filter((r) => (o.topic === 'any' || r.type === o.topic) && (o.country === 'both' || r.c === o.country) && (o.difficulty === 'any' || r.lv === LV[o.difficulty]));
  if (!pool.length) pool = RECORDS.filter((r) => (o.topic === 'any' || r.type === o.topic) && (o.country === 'both' || r.c === o.country));
  const fresh = pool.filter((r) => !used.includes(r.n));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}
const label = (o = {}) => {
  const t = { any: 'People & places', person: 'People', place: 'Places' }[o.topic || 'any'];
  const c = { both: 'India & Pakistan', india: 'India', pakistan: 'Pakistan' }[o.country || 'both'];
  const d = o.difficulty && o.difficulty !== 'any' ? ` \u00b7 ${cap(o.difficulty)}` : '';
  return `${t} \u00b7 ${c}${d}`;
};
const size = () => ({ people: PEOPLE.length, places: PLACES.length, total: RECORDS.length });

module.exports = { pick, answer, judge, hint, clues, facts, label, parse, plain, size, RECORDS, KNOWN_TAGS, GROUP };
