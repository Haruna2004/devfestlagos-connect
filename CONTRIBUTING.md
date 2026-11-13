# Contributing

Thanks for helping. Any DevFest volunteer, attendee or curious dev is welcome.

## Quick start

1. Fork the repo and clone your fork.
2. `npm install && npm run db:local`
3. `echo 'VENUE_RADIUS_M="0"' > .dev.vars`
4. `npm run dev`

## Making a change

- Branch from `main`. One change per pull request.
- Keep the code in the style around it: TypeScript, small components, Tailwind classes, short comments only where the "why" isn't obvious.
- Run `npm run typecheck` and `npm run build` before you push. CI runs both.
- Changing the database? Add a new file in `migrations/` (never edit an old one).
- UI change? Add a phone-sized screenshot to the PR.

## Good places to start

- **Intro rules** in `shared/match.ts`. Each rule is a score, a test and a sentence. Add one, explain why in the PR.
- **Event config** in `shared/event.ts`. Tags and "looking for" options.
- **Accessibility.** Screen reader labels, focus order, contrast.
- **Empty and error states.** What people see when nobody's around or the network drops.

## Ground rules

- Privacy first. Never send another person's coordinates to the client. Never log message contents.
- No new tracking or analytics without discussion.
- Be kind in issues and reviews.

## Questions

Open an issue or start a discussion.
