# FinPulse

Multi-scope news desk: **Finance (US + IDX)** · **General** · **Trending**

Real headlines only. Live quotes only (missing prices show as —). Transparent rankings on the finance desk — never a naked buy button.

## Scopes

| Scope | Routes | Features |
|-------|--------|----------|
| Finance | `/` | RSS feed, US/IDX filters, watchlist, live quotes, recommendations, AI brief |
| General | `/general` | World/tech/politics/sports/culture feed + AI brief |
| Trending | `/trending` | Cross-outlet story clusters by title similarity × recency |

## Run locally

```bash
npm install
cp .env.example .env.local   # optional keys
npm run dev
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321).

### Optional env

See `.env.example`:

- `AI_PROVIDER=gemini` + `GEMINI_API_KEY` (free default) or `OPENAI_API_KEY`
- `MARKET_PROVIDER=yahoo` (paid Finnhub/Polygon hooks are stubbed)
- `UPSTASH_REDIS_*` for optional cross-device watchlist sync

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server on **4321** |
| `npm run build` | Production build |
| `npm start` | Serve production on **4321** |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |

## Deploy (Vercel)

1. Push repo to GitHub / import in Vercel
2. Set env vars from `.env.example`
3. Deploy — `vercel.json` uses the Next.js framework preset

News is cached ~5 minutes; quotes ~1 minute (`unstable_cache`).

## Architecture notes

- News registries: `src/lib/news/sources/finance.ts`, `general.ts`
- Market data: `src/lib/market/` (`MarketDataProvider` + Yahoo)
- AI: `src/lib/ai/analyze.ts` (Gemini → OpenAI → heuristic)
- Rankings: candle MAs, range position, mention velocity — finance only

## Disclaimer

Not investment advice. Verify everything with primary sources.
