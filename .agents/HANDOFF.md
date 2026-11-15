# DevFest Lagos Connect — handoff

The owner's taste, decisions already made, and how to ship. Keep it up to date: when a decision is made or something non-obvious is learned, add it here in the same commit.

## How to work with the owner (Haruna)

- Be extremely concise in chat, even at the cost of grammar. Plain words, short sentences.
- Be expressive and thorough only when asked to explain something.
- When writing anything Haruna will send or submit as themself (applications, emails, posts), ignore the brevity rule. Write full, natural sentences that sound like a real person. Avoid lists of three, "X. But Y." contrasts, colon-led lists and semicolons unless the content needs them. Only use facts Haruna gave.
- Act, don't over-ask. When a request is clear, build it, verify it, deploy it, push it, then report briefly.
- Don't re-litigate decisions listed below. Suggest changes only with a reason.
- Haruna tests on real phones and cares a lot about native feel, polish and not overwhelming people. Every UI change should feel lighter, not heavier.
- Report honestly: what was verified, what wasn't, what's left.

## What this is

A PWA for people physically at DevFest Lagos (Landmark Event Centre, Oniru, Lagos). It shows who's around you, introduces you to people you should meet and why, and lets you message them to find each other.

- Live: https://devfestlagos-connect.harunafaruk.com (also devfestlagos-connect.hfdev.workers.dev)
- Repo: https://github.com/Haruna2004/devfestlagos-connect (public, MIT)
- Sibling project with the same codebase and Moonshot branding: https://github.com/Haruna2004/moonshot-connect

## Product decisions (settled)

- **GPS only.** Browser geolocation, 15–50m indoors. No QR zones (too many places to put them), no Bluetooth (no Web Bluetooth on iOS). Precision gap is closed by design: clear photo, free-text "find me" note, and messages.
- **Ultrasonic proximity** was explored as research in a separate project. Not part of this app unless it's proven on real phones.
- **No login.** First open creates a public `id` + private `secret` (localStorage). Server stores only SHA-256 of the secret. A "login link" (`/#k=<id>.<secret>`) moves the card to another phone or into the installed app.
- **Privacy.** Never send anyone's coordinates to another client. Never store locations in D1. Live positions live in the event room (below); outside the venue radius you're dropped. People drop off lists 10 min after their last ping. Never log message contents.
- **Event room (Durable Object `EventRoom`, `worker/room.ts`).** One room per event (`idFromName("event")`, `locationHint: "afr"`). Pings go Worker → room: zero D1 writes per ping. The room caches profiles/blocks/unread from D1 and the API calls `forget`/`remove`/`setUnread`/`bumpUnread` when those change. Cloudflare evicts idle DOs within seconds (memory wiped), so the room also copies positions to its own SQLite storage, throttled to once a minute per person or after a 10m move, and reloads them on start. Deleted on leave/stale.
- **Payload.** Each ping returns your nearest 30 (`people`), a count of the rest (`more`), up to 5 intros from the whole venue (`intros`, full objects), and `unread`. Search (`GET /api/me/search?q=`) runs in the room over everyone present.
- **Distance UX (`shared/presence.ts`, `src/components/format.ts`).** No fake-precise metres. Bands in words: `steps` "A few steps away" (≤20m and combined GPS uncertainty ≤30m), `near` "Nearby" (≤60m), `walk` "Short walk · ~N min" (≤150m, 80m/min), `venue` "Elsewhere at the venue". Positions are smoothed over the last 3 fixes (90s), weighted by accuracy. Hysteresis: a person only changes band once 8m past the line. Profile sheet shows an honest range ("about 20–50m away") + freshness ("here now" / "seen N min ago"); people not heard from in 2 min fade. Rows lead with the "find me" note; distance is a small grey hint. GPS chip says Good/Rough/Weak; weak shows a tip. Radar rings are labelled steps/nearby/walk; venue-band people aren't drawn.
- **Light up (`src/components/LightUp.tsx`).** For the last few metres: full-screen colour + your first name, wake lock on. Both phones pick the same colour from the sorted pair of ids, no server needed. Button sends "I'm holding up a <colour> screen…" to the other person. Offered in the sheet (steps/near) and in chat.
- **Venue gate.** `VENUE_RADIUS_M` in `wrangler.jsonc`. Currently `"250"` (locked to Landmark). Set `"0"` for demos/testing anywhere. Server adds up to 200m slack for bad GPS.
- **Polling, not WebSockets (yet).** Ping every 20s while the app is open and visible. The event room makes WebSockets with hibernation the natural next step. Chat polls every 4s while open. Inbox every 8s while open. No push notifications (yet).
- **Matching** combines four things per person: `tags` (what you are), `lookingFor` (goal, the verb), `skills` (what you work with), `wantsSkills` (skills you're after, the noun). Goal + skill makes specific reasons ("Chioma is hiring for Kubernetes and Go, and you know both"). Rare skills in the room weigh more. Score ≥ 4 = intro. Reasons are always written to the viewer, use first names, never he/she.
- **Light onboarding.** Creating a card asks only photo, name and "I am". Everything else comes later through a one-question-per-screen "Get better intros" flow (skills → goals + follow-up "Hiring for which skills?" → find me → about), opened from a single progress card on Nearby. Every step is skippable.
- **Install prompt** never on the landing page. Shown once after a first good moment (an intro pop-up or leaving a chat). On iOS it copies the login link first because the installed app doesn't share Safari's storage; the installed app's welcome screen offers "Restore my card".
- **Share Connect** opens a sheet (`src/components/ShareSheet.tsx`) with a QR code of the app URL, the URL itself, Copy and Share. Big button in the empty state; small underlined link under the list once people are around. QR via `qrcode-generator`, drawn as SVG.
- **Intro cards** ("You should meet") disappear after Say hi or the X. Stored per phone in `connect.introsHidden`. They stay in the main list.
- **Intro pop-ups**: at most one per 2 min, once per person, only for people within ~100m.
- **Messaging**: text only, 500 chars, 20/min per sender, block works both ways (hidden from each other, can't message). Deleting a card deletes its messages and blocks.

## Design system (match devfestlagos.com)

- Colours (`src/index.css` `@theme`): paper `#FFF5D4` background, card `#FFFAEA`, ink `#171717`, muted `#6B665C`, amber `#F9AB00` (highlight, intros), flame `#F04E23` (section blocks, distances), Google blue/red/yellow/green as small accents only.
- Fonts: **Faculty Glyphic** for headings (`font-display`), **Geist** for everything else. Loaded from Google Fonts in `index.html`.
- **Square edges everywhere.** No rounded corners except the radar disc/rings. Borders are `border-2 border-ink`. Depth comes from hard offset shadows: `pop` (4px) and `pop-sm` (2px). `press` nudges 2px on tap.
- Every screen starts with the black `TopBar` (four Google-colour squares + "DevFest Lagos **Connect**").
- Nearby header: big Faculty Glyphic count with the number in amber, then the amber half-disc radar with square avatars.
- Avatars are square with an ink border; initials fall back to a Google colour.
- Copy: short, plain, friendly. Buttons say what happens ("Say hi", "Show me who's around").
- Phone first (test at 393×852). Respect safe areas (`pt-safe`, `pb-safe`). 16px inputs so iOS doesn't zoom.

## Code map

```
shared/event.ts    event name, venue name, ROLE_TAGS, LOOKING_FOR
shared/skills.ts   skill catalog, role → suggestions, normalize/search
shared/match.ts    matching rules + rarity (pure functions)
shared/types.ts    types shared by app and Worker
shared/presence.ts distance bands, smoothing, hysteresis, ranges (pure)
worker/index.ts    API (Hono): auth, profile, photo, threads, messages, blocks; forwards ping/search to the room
worker/room.ts     EventRoom Durable Object: live presence, nearest-30, intros, search
worker/common.ts   Env, Row, profile mapping, room() helper
migrations/        D1 schema. Add a new numbered file, never edit old ones
src/App.tsx        app shell: tabs, chat/boost/edit overlays, intro pop-up, install sheet
src/screens/       Welcome, ProfileForm (create = basics, edit = full), Boost, Nearby, Messages, Chat, Me, PublicProfile
src/components/    Brand(TopBar), Avatar, Chips, SkillPicker, Radar, PersonSheet, InstallSheet, LightUp, format, icons
src/lib/           api, useNearby (GPS + ping loop), strength (boost steps), hiddenIntros, install, image
```

API (all under `/api`, auth = `Authorization: Bearer <id>.<secret>`): `POST /me` (create), `GET|PATCH|DELETE /me`, `PUT /me/photo`, `POST /me/ping` → `{atVenue, venueDistance, people, intros, unread}`, `GET /me/threads`, `GET|POST /me/messages/:other`, `PUT|DELETE /me/blocks/:other`, public `GET /users/:id`, photos at `/photos/*` from R2.

`POST /me/ping` and `GET /me/search` are forwarded to the event room. Everything else hits D1 directly.

## Commands

```
npm install
npm run db:local          # apply migrations to local D1
echo 'VENUE_RADIUS_M="0"' > .dev.vars
npm run dev               # Vite + Worker together
npm run typecheck
npm run db:remote         # only when a new migration was added; run BEFORE deploy
npm run deploy            # builds then deploys. NEVER run plain `wrangler deploy` (it uploads the stale build)
```

Cloudflare auth in remote/cloud sessions comes from env vars `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (already set there). Never commit tokens.

Resources: Worker `devfestlagos-connect`, D1 `devfestlagos-connect` (id in `wrangler.jsonc`), R2 `devfestlagos-connect-photos`, custom domain `devfestlagos-connect.harunafaruk.com`.

## How to verify a change

1. `npm run typecheck` (also runs in CI on every push/PR).
2. API: run `npm run dev` and hit endpoints with curl. Create two cards, `PATCH` their tags/skills, ping both near `6.42312, 3.44535`, then ping again and check `people`/`more`/`intros`/`reasons`. Also test after 25s idle (room eviction) that people are still there. Clean up with `DELETE /api/me`.
3. UI: headless Chrome via `puppeteer-core` at 393×852, `isMobile`, geolocation permission + `setGeolocation`. Seed people through the API first. Look at the screenshots before claiming a UI change works.
   - Selector gotcha: Nearby has an input whose placeholder also starts with "Search skills". Use exact placeholders.
4. After deploy, smoke test the live domain with curl (create → ping → delete).
5. Commit with a clear message and push to `main`.

Commit messages end with:
```
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Known limits / backlog

- Server trusts client GPS. Someone could spoof being at the venue. Idea: an on-screen event code at the venue.
- No push notifications; messages arrive only while the app is open.
- No report flow yet (block exists).
- D1 is in Western Europe (~100ms extra from Lagos). Fine for 20s polling.
- Every ping is a Worker request + a room request. The free plan caps Workers at 100k requests/day (~35 min for 1,000 people), so a busy event needs Workers Paid ($5/mo). D1 is no longer hit per ping.
- Possible next: WebSockets via the room (instant arrivals + messages), push via Web Push, event code check, report button, "met" history/notes, admin view for organisers. Port these room/distance changes to moonshot-connect once approved.
