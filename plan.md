# Kasoti — Project Plan & Execution

> Companion to [`projectoverview.md`](projectoverview.md) (what the code does). This file tracks **what we planned, what is done, what is next**.
> Update the status tables whenever work lands; if behaviour changes, update `projectoverview.md` in the same change.
> Status legend: ✅ done & covered by tests · 🟡 done, needs manual QA in real browsers · ⬜ planned

## 1. Goal and scope

Build a lightweight, no-sign-up web game where a team (or one player) finds a hidden famous name by asking yes/no questions.

**In scope:** friends mode (hosted rooms, teams, turns, chat) and an offline AI Keeper for famous people/places of India & Pakistan.
**Out of scope (for now):** accounts/persistence, matchmaking, a database, native apps, other regions/languages, moderation tooling.

**Constraints:** plain Node + one dependency (`ws`), single-file client without a build step, deployable on a free host, **no paid or external AI service**.

## 2. Architecture decisions

| # | Decision | Why |
|---|---|---|
| D1 | Standalone Node server + WebSocket instead of a claude.ai artifact | Guests had to be signed in to claude.ai; a standalone server lets anyone join with a link. |
| D2 | Server is authoritative; the client only renders `view()` | The secret never reaches Seekers; rules cannot be bypassed from the browser. |
| D3 | In-memory rooms, no database or accounts | Simplest hosting; games are short-lived. Host accounts were removed on request. |
| D4 | Single `index.html` with one `draw()` re-render from state | No build tooling; easy to read and to test with a fake DOM. |
| D5 | **AI Keeper is an offline rules engine over a curated data set** (replaces the earlier LLM integration) | No API key/cost/rate limits, deterministic, works offline. The LLM path also had a failure mode where a question vanished when the service errored/timed out; the engine answers locally and **never deletes log entries**. |
| D6 | Unknown/vague AI questions answer **Unclear and are free** | Better than guessing Yes/No; players aren't penalised for phrasing the engine can't read. |
| D7 | A guess is final (wrong guess ends the round) | Keeps tension; the answerer/AI gives the verdict. |
| D8 | Data records use a closed tag vocabulary checked by a validator | Prevents typos silently turning into wrong "No" answers. |

## 3. Roadmap and execution status

### Phase 1 — Core game (friends)
| Item | Status |
|---|---|
| Standalone server, rooms with code + invite link, no sign-up | ✅ |
| Teams (Seekers/Keepers), pick team before joining, confirm & lock, host starts as Keeper | ✅ |
| Secret set only by confirmed Keepers; hidden from Seekers (masked with View button) | ✅ |
| Countdown, timer in fixed top bar, 15/20 questions, hints (3, after 10 questions), final guess with answerer verdict | ✅ |
| One question at a time, answer editable for the latest question | ✅ |
| Turn rotation among Seekers, pass, host-only turn assignment, typing indicator + switch lock | ✅ |
| New rounds: swap sides / shuffle, re-confirm teams, chats reset | ✅ |

### Phase 2 — Social & polish
| Item | Status |
|---|---|
| Global + private team chat, unread badges, toast + beep, one-icon reactions with animation | 🟡 |
| Winner/loser pop-ups (confetti, poppers, jingle / funny rain), time alerts every 5 min | 🟡 |
| Leave game, host End game, remove players, invite & rules modals, collapsible/docked chat | 🟡 |
| UI pass: larger type, separated cards, team colours, side roster during play | 🟡 |

### Phase 3 — Play with AI
| Item | Status |
|---|---|
| ~~LLM-based keeper~~ — removed (see D5) | ✅ removed |
| Knowledge base: 61 people + 53 places (India & Pakistan) with level, aliases, facts | ✅ |
| Question engine: tags, regions/zones, years/centuries/ages, first letter, NOT/OR, guess-like detection | ✅ |
| Guess judging with aliases + typo tolerance; hints by uncovered topic; clue board; fact sheet at the end | ✅ |
| AI setup screen (topic, country, difficulty, time), suggestion chips, Unclear = free + note | 🟡 |
| Fix: question disappearing after Enter in AI mode (root cause: failure path deleted the entry) | ✅ |

### Phase 4 — Quality & docs
| Item | Status |
|---|---|
| Data validator (`npm run validate`) | ✅ |
| Engine, server and client-render tests (`npm test`, 18 tests) | ✅ |
| `projectoverview.md`, `plan.md`, `README.md` kept in sync with the code | ✅ |
| Manual QA on real devices (see checklist in `projectoverview.md` §6) | ⬜ |

## 4. Quality plan

* **Every change:** `npm test` must pass (data validation → engine → server protocol → client rendering).
* **Adding data:** append the record, run `npm run validate`, add an engine test if it introduces a new question type or tag.
* **Changing the protocol:** update `view()`/handlers in `server.js`, the client, the protocol table and the state-field list in `projectoverview.md`, and a test.
* **Release check:** manual checklist (two-device friends round, AI round on phone, reconnect after refresh), then deploy.

## 5. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Players phrase questions the engine can't parse | Many "Unclear" answers, frustration | Suggestion chips, clue board, free Unclear answers with guidance; backlog item to log unclear questions and extend patterns. |
| Wrong/missing facts in the data set (missing tag ⇒ "No") | Wrong answers | Closed vocabulary + validator; only add facts that are certain; level/aliases reviewed. |
| Small data set → repeats | Boredom | Repeat avoidance within a session; backlog: grow to 300+ records. |
| In-memory state lost on restart/sleep (free hosts) | Games end | Documented; players can start a new game; backlog: optional persistence. |
| Abuse (spam rooms/chat) | Resource use | Caps on players, chat length/history, AI rooms; backlog: rate limiting. |
| Dishonest answerer in friends mode | Unfair game | Accepted trust model; AI mode is automatic. |
| UI untested on real browsers by automation | Visual bugs | Fake-DOM render tests catch crashes only → manual QA phase. |

## 6. Backlog (not started)

1. Grow the data set (more cities, athletes, scientists, artists, monuments; aim 300+) and add a "difficulty review".
2. Log unanswered/Unclear questions server-side (anonymously) to guide new patterns and synonyms.
3. Allow a last guess after the question limit; optional "survival" mode with streak/score history.
4. Mute toggle for sounds; accessibility pass (focus order, ARIA labels, reduced-motion).
5. Rate limiting and basic abuse controls; optional persistence (e.g. file/Redis) for rooms.
6. Localisation (Urdu/Hindi UI), more regions.
7. CI (GitHub Actions running `npm test`) and linting.
8. Friends mode: let a team vote on the answer; spectator mode.

## 7. Change log

| Version | Summary |
|---|---|
| 0.x | Prototype as a claude.ai artifact (shared state via room API) — dropped (D1). |
| 1.0 | Standalone server, host/guest flow without accounts, teams, countdown, hints, chat. |
| 1.x | Confirm-team flow, keeper-only secret, one question at a time, editable answers, turn rotation, typing lock, leave/kick/end game, time alerts, reaction picker, redesigned UI. |
| 1.9 | Experimental AI mode backed by an external LLM (later removed — D5). |
| **2.0** | **Offline AI Keeper** over a curated India/Pakistan data set; AI setup screen, suggestion chips, clue board, fact sheet, free "Unclear" answers; docs + validator + 18 tests. |

## 8. How to keep these docs current

1. Touch code → run `npm test`.
2. If it changes rules, UI flow, protocol, data format, limits or tests → edit the matching section of `projectoverview.md`.
3. Move items between "Done / Planned" tables here and add a line to the change log.
4. Counts (records, tests, tags) quoted in the docs come from `npm test` / `npm run validate` output — refresh them when they change.
