# Kasoti — Project Overview

> Keep this file in step with the code. If you change behaviour, the protocol, the data format or the tests,
> update the matching section here and the status table in [`plan.md`](plan.md) in the same change.
> Last verified against the code with `npm test` (18 tests passing).

## 1. What it is

**Kasoti** is a hidden-name guessing game (like "20 Questions") that runs in the browser.
One side holds a secret name — a famous person, historical figure, building or landmark — and the other side
must find it by asking **yes/no questions** (max 20) before the timer runs out.

| Mode | Who plays | Who answers |
|---|---|---|
| **Play with friends** | Two teams of real players. A host creates a game and shares a code/link. Guests join without an account. | The **Keepers** (a team) — one chosen *answerer* presses Yes/No. |
| **Play with AI** | One player (the Seeker). | The **AI Keeper**: a fully **offline** engine that knows famous people and places of **India and Pakistan** (no API, no key, no internet). |

Roles: **Seekers** (🔍, ask questions and guess) and **Keepers** (🎭, hold the secret and answer).
In friends mode the sides swap each round.

## 2. Quick start

```bash
npm install          # installs the only dependency: ws
npm start            # http://localhost:3000  (also prints a same-Wi-Fi address)
npm test             # validates the data set, then runs all tests
npm run validate     # data-set validation only
```

Requires Node.js 18+ (20+ recommended). Optional environment variables: `PORT` (default 3000),
`KASOTI_AI_DELAY=0` (answer instantly; used by tests — normally the AI "thinks" for ~0.5–0.9 s).

Deploying: any host that runs Node and supports WebSockets (e.g. Render free web service: build `npm install`, start `npm start`).
State is kept in memory, so a restart ends running games.

## 3. Game rules

### Friends mode
1. **Home → Play with friends → Host a new game** (enter a name). The host gets a **code + invite link** and starts as a **Keeper** (can switch before the game starts or go neutral).
2. **Guests** open the link (or choose *Join an existing game*), enter a name, see both teams with their members, pick **Seekers** or **Keepers**, and join (only possible while the lobby is open).
3. In the lobby each player must **🔒 Confirm team** (after that they cannot switch this round). The host can move/remove players, shuffle teams, and open **🔗 Invite** and **⚙️ Rules** (max questions 15/20, round time 1–60 min, which team seeks).
4. **Only confirmed Keepers** can save the **secret name**; Seekers (and a neutral host) never receive it.
5. Host presses **Start** (blocked until every non-host player with a team is confirmed and a secret is saved) → **12-second countdown** (host can skip/cancel) → round starts.
6. **Turns:** Seekers take turns, one question each, in join order. A Seeker with nothing to ask can **⏭ Pass**. Only the **host** can hand the turn to someone else. The next question can only be asked after the previous one is answered.
7. The Keepers' **answerer** presses Yes/No. The answer for the **latest** question can be changed until the next question is asked (shown as "(edited)").
8. **Hints:** unlock after **10 questions**; max **3** per round; the answerer replies with guidance on *what to ask* (quick-pick suggestions provided) or passes.
9. **Guess:** a guess is **final** — the answerer presses **✅ Right** (Seekers win) or **❌ Wrong** (round ends, secret revealed, Keepers win). Time up, or all questions used and answered → Keepers win.
10. End of round: result pop-up (🎉 confetti + jingle for winners, 😭 funny animation for losers) and the host chooses **New game · swap sides** or **shuffle teams**; chats are cleared and everyone re-confirms.
11. Extras: private **team chat** + **global chat** (collapsible, unread badges, toast + beep, one ☺ reaction picker, double-tap ❤️), typing indicator for Seekers (and the questioner can't be switched while typing), funny **time alerts every 5 minutes**, **Leave** (everyone) / **End game** and **Remove player** (host), hidden secret with a **👁 View** button for Keepers (auto-hides after 8 s).

### AI mode
1. **Home → Play with AI**; choose **People / Places / Surprise me**, **India / Pakistan / Both**, **difficulty** (Any/Easy/Medium/Hard) and **time** (5/10/15 min).
2. The server picks a secret from the built-in data set (avoiding repeats within the session) → **6-second countdown** (skippable) → play.
3. Ask up to **20 yes/no questions**. The AI answers **Yes / No** or **Unclear** (a question it cannot map to its facts, or one that is really a guess). **Unclear answers are free** — they don't count as a question and show a note.
4. UI helpers: suggested-question chips that adapt to what you've learned, and a **🧩 Clue board** of confirmed facts (✓ Indian, ✗ alive, …).
5. **Guess** any time. The AI judges it (aliases and small typos accepted). Correct → you win. Wrong → the round ends and the answer is revealed (**a wrong guess is final**).
6. **Hints** after 10 counted questions (3 max): the AI tells you *what kind of question to ask next* (type → country → life/era → field/kind → region → awards/UNESCO), choosing the first topic you haven't covered. Hints never contain the answer.
7. At the end you see the secret plus **fact sheet** (country, born/built, status, what it's known for, UNESCO…). **Play again** picks a new secret; **Give up** reveals it.

## 4. Code overview

```
kasoti/
├── server.js                 HTTP + WebSocket server and all game rules          (~150 lines)
├── engine.js                 Offline "AI Keeper": parse → evaluate → answer       (~360 lines)
├── data.js                   Knowledge base: 61 people, 53 places (India/Pakistan) (~150 lines)
├── index.html                Single-file client: HTML + CSS + JS (no build step)    (~280 lines)
├── scripts/validate-data.js  Data-set validator (run by `npm test`)
├── test/                     engine.test.js, server.test.js, client.test.js        (node:test)
├── package.json              scripts + the single dependency (ws)
├── README.md                 Short intro
├── projectoverview.md        This file
└── plan.md                   Project plan, execution status, backlog
```

### 4.1 `server.js`
Serves `index.html` for every HTTP request and handles one WebSocket message loop (`wss.on('connection')`).
Everything is in memory: `rooms: Map<code, room>`. Key pieces:

| Piece | Purpose |
|---|---|
| `view(r, pid)` | Builds the **per-player state** sent after every change. This is the privacy boundary: `secret` is only included for Keepers (or everyone once the round has ended); `typing` only for Seekers/host; `tchat` only for your own team. |
| `bcast(r)` | Sends each connected player their own `view`. |
| `end(r, seek, why, by)` | Finishes a round: sets the winner, updates `score`, builds `result` (adds `info` + `facts` in AI mode). |
| `check(r)` | Ends the round for the Keepers when all allowed questions are used **and** answered. |
| `used(r)` | Counts questions toward the limit (excludes guesses, hints and `Unclear` AI answers). |
| `nextAsker(r)` | Turn rotation among Seekers. |
| `aiStart / aiTurn` | AI mode: pick a secret via `engine.pick`; answer a question / judge a guess / write a hint via `engine` after a short "thinking" delay. |
| `setInterval` (1 s) | Countdown→playing, round timeout, typing expiry, room clean-up (6 h; AI rooms 2 h). `.unref()`'d so tests can exit. |

Limits: 50 players per room, chat message ≤ 300 chars (last 200 kept), max 200 concurrent AI rooms, hints max 3 and only after 10 questions, `maxQ` clamped to 10–20 (UI offers 15/20), time 1–60 min (AI 3–30).
`server.js` exports `{ server, rooms }` and only listens when run directly (`require.main === module`).

### 4.2 `engine.js` (the AI Keeper)
Pipeline for a question: `plain()` normalise → **guess-like?** → `parse()` → `evalPred()` per predicate → `combine()` → Yes/No/Unclear.

* **Vocabulary (`BASE`, `NEVER`)** — canonical tags (`cricketer`, `fort`, `unesco`, `freedom-fighter`, …), each with synonyms (`'cricketer|batsman|bowler|…'`) and a *hint group* (`type, country, life, kind, field, extra, region`). Region tags (states, provinces, cities) are generated from the data plus `EXTRA_REGIONS`, with aliases (Bombay→Mumbai, Allahabad→Prayagraj…). `NEVER` holds things no record has (e.g. `chef`, `airport`) so they get a firm "No".
* **Records** — `build()` turns raw data into records with a tag **set**: its own tags + type, country, gender, alive/dead, location slugs, direction zones (north/south/east/west/central/northeast), derived era tags (`ancient`, `medieval`, `colonial`, `modern`, `historical`) and domains (`sports`, `music`, `politics`, `cinema`, `literature`, `science`, `religious`, `architecture`).
* **`parse(q)`** → predicates: `tag`, `year` (born/died/built × before/after/in/since/until/by, years, decades like *1980s*, centuries like *19th century*, BCE, *independence/partition*=1947), `age` (*older than 300 years*), `letter` (*starts with the letter T*). Phrases are matched longest-first so "prime minister" wins over "minister". Negation (`not`, `isn't`, …) inverts; `or` between tags makes it an OR; otherwise predicates are AND-ed.
* **`answer(rec, q)`** → `{a:'Yes'|'No'|'Unclear', note?}`. A predicate can be `true`, `false` or `undefined` (unknown, e.g. "built before 1800?" for a city with no founding year). A definite `false` wins in AND; unknown ⇒ Unclear. A question that is just a name/alias ("Is it the Taj Mahal?") is **guess-like** → Unclear with a note to use the Guess box.
* **`judge(rec, guess)`** — matches the name or any alias after normalisation; allows 1 typo (names ≥5 chars) or 2 (≥10 chars) via Levenshtein distance.
* **`hint(rec, askedQuestions)`**, **`clues(log)`**, **`facts(rec)`**, **`pick(opts, usedNames)`**, **`label(opts)`** — see the file header.

Semantics worth knowing: `historical` = person who has died and was born before 1920 (or a place tagged ancient/medieval/colonial);
person eras derive from birth year (<600 ancient, <1750 medieval, <1947 colonial, otherwise modern); `colonial` places are those built under British rule; direction zones follow each country's own geography (Pakistan's Punjab is "east", India's Punjab is "north").

### 4.3 `data.js`
```js
P(name, aliases, country, gender, birthYear, deathYear|null, birthplace, 'tag tag …', level, info)   // people
L(name, aliases, country, year|null,        location,        'tag tag …', level, info)             // places
```
`level` 1/2/3 = easy/medium/hard (fame). Years are CE (negative = BCE). Current content:
**39 Indian + 22 Pakistani people**, **32 Indian + 21 Pakistani places**; 32 easy / 60 medium / 22 hard; 340 unique names/aliases; 113 vocabulary tags.
To add a record: append a `P(...)`/`L(...)` line, use only tags from `BASE` in `engine.js`, then run `npm run validate`.
Only add facts you are sure about — the engine treats a missing tag as "No".

### 4.4 `index.html` (client)
One file, no framework. A single `S` object holds the latest server state; `draw()` re-renders `#app` from `S` and a few local variables
(`home`, `peek`, `pick`, `modal`, `chatOpen`, `ctab`, `aiOpt`, …), then restores input values/focus and scroll positions.
Helper `tx(obj)` sends a message. Sections inside `draw()`: home & setup screens → lobby → countdown → playing (status card, clue board, Q&A box, "your turn" card) → result card, plus side roster, chat (docked ≥1100 px, floating otherwise), modals (invite, rules, menu) and the result pop-up (`syncResult`: confetti canvas, sounds, rain of emojis).
Reconnect: `sessionStorage` keeps `{code, pid, name}`; the socket auto-reconnects and re-joins.

## 5. WebSocket protocol (JSON)

**Server → client:** `state` (full per-player view), `peek` (team preview before joining), `err {e}`, `closed {e}` (game ended), `kicked`, `left`.

**Client → server** (all include `t`):

| `t` | Who | Meaning |
|---|---|---|
| `create {name}` | anyone | Host a friends game (host starts as Keeper, team B). |
| `createai {name, topic, country, difficulty, limit}` | anyone | Start an AI game (`topic`: any/person/place; `country`: both/india/pakistan; `difficulty`: any/easy/medium/hard). |
| `peek {code}` / `join {code,name,team,pid?}` | guest | Preview teams / join (only in lobby; `pid` = reconnect). |
| `myteam {team}` / `confirm` | player | Switch team (until confirmed; host always) / lock team. |
| `team {pid,team}`, `shuffle`, `rules {rules,asking}`, `asking {team}`, `start`, `skip`, `cancel`, `end`, `next {shuffle}`, `kick {pid}`, `endgame` | host | Lobby/round control. |
| `secret {secret}` | confirmed Keeper | Save secret (lobby only). |
| `role {role,pid}` | host (asker) / Keeper (answerer) | Assign turn / answerer. |
| `ask {text}`, `guess {text}`, `hint`, `pass`, `typing {on}` | current Seeker | Play. |
| `ans {i,a}`, `verdict {i,ok}`, `hintreply {i,text}`, `hintskip {i}` | answerer | Answer, judge a guess, reply to a hint. |
| `chat {scope,text}`, `react {scope,id,e}` | player | `scope`: `g` (global) or `t` (team). |
| `leave` | anyone | Leave (host leaving ends the game; AI game just closes). |

State fields: `code, you, host, hostId, phase (lobby|countdown|playing|ended), endsAt, cdEnds, log, result, asking, score, round, rules, used, secretSet, asker, answerer, ai, aiCat, clues, aiBusy, players[{id,name,team,ok}], secret?, typing?, chat, tchat`.
Log entries: question `{by,q,a,ed?,u?,note?}`, guess `{by,q,a,g:1}`, hint `{by,q,h:1,r?,s?}` (`u` = unclear/not counted, `ed` = edited, `s` = passed).

## 6. Validation

**Data validation — `npm run validate`** (`scripts/validate-data.js`, also the first step of `npm test`). Fails (exit 1) if any record has: missing/invalid country, gender, level or info (25–260 chars); an unknown tag (typo guard against `BASE`/`NEVER`); duplicate tags; a name or alias used by another record; invalid years (death before birth; born before 1900 without a death year); a place without a location, or without exactly one of `natural`/`man-made` (cities exempt); or fewer than 8 people/places per country, or fewer than 10 records per level.

**Automated tests — `npm test`** (`node:test`, no network, the `ws` package is stubbed):

| File | Covers |
|---|---|
| `test/engine.test.js` | Type/country/gender/alive; professions, regions, OR and NOT; years, centuries, ages, first letter; place kinds, builders, UNESCO; Unclear and guess-like questions; guess judging (aliases, typos); hints never leak the name; clue board; `pick` filters; fact sheets. |
| `test/server.test.js` | Friends: host is a Keeper, secret hidden from Seekers, confirm/secret rules, turn rotation, one question at a time, answer editing, host-only turn assignment, hints locked <10 questions, guess verdict, leave/kick/end game. AI: secret from the data set matching filters, Yes/No/Unclear, free unclear answers, clue board, wrong guess ends round with facts, hints after 10, right guess wins, play again, leave. |
| `test/client.test.js` | Runs the real `index.html` script in a fake DOM against real server states: every screen renders without `undefined/NaN/[object]`, secret not leaked to Seekers, AI mode hides friends-only controls and shows chips/clue board/facts. |

**Manual checklist** (not automated — needs real browsers): two devices on the invite link (join, confirm, chat, reactions, typing indicator); winner/loser pop-ups and sounds; mobile layout (chat drawer, nav bar); reconnect after refresh; AI round on a phone.

## 7. Known limitations

* The AI understands a **fixed set of question patterns** (see §3 AI mode and §4.2). Unknown phrasing → "Unclear" (free). Multi-clause questions mixing AND/OR may be misjudged.
* The knowledge base is small (114 records) and hand-written; a missing tag is treated as "No", so keep entries complete and accurate. Era/zone labels follow the conventions in §4.2 and are approximations.
* State is in memory only: a server restart ends all games; there is no database, login or persistence (host accounts were removed).
* A Keeper can mark a guess right/wrong dishonestly in friends mode (it relies on the answerer; AI mode is automatic).
* Rate limiting is minimal (caps only). Don't expose publicly without a reverse proxy if abuse is a concern.
* On the first AI question the player has to know to try the suggestion chips — unknown phrasing is the main source of "Unclear".
