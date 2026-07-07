# Architecture

## Runtime

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- API: Next.js route handlers under `src/app/api`
- Analysis: deterministic TypeScript engine under `src/lib/analysis-engine.ts`
- Data: mock provider under `src/lib/mock-data.ts`, designed to be replaced by provider classes
- Database: Prisma schema under `prisma/schema.prisma`
- Deployment: Vercel for web/API MVP, Docker Compose for full local stack

## Data Provider Boundary

The MVP keeps data access separate from scoring:

- `mock-data.ts`: stocks, OHLCV, chip, news, macro mock payloads
- `analysis-engine.ts`: only consumes normalized data
- Future providers should normalize TWSE, TPEX, Yahoo Finance, FinMind, fundamentals, news, and macro feeds into the same shapes before scoring.

## Scoring Weights

- Technical score: 30%
- Chip score: 25%
- Capital score: 15%
- Fundamental score: 15%
- News score: 10%
- Macro score: 5%

## Decision Contract

Every analysis returns:

- action: BUY / SELL / HOLD / WATCH / REDUCE / STOP_LOSS
- confidence
- buy price range
- ideal buy price range
- stop loss
- take profit 1 / 2
- holding period
- trend stage
- 3-5 day forecast
- sell / hold prompt
- explainable score blocks

## Safety Rule

AI may summarize reasons, but prices, scores, targets, win rates, and forecasts must come from deterministic data and models.
