# WordQuest — English crossword missions

Learn English grammar, speaking and world knowledge by solving crossword **missions**.
Missions are grouped into **categories** (Tourism, History, Inventions, Technologies,
Grammar Lab, Speak Up, World Knowledge), and each one trains a focus: grammar,
vocabulary, speaking or world knowledge.

Built with **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS 4** and TypeScript.
Data is stored in **JSON files**, with no database server to run.

**Live demo:** https://muhammadazamat.github.io/word-game/ (the static build, see below)

## Two ways to run it

| | Server build (`npm run build`) | Static build (`npm run build:static`) |
|---|---|---|
| Hosting | Any Node host with a persistent disk | GitHub Pages or any static host |
| Data | JSON files on the server, shared by everyone | `localStorage`, separate in each browser |
| Accounts & admin | Real, server-side and protected | Demo only: they live in the visitor's browser |
| Answers | Never sent to the browser | Included in the page bundle |

Both builds share the same code: every operation lives in `src/lib/services.ts`. The
server runs these operations behind `/api/rpc`. The static build runs the same functions
in the browser against a `localStorage` store seeded from `data/seed/`.

## Features

**For players**
- Home page with category cards, focus filters and mission search
- Crossword grids generated automatically from a word list
- Keyboard play (type, arrows, Space to switch direction, Tab for next clue, Home/End) and mobile typing
- Tools: reveal a letter (−25 pts), check the grid (−10 pts), clear word, optional countdown timer
- Answers are never sent to the browser; hints, checks and grading run on the server
- Score out of 1000, with 1–3 stars
- After a mission, a review of every word with grammar notes and fun facts
- **Listening**: hear clues, answers and example sentences read aloud (Web Speech API)
- **Speaking**: press **Say it** and pronounce the answer into your microphone (Chrome/Edge/Safari)
- Progress page: stars, solved words, day streak, skill bars, attempt history
- Light and dark themes, responsive down to phone width

**Admin panel** (`/admin`)
- Dashboard: totals, 14-day activity chart, most played missions, latest attempts
- Missions: search, filter, publish toggle, play, edit, delete
- Mission editor: words, clues, notes and example sentences, a live grid preview,
  warnings for words that don't fit, and bulk import (`ANSWER | clue | note | example`)
- Categories: create, edit, delete (icon, colour, slug, order)
- Attempts: filter by player, mission or status; delete
- Users: promote or demote admins; delete accounts

**Auth**: email and password sign-up and sign-in. Passwords are hashed with bcrypt.
Sessions are signed JWTs stored in an httpOnly cookie.

## Getting started

```bash
npm install
cp .env.example .env.local   # set AUTH_SECRET
npm run dev                  # http://localhost:3000
```

Demo accounts (from `data/seed/users.json`):

| Role    | Email                | Password   |
|---------|----------------------|------------|
| Admin   | `admin@wordgame.dev` | `admin123` |
| Learner | `demo@wordgame.dev`  | `demo1234` |

Change or remove these accounts before deploying publicly.

### Production

```bash
npm run build
AUTH_SECRET="a-long-random-string" npm start
```

`AUTH_SECRET` is required in production. Session cookies are `Secure`, so serve the app
over HTTPS. To try a production build over plain http, add `COOKIE_SECURE=false`.

## Data storage

```
data/
  seed/   # committed starter content: categories, missions, demo users
  db/     # live database, created from seed/ on first run (git-ignored)
```

In the server build, each collection (`users`, `categories`, `missions`, `attempts`) is one JSON file. Writes are
serialised per collection and written atomically (temp file, then rename). Set `DATA_DIR`
to keep the database somewhere else, for example on a persistent volume. To reset all
content, delete `data/db/`.

Use a host with a persistent filesystem (a VPS, Docker with a volume, Railway, Fly.io…).
Serverless hosts such as Vercel have read-only, ephemeral disks, so they need a real
database instead of JSON files.

## GitHub Pages

`.github/workflows/pages.yml` runs on every push to `main`. It runs the tests, builds the
static site with `BASE_PATH=/<repo-name>` and pushes it to the `gh-pages` branch. In
**Settings → Pages**, set the source to **Deploy from a branch** → `gh-pages` / `(root)`.

To build it locally:

```bash
STATIC_EXPORT=1 BASE_PATH=/word-game npx next build   # output in ./out
```

In the static build, a visitor's progress, any accounts they create and any admin
changes are stored in their own browser. Nobody else sees them.

## Project layout

```
src/
  app/                  pages and API routes
    api/rpc/route.api.ts  server build only: runs operations for the browser
    admin/*             admin panel pages
    play/               the game (?id=…)
    category/           missions of one category (?slug=…)
  components/game/      CrosswordGame, Results, SpeakPractice, Confetti
  components/admin/     editors and tables
  lib/crossword.ts      grid generator, grading, scoring (pure, unit-tested)
  lib/services.ts       every operation (auth, catalog, game, admin), shared by both builds
  lib/db.ts             JSON file store (server build)
  lib/local-backend.ts  localStorage store + session (static build)
  lib/client.ts         rpc(): calls the server or the local backend
  lib/auth.ts           cookie sessions (server build)
tests/                  node:test unit tests
```

## Scripts

| Command         | What it does                                   |
|-----------------|------------------------------------------------|
| `npm run dev`   | Development server                             |
| `npm run build` | Production build (Node server)                  |
| `npm run build:static` | Static export for GitHub Pages (`./out`) |
| `npm start`     | Start the production build                     |
| `npm run lint`  | Type-check (`tsc --noEmit`)                    |
| `npm test`      | Unit tests for the crossword engine (Node 22+) |

## Adding content

Sign in as an admin and open **Admin → Missions → New mission**. Type answers and clues;
the grid preview updates as you type. A mission can only be published once every word
fits in the grid. Answers are letters only (2–15). Spaces and punctuation are removed.
