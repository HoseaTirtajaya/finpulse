# FinPulse

Financial news intelligence with a personal watchlist and transparent idea rankings.

**Gather headlines → manage a watchlist → ask AI for a brief → rank what to lean into.**

## What’s in this repo

### Phase 1 — News desk
- Aggregated financial headlines (public RSS when reachable + curated fallback corpus)
- Category filters, search, theme pulse
- Per-instrument pages with related coverage
- AI research briefs (heuristic by default; optional OpenAI)

### Phase 2 — Watchlist, quotes & recommendations
- Browser-persisted watchlist (add / remove / reset)
- Quotes via Yahoo chart API with demo fallback
- Recommendation scores blending **news tone**, **mention share**, **coverage**, and **price action**
- Postures: **Lean in / Watch / Lean out / Needs data** — never a naked buy button

## Product brainstorm (how to grow this)

1. **Ingest** — RSS now; later Benzinga, Polygon, NewsAPI, SEC filings  
2. **Normalize** — dedupe, ticker tags, categories  
3. **Understand** — theme pulse + AI briefs  
4. **Recommend** — transparent scores + LLM explanation over *your* watchlist  

Recommendations without clean news context are hallucinated confidence. This repo proves the loop first.

### Recommendation model (current)

| Feature | Role |
|---------|------|
| News tone | Headline language skew for the symbol |
| Mention momentum | Share of feed attention vs peers |
| Coverage | How many related stories exist |
| Price action | Short-term % move (live or demo) |

Later: earnings proximity, sector relative strength, labeled outcomes → ML ranking.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321).

### Optional LLM briefs

```bash
export OPENAI_API_KEY=sk-...
# optional
export OPENAI_MODEL=gpt-4o-mini
npm run dev
```

Without a key, briefs still work via the built-in heuristic analyst.

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Dev server on port **4321** |
| `npm run build` | Production build |
| `npm start` | Serve production build on **4321** |
| `npm run lint` | ESLint |

## API surface

| Route | Purpose |
|-------|---------|
| `GET /api/news` | Headlines + theme pulse |
| `GET /api/quotes?symbols=AAPL,NVDA` | Live/demo quotes |
| `GET /api/recommendations?symbols=...` | Ranked ideas (omit `symbols` for full universe) |
| `POST /api/analyze` | AI research brief |
| `GET /api/instruments` | Instrument metadata |

## Disclaimer

FinPulse is a research workflow demo. It does **not** provide investment advice. Markets move; models err; verify everything with primary sources.
