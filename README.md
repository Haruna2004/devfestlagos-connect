# DevFest Lagos Connect

See who's around you at DevFest Lagos, get intros to the people you should meet, and message them to find each other.

**Live:** https://devfestlagos-connect.harunafaruk.com

A community project, open to every DevFest volunteer and attendee who wants to help. Not an official Google or GDG product.

## What it does

- **Nearby.** Your phone shares its location while the app is open. You see who else is at the venue, closest first: right here (~30m), nearby (~100m), around the venue.
- **Intros.** You say what you are (Engineer, Recruiter…), what you work with (Go, Flutter, PyTorch, Fundraising…), what you're looking for (a job, mentors, a cofounder…) and which skills you're after. Connect combines them and tells you why to meet: *"Chioma is hiring for Kubernetes and Go, and you know both."* Rare skills in the room count more than common ones. When a strong match walks near you, you get a pop-up.
- **Light setup.** Making a card takes a name and a tap. Skills and goals come later, one short question at a time, from a "Get better intros" card.
- **Messages.** Text-only chat, so you can say "I'm by the Google booth, blue shirt" and actually find each other. Block works both ways.
- **No sign-up.** Open the link, make a card, done. A "login link" moves your card to another phone.
- **Private by default.** Nobody ever sees your coordinates, only a rounded distance. Your location is only stored while you're at the venue (it's cleared when you leave), and you drop off everyone's list 10 minutes after you close the app.

## How it works

```
Phone (React PWA)  ──HTTPS──►  Cloudflare Worker (Hono)  ──►  D1 (SQLite): users, messages, blocks
                                                          └──►  R2: profile photos
```

- Every 20s, while the app is open, the phone sends `POST /api/me/ping` with its location.
- The Worker saves it, works out who's near you, scores matches ([`shared/match.ts`](shared/match.ts)) and returns the list plus your unread count.
- Chat polls every 4s while a conversation is open. No WebSockets.
- Each phone gets a random `id` + `secret` on first open. The server only stores a hash of the secret.

## Project layout

```
shared/event.ts   ← event name, venue name, role + "looking for" options. Start here.
shared/match.ts   ← intro rules. Easy place to contribute.
shared/skills.ts  skill catalog + suggestions per role
shared/types.ts   types shared by app and API
worker/index.ts   the whole API
src/              React app (screens/, components/, lib/)
migrations/       D1 schema
```

## Run it locally

Needs Node 20+.

```
npm install
npm run db:local     # create the local database
npm run dev          # http://localhost:5173
```

`.dev.vars` isn't committed. Create it with `VENUE_RADIUS_M="0"` so the app works wherever you are:

```
echo 'VENUE_RADIUS_M="0"' > .dev.vars
```

Location needs HTTPS on phones, so test on a real phone through the deployed URL or a tunnel like `cloudflared tunnel --url http://localhost:5173`.

`npm run typecheck` and `npm run build` must pass before a PR.

## Use it for your own event

1. Edit [`shared/event.ts`](shared/event.ts) (name, venue, tags).
2. Edit the vars in [`wrangler.jsonc`](wrangler.jsonc): `VENUE_LAT`, `VENUE_LNG`, `VENUE_RADIUS_M`.
3. Change colours in [`src/index.css`](src/index.css) if you like.
4. Deploy to your own Cloudflare account:

```
npx wrangler login
npx wrangler d1 create <your-db-name>         # paste the id into wrangler.jsonc
npx wrangler r2 bucket create <your-bucket>   # put the name in wrangler.jsonc
# change "routes" in wrangler.jsonc to your domain, or delete it to use *.workers.dev
npm run db:remote
npm run deploy
```

Always deploy with `npm run deploy` (it builds first). Plain `wrangler deploy` uploads the last build.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues: new intro rules, accessibility, better empty states, translations.

## Known limits

- GPS indoors is rough (often 20m+ off). Photos, "find me" notes and messages do the last few metres.
- The server trusts the location the phone sends. Someone faking GPS could appear at the venue.
- Polling, not push. Messages arrive within a few seconds while the app is open, not when it's closed.

## License

[MIT](LICENSE)
