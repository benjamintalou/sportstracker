# Garmin Time Dashboard — Specification (v1)

Source: [project-initialisation.md](./project-initialisation.md) + clarification Q&A (2026-11-02).

## 1. Goal

A personal web app that connects to my Garmin Connect account and shows **how much time I really spent training** over any period, with a focus on running and cycling.

## 2. Decisions summary

| Topic | Decision |
|---|---|
| Users | Single user (me). No app account; the Garmin login is the only auth. |
| Garmin auth | Unofficial Garmin SSO (email + password + **MFA**) → Garmin Connect OAuth tokens |
| Token storage | Encrypted, httpOnly session cookie only (`iron-session`). Nothing stored on the server. NextAuth/Auth.js was considered and rejected: its single-call Credentials flow doesn't fit the two-step MFA login, and it is now in maintenance mode. Revisit Better Auth if the app ever goes multi-user. |
| Data | Fetched live from Garmin in RSC and cached with Next.js caching. No database. |
| Time metrics | Moving time, elapsed time, moving vs elapsed comparison (idle time), time in HR zones |
| Dashboard v1 | KPI tiles with trends vs the previous period, activity list + activity detail |
| Period | Presets + custom range, stored in URL search params |
| Locale | French UI, metric units (km, min/km, km/h, m), `fr-FR` formats, `Europe/Paris` |
| Theme | Light/dark toggle (Mantine color scheme), both themes first-class |
| Map | MapLibre GL (route on the activity detail page) |
| Tooling | Next.js (App Router, RSC-first) on Vercel, Mantine, npm, no tests in v1 |
| Dev server | Port **4000** (`next dev -p 4000`, `next start -p 4000`) |
| Skills | Use the skills in `.agents/skills` (next-best-practices, next-cache-components, vercel-react-best-practices, vercel-composition-patterns, ui-ux-pro-max, web-design-guidelines, typescript-advanced-types) |

## 3. Sport categories

Each Garmin `activityType.typeKey` maps to one category, and each category has its own color, used in both themes:

| Category (FR label) | Garmin types (indicative) |
|---|---|
| Course sur route — `run` | `running`, `track_running`, `street_running` |
| Trail — `trail` | `trail_running`, `ultra_run` |
| Course indoor — `run_indoor` | `treadmill_running`, `indoor_running` |
| Vélo route / VTT — `bike` | `cycling`, `road_biking`, `mountain_biking`, `gravel_cycling` |
| Vélo indoor — `bike_indoor` | `indoor_cycling`, `virtual_ride` |
| Natation — `swim` | `lap_swimming`, `open_water_swimming` |
| Renfo / Autres — `other` | everything else (strength, hiking, yoga, …) |

The mapping lives in one typed module (`lib/sports.ts`). Unknown types fall back to `other`.

## 4. Features

### 4.1 Garmin connection (`/login`)
- Form with email and password. If Garmin asks for MFA, a second step asks for the 6-digit code.
- Server Actions run the SSO flow (see §5.2). On success, tokens go into the session cookie and the user is redirected to `/`.
- Errors are shown in French: wrong credentials, wrong MFA code, rate limited, Garmin unavailable.
- Credentials are never stored or logged.
- Logout clears the cookie.
- Middleware/proxy redirects every route except `/login` to `/login` when there is no valid session.

### 4.0 Menu and pages (added 2026-11-07)
- Header menu: **Vélo** (`/`, home), **Sommeil** (`/sleep`), **Statistiques** (`/stats`, the dashboard of §4.2). Icons only on phones.
- **Vélo**: six cards, cycling only (bike + bike_indoor, Move IQ included with estimated km labelled): total km over the rolling 7 days, 30 days and 12 months, and km per calendar day for each.
  Below, a chart of km per day over the last 24 months (dots on ride days) with the 30-day rolling km/day (line, rest days included), same scope as the cards. Move IQ is fetched over 24 months for it (one call per day, cached).
- **Sommeil**: for each rolling window (7 d / 30 d / 12 months), average sleep HR and the lowest sleep HR reached (with its night), then a quality table: sleep score, duration, deep / REM / light stages, awake time, resting HR, overnight HRV, respiration. Source: `/wellness-service/wellness/dailySleepData/{displayName}?date=&nonSleepBufferMinutes=60`, one call per night, cached per day like Move IQ; undocumented payload parsed tolerantly (`lib/garmin/sleep.ts`).

### 4.2 Dashboard (`/stats`)
- **Period selector** (default: 7 derniers jours): Aujourd'hui, Hier, Cette semaine, Ce mois, Cette année, 7 / 30 derniers jours, 12 derniers mois, and Personnalisé (date range picker). State lives in the URL (`?from=YYYY-MM-DD&to=YYYY-MM-DD` or `?preset=month`), so it can be bookmarked and the back button works.
- **Sport filter**: segmented control: Tout / Course (run + trail + run_indoor) / Vélo (bike + bike_indoor) / each category. Also stored in the URL.
- **KPI tiles** (for the period and filter):
  - Temps en mouvement (main metric, the biggest tile)
  - Temps écoulé
  - Temps d'arrêt (elapsed − moving) and % of elapsed time
  - Distance, Dénivelé +, Nombre d'activités
  - Each tile shows the delta vs the previous period of the same length (↑/↓, %, colored)
- **Breakdown by sport**: moving time per category as a horizontal bar or ring, with share %.
- **Time in HR zones**: Z1–Z5 stacked bar of the summed time in zones over the period.
- Loading uses Suspense streaming with skeletons for each section. Empty states have illustrations and French copy.

### 4.3 Activity list (`/activities`)
- Uses the same period and sport filters (shared URL params).
- Table/cards: date, sport icon and color, name, moving time, elapsed time, distance, pace or speed (pace for run, speed for bike), D+, avg HR.
- Sort by date, duration or distance. Paginated or "load more".
- Clicking a row opens the detail page.

### 4.4 Activity detail (`/activities/[id]`)
- Header: name, sport, date/time, location.
- Time block: moving vs elapsed vs stopped (visual comparison bar).
- Stats: distance, pace/speed, D+/D−, avg/max HR, calories, cadence, power (bike, when available).
- HR zones: time per zone.
- Splits/laps table (per km for run, per lap for bike).
- Route map (MapLibre, polyline colored by sport, light/dark map style that follows the theme). Hidden for indoor activities.

### 4.5 Shell
- AppShell with a header (logo, nav: Tableau de bord / Activités, theme toggle, Garmin profile avatar + logout).
- Responsive down to mobile (360px).

### 4.6 Move IQ (auto-detected movements)
- Movements the watch detects on its own (bike commutes, walks, runs, swims) appear only in Garmin's daily timeline (`/wellness-service/wellness/dailyEvents?calendarDate=`), not in the activity list. They have a type and a duration, but no GPS, distance or heart rate.
- Every Move IQ event is included and attached to its sport category: it counts in time totals and sport filters, and is shown hatched with a "Move IQ" label everywhere. It is not counted as an activity and is excluded from HR coverage.
- Move IQ has no distance (no GPS). Distance is estimated as duration × an average speed per sport (defaults: bike 15, walk 5, run 10, swim 2 km/h), editable from the "Réglages Move IQ" button in the header (app-wide, it also drives the Vélo page) and stored in the `gt_prefs` cookie. Estimated km count in the Distance total, always labelled "dont ≈ X km estimés (Move IQ)".
- A "Move IQ" switch in the filters (`?moveiq=off`) excludes them. If the timeline fails, the dashboard still renders recorded activities, with a warning.
- The endpoint needs one call per day, so days are cached on the server (past days never expire). The payload is undocumented, so parsing is tolerant; check it with the dev-only `/api/debug/daily-events?date=`.

## 5. Architecture

### 5.1 Stack
- Next.js (latest, App Router, TypeScript strict), React Server Components by default. Client components only for interactivity: period picker, theme toggle, map, charts.
- Mantine (core, dates, charts, notifications) with a custom theme: sport colors, typography, radius.
- `@mantine/charts` (Recharts) for charts. `maplibre-gl` for maps.
- `iron-session` (or a `jose` JWE) for the encrypted cookie.
- `dayjs` with `fr` locale and timezone plugins.
- `zod` to validate Garmin responses at the boundary.
- Deployment: Vercel. Env vars: `SESSION_SECRET`.

### 5.2 Garmin connector (`lib/garmin/`)
Server-only module (`import 'server-only'`), with an implementation modeled on `garth` / `garmin-connect`:
1. **SSO login**: GET the `sso.garmin.com/sso/signin` embed page → CSRF token → POST the credentials → either a service ticket or an MFA challenge.
2. **MFA**: POST the code to the `verifyMFA` endpoint → ticket. The intermediate SSO cookies/state are kept in a short-lived encrypted cookie between the two form steps.
3. **Ticket → OAuth1** (`connectapi.garmin.com/oauth-service/oauth/preauthorized`, signed with the public consumer key/secret used by garth).
4. **OAuth1 → OAuth2** (`/oauth-service/oauth/exchange/user/2.0`). The OAuth2 access token lasts about 1h. It is refreshed transparently by re-exchanging the OAuth1 token, which lasts about 1 year.
5. **API client**: `garminFetch(path)` adds a Bearer token, refreshes on expiry/401, maps errors to typed errors, and validates responses with zod.

Endpoints used (to confirm during implementation):
- `/userprofile-service/socialProfile`: name, avatar, profile id
- `/activitylist-service/activities/search/activities?startDate&endDate&start&limit`: paginated list, including `duration`, `movingDuration`, `elapsedDuration`, `distance`, `elevationGain`, `averageHR`, `activityType`
- `/activity-service/activity/{id}`, `/splits`, `/hrTimeInZones`, `/details` (polyline)

Session cookies (implemented, sealed with iron-session): `gt_session` holds the OAuth1 token and profile (1 year). `gt_access` holds the OAuth2 access token and is refreshed by `proxy.ts` before pages render. `gt_mfa` holds the SSO cookies and CSRF between the password and MFA steps (10 min). The OAuth2 refresh token is not stored, because re-exchanging the OAuth1 token replaces it. A warning is logged if a sealed cookie gets close to 4 KB.

### 5.3 Data and caching
- Pages are RSC that call `getActivities(range)` / `getActivity(id)` in `lib/data/`.
- Aggregation is done server-side (`lib/metrics.ts`), with pure functions: totals, previous-period delta, per-category breakdown, HR zone sums.
- Caching: use Next cache components with a cache key on (profileId, range). Cookies cannot be read inside `'use cache'`, so the exact pattern (`'use cache: private'` vs passing tokens to a cached fetcher) will be validated against the `next-cache-components` skill. Target lifetimes: ~5 min for recent periods, longer for past periods and activity details (an activity never changes).
- Large ranges (a year or more): paginate Garmin calls (limit 100) and stay polite with rate limits (sequential pages, backoff on 429).

### 5.4 Suggested structure
```
app/
  (auth)/login/page.tsx + actions.ts
  (app)/layout.tsx            AppShell
  (app)/page.tsx              Dashboard
  (app)/activities/page.tsx
  (app)/activities/[id]/page.tsx
lib/garmin/  sso.ts oauth.ts client.ts schemas.ts
lib/session.ts  lib/sports.ts  lib/metrics.ts  lib/period.ts  lib/format.ts
components/  kpi/ period-picker/ charts/ activity/ map/
theme.ts
```

## 6. UI direction
- Both light and dark themes are polished. Default to the system scheme and persist the toggle.
- Big, confident numbers (tabular figures) for durations: `12 h 34 min`.
- Each sport color is used consistently across tiles, charts, the list and the map.
- Subtle motion: count-up on KPIs, smooth transitions on period change. Respect `prefers-reduced-motion`.
- Use the `ui-ux-pro-max` skill for the palette and font pairing, and review with `web-design-guidelines` (accessibility, contrast in both themes).

## 7. Out of scope (v1)
Multi-user and app accounts, a database or sync, calendar heatmap, weekly volume chart, i18n/imperial units, automated tests, the official Garmin API, and editing data on Garmin.

## 8. Risks / open points
- The unofficial SSO can break or be blocked by Garmin (Cloudflare, flow changes). Keep it isolated behind `lib/garmin/` so it can be swapped out.
- Vercel serverless IPs could be challenged by Garmin SSO more often than a residential IP.
- The available fields (`movingDuration`, `hrTimeInZone_*`) vary by device and activity type, so the UI must degrade gracefully.
- Package manager: npm assumed (can switch to bun).

## 9. Milestones
1. Scaffold: Next + Mantine + theme + AppShell + light/dark toggle.
2. Garmin connector: SSO + MFA + tokens in the session + refresh + profile in the header.
3. Data layer: activities fetch, sport mapping, metrics, caching.
4. Dashboard: period picker, KPI tiles with deltas, sport breakdown, HR zones.
5. Activity list and detail (splits, zones, MapLibre route).
6. Polish: empty/error states, motion, a11y review, Vercel deploy.
