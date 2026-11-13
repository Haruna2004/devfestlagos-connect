# DevFest Lagos Connect — working notes for Claude

Read this fully before doing anything. It carries the owner's taste, the decisions already made, and how to ship. Keep it up to date: when a decision is made or something non-obvious is learned, add it here in the same commit.

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
- **Privacy.** Never send anyone's coordinates to another client, only rounded distance (5m steps, min 5m). Location is stored only while inside the venue radius; outside it's nulled. People drop off lists 10 min after their last ping. Never log message contents.
- **Venue gate.** `VENUE_RADIUS_M` in `wrangler.jsonc`. Currently `"0"` (works anywhere, for demos/testing). Set `"250"` to lock to Landmark. Server adds up to 200m slack for bad GPS.
- **Polling, not WebSockets.** Ping every 20s while the app is open and visible. Chat polls every 4s while open. Inbox every 8s while open. No push notifications (yet).
- **Matching** combines four things per person: `tags` (what you are), `lookingFor` (goal, the verb), `skills` (what you work with), `wantsSkills` (skills you're after, the noun). Goal + skill makes specific reasons ("Chioma is hiring for Kubernetes and Go, and you know both"). Rare skills in the room weigh more. Score ≥ 4 = intro. Reasons are always written to the viewer, use first names, never he/she.
- **Light onboarding.** Creating a card asks only photo, name and "I am". Everything else comes later through a one-question-per-screen "Get better intros" flow (skills → goals + follow-up "Hiring for which skills?" → find me → about), opened from a single progress card on Nearby. Every step is skippable.
- **Install prompt** never on the landing page. Shown once after a first good moment (an intro pop-up or leaving a chat). On iOS it copies the login link first because the installed app doesn't share Safari's storage; the installed app's welcome screen offers "Restore my card".
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
worker/index.ts    whole API (Hono): auth, profile, photo, ping, threads, messages, blocks
migrations/        D1 schema. Add a new numbered file, never edit old ones
src/App.tsx        app shell: tabs, chat/boost/edit overlays, intro pop-up, install sheet
src/screens/       Welcome, ProfileForm (create = basics, edit = full), Boost, Nearby, Messages, Chat, Me, PublicProfile
src/components/    Brand(TopBar), Avatar, Chips, SkillPicker, Radar, PersonSheet, InstallSheet, icons
src/lib/           api, useNearby (GPS + ping loop), strength (boost steps), hiddenIntros, install, image
```

API (all under `/api`, auth = `Authorization: Bearer <id>.<secret>`): `POST /me` (create), `GET|PATCH|DELETE /me`, `PUT /me/photo`, `POST /me/ping` → `{atVenue, venueDistance, people, intros, unread}`, `GET /me/threads`, `GET|POST /me/messages/:other`, `PUT|DELETE /me/blocks/:other`, public `GET /users/:id`, photos at `/photos/*` from R2.

The ping reads everyone from an in-memory snapshot cached 8s per Worker isolate (one D1 query shared by many pings). New people can take up to 8s to appear.

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
2. API: run `npm run dev` and hit endpoints with curl. Create two cards, `PATCH` their tags/skills, ping both near `6.42312, 3.44535`, wait 9s (snapshot cache), ping again and check `people`/`reasons`/`intros`. Clean up with `DELETE /api/me`.
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
- Busy event = lots of D1 writes (one per ping). Needs Workers Paid ($5/mo) for a few hundred people.
- Possible next: push via Web Push, event code check, report button, "met" history/notes, admin view for organisers.
