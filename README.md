# FinPulse

Personal **financial news intelligence** desk: multi-scope headlines, live quotes, crypto rankings, transparent idea rankings, IDR-first FX conversion, and on-demand AI research briefs.

**Principles**

- Real headlines only (RSS / ingest — no invented news)
- Live quotes only (missing prices show as `—`, never demo prices)
- Transparent rankings — lean in / watch / lean out / needs data — **never a naked buy button**
- AI briefs are **research aids**, not investment advice (no hard buy/sell or leverage multiples)

**Repo:** `https://github.com/HoseaTirtajaya/finpulse.git`  
**Local:** `http://127.0.0.1:4321` (`next` **16.3**, React **19**, port **4321**)

> **Agent note:** This is not classic Next.js App Router from older training data. Prefer `node_modules/next/dist/docs/` and follow `AGENTS.md` / `CLAUDE.md` before changing framework APIs.

---

## Product map

| Surface | Route | What it does |
|---------|-------|----------------|
| Finance desk | `/` | Headline feed (US/IDX filters + categories), watchlist + live quotes, macro calendar, theme pulse, **currency converter**, finance AI brief |
| General desk | `/general` | World / Indonesia / All regions; world/tech/politics/sports/culture |
| Trending | `/trending` | **World** and **Indonesia** lanes ranked separately (2+ outlets, Jaccard-ish clustering) |
| Crypto desk | `/crypto` | CoinGecko top-50 table (rank, price, 24h, mcap, volume, 7d sparkline) |
| Recommendations | `/recommendations` | Idea rankings; segments All / US / EU / Asia / Indonesia / Global / **Crypto** |
| Instrument | `/instrument/[symbol]` | Quote (+ crypto mcap/volume/rank), news sentiment, related news, retail AI brief |

Nav also exposes **Crypto**, **Ideas**, Watchlist, AI brief anchors.

---

## Feature summary (current)

### News

- Scopes: `finance` | `general` | `trending`
- Finance categories: markets, equities, macro, **crypto**
- Markets: US / IDX (finance); World / Indonesia / All (general)
- Sources: Yahoo/CNBC/MarketWatch + Indonesian finance RSS + **CoinDesk / CoinTelegraph**; general world RSS
- With `DATABASE_URL`: UI reads Neon ingest store; without it: live RSS fan-out
- Instrument matching: word-boundary + distinctive aliases (`src/lib/news/match-instrument.ts`) — avoids false positives like `BRI ⊂ BRICS`

### Instruments & markets

- Static catalog in `src/lib/instruments.ts` (US / EU / Asia / ID equities, indices, FX, ~25 cryptos with `coingeckoId`)
- **Equities / FX / indices:** Yahoo Finance chart API (`src/lib/market/yahoo.ts`)
- **Crypto quotes & rankings:** CoinGecko (`src/lib/market/coingecko.ts`); optional `COINGECKO_API_KEY`
- Quotes cached ~60s; crypto markets ~90s (`src/lib/cache.ts`)

### Recommendations

- Score = newsTone + mentionMomentum (+velocity) + priceAction + coverage + maTrend + rangePosition + **macroBoost**
- News pool = finance + general + trending (`mergeNewsPools`)
- Crypto segment: if watchlist has no crypto, API/UI fall back to full crypto universe
- Auto-refresh every 3 minutes (toggleable)

### AI research brief (click-to-generate)

- `POST /api/analyze` → Gemini (default) → OpenAI → heuristic fallback
- Instrument briefs (retail-oriented): summary, **probable outcomes** (Bull/Base/Bear), **timing conditions**, risk analysis, what to watch, key drivers, investor checks, **leverage trading (high-risk educational only)**
- Uses matched related headlines + live quote when available
- UI: `src/components/ai-brief-panel.tsx`; prompts: `src/lib/ai/analyze.ts`

### Currency converter (home aside)

- IDR-first; majors: **IDR, USD, EUR, GBP, SGD, JPY, AUD, CHF, HKD**
- Live Yahoo mid rates via USD cross book (`src/lib/fx/convert.ts`)
- Single convert + **IDR → majors** table (presets Rp 1jt / 10jt / 100jt)

### Ingest (Neon)

| Source | Table | Cadence (adapter) |
|--------|-------|-------------------|
| Finance / general / crypto RSS | `articles` | ~15 min |
| Forex Factory calendar XML | `macro_events` | ~30 min |
| IDX announcements JSON | `articles` | ~15 min |

- Schema: Drizzle (`src/lib/db/schema.ts`), `npm run db:push`
- Cron: `GET|POST /api/cron/ingest` + `CRON_SECRET`
- **Vercel Hobby** only runs one cron per day — `vercel.json` keeps a daily floor (`0 6 * * *` UTC). For ~15 min freshness on free tier, point an external scheduler ([cron-job.org](https://cron-job.org)) at your deploy URL:
  - URL: `https://<your-app>.vercel.app/api/cron/ingest`
  - Method: `GET`
  - Header: `Authorization: Bearer <CRON_SECRET>`
  - Interval: every **15 minutes** (lets Neon scale-to-zero between runs)
- Articles older than **45 days** are pruned each successful ingest
- Ops: `GET /api/health` shows last ingest run + stale sources
- **TradingView is not scraped**

---

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16.3 (App Router), React 19, TypeScript, Tailwind 4 |
| DB | Neon Postgres + Drizzle ORM (`@neondatabase/serverless`) |
| Quotes | Yahoo (default); CoinGecko for crypto |
| AI | Gemini / OpenAI / heuristic (`AI_PROVIDER`) |
| Tests | Vitest (`npm test`) |
| UI | Local components + Base UI / shadcn-style primitives |

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill keys as needed
npm run db:push              # only if DATABASE_URL set
npm run ingest               # optional seed
npm run dev                  # http://127.0.0.1:4321
```

### Env (see `.env.example`)

| Variable | Role |
|----------|------|
| `AI_PROVIDER` | `gemini` (default) \| `openai` |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | On-demand briefs |
| `COINGECKO_API_KEY` | Optional higher CG limits |
| `DATABASE_URL` | Neon — enables ingest-backed news |
| `CRON_SECRET` | Protects ingest cron |
| `UPSTASH_REDIS_*` | Optional remote watchlist |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server **4321** |
| `npm run build` / `npm start` | Production |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run db:push` | Push Drizzle schema to Neon |
| `npm run ingest` | One-shot ingest |
| `npm run seed:instruments` | Upsert catalog into `instruments` |
| `npm run backfill:bars` | One-shot 5y `daily_bars` backfill |

---

## Architecture (handoff)

```
src/
  app/                 # routes: /, /general, /trending, /crypto, /recommendations, /instrument/[symbol]
  app/api/             # quotes, recommendations, analyze, cron/ingest, health, instruments, …
  components/          # UI boards, converter, AI panel, rails, news cards
  lib/
    instruments.ts     # static universe seed + formatters (DB catalog is source of truth when seeded)
    types.ts           # shared domain types
    news/              # fetch, query (DB), trending, match-instrument, sources
    market/            # yahoo + coingecko + http retry helpers + router
    recommend/rank.ts  # scoring (reads daily_bars + article_instruments when present)
    ai/analyze.ts      # briefs (timeouts, header auth, Postgres brief cache)
    fx/convert.ts      # currency book + IDR board
    ingest/            # RSS (batched), FF calendar, IDX, daily bars, fundamentals, article links
    db/                # Drizzle schema + client + market-data helpers
    sentiment.ts       # EN/ID lexicon tone
    cache.ts           # use cache + cacheLife wrappers
```

### Important behaviors for future agents

1. **Instrument ↔ news:** use `matchesInstrument` / word-boundary `extractTickers` — do not reintroduce bare `includes()` for short aliases (`BRI`, `SOL`, …). Prefer `article_instruments` links resolved at ingest.
2. **Crypto quotes ≠ Yahoo** when `type === "crypto"` — go through CoinGecko in `fetchQuotes`.
3. **Recommendations `market=crypto`:** empty watchlist crypto → fall back to crypto catalog (API + UI).
4. **AI briefs:** normalize LLM list fields to strings (`asStringList`); cited headlines may arrive as `{title,source}` objects. LLM calls use `AbortSignal.timeout` and Gemini auth via `x-goog-api-key`.
5. **Next.js:** `cacheComponents` is on — prefer `use cache` / `cacheLife` / `cacheTag` over `unstable_cache`. Read package docs under `node_modules/next/dist/docs/` before API changes.
6. **Do not commit secrets** (`.env.local`). Prefer not expanding plan files unless asked.
7. **Ingest must finish under 60s:** RSS feeds run with bounded concurrency + multi-row upserts; daily bars and fundamentals are cadence-gated (~daily / weekly).

---

## Deploy (Vercel)

1. Import GitHub repo
2. Set env from `.env.example` (`DATABASE_URL`, `CRON_SECRET`, AI / CoinGecko keys as needed)
3. `npm run db:push` once against Neon
4. Deploy; confirm cron auth with `Authorization: Bearer <CRON_SECRET>`

Caches (approx): news 90s · quotes 60s · crypto markets 90s · candles 300s

---

## Tests worth knowing

- `src/lib/__tests__/core.test.ts` — tickers, matching, trending lanes, FX convert, rec helpers
- `src/lib/__tests__/ingest.test.ts` — adapters / cron auth fixtures

---

## Disclaimer

Not investment advice. FinPulse summarizes public headlines and market data for research workflows only. Verify primary sources; leverage sections are educational and never recommend a leverage multiple.
