# Garmin Time

Personal dashboard of real time spent on Garmin activities. Full spec: `docs/specification.md`.

## Commands
- `npm run dev` — dev server on **port 4000**
- `npm run dev:demo` — same, with generated demo activities and no Garmin login (`lib/data/demo.ts`, never in production)
- `npm run build` / `npm run lint` / `npm run typecheck`

## Conventions
- Next.js 16 App Router, RSC-first, Cache Components enabled. `proxy.ts` (not middleware). Next docs ship in `node_modules/next/dist/docs`.
- Mantine 9 for all UI; client components only for interactivity. A server component cannot pass `Link` as `component=` to a Mantine component: use `components/ButtonLink.tsx` (or a small client wrapper).
- UI copy in French, metric units, `fr-FR` formats.
- Sport categories and colors come only from `lib/sports.ts`; colors are CSS tokens in `app/globals.css` (`--sport-*`, `--zone-*`) validated with the dataviz skill in both themes. Render sports in `SPORT_CATEGORIES` order (never sorted by value), and label every colored mark with neutral text.
- Periods are relative to today: call `await connection()` before `parsePeriod()` in Server Components.
- Garmin data goes through `lib/data/*`. Recorded activities use `'use cache: private'`. Move IQ (`lib/data/moveiq.ts`) makes one `dailyEvents` call per day and caches each day on the server with `'use cache'`, keyed by profile id + date; the token is handed over through a module map and is never a cache argument.
- Move IQ events are `Activity` with `source: "moveiq"` (duration only). They count in time totals and sport filters, but not in activity counts or HR coverage, and are drawn hatched (`components/dashboard/texture.ts`). Their distance is estimated from the user's average speeds (`lib/prefs.ts`, cookie `gt_prefs`) and always labelled as estimated.
- Dev only: `/api/debug/daily-events?date=YYYY-MM-DD` shows Garmin's raw timeline next to the parsed Move IQ events.
- Garmin access stays server-only in `lib/garmin/`; tokens live only in the encrypted session cookie (iron-session), never logged or persisted.

## Skills (`.agents/skills`)
Use `next-best-practices` and `next-cache-components` for Next code, `vercel-react-best-practices` and `vercel-composition-patterns` for React, `ui-ux-pro-max` and `web-design-guidelines` for UI work, `typescript-advanced-types` for typing, `playwright-cli` / `next-browser` to check pages.
