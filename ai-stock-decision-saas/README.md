# AI 股票全方位分析決策網站 SaaS

這是一個可商業化擴充的 MVP 骨架，採用 Next.js、TypeScript、Tailwind CSS、PostgreSQL schema、REST API 與模組化分析引擎。

> 風險提醒：本系統僅供研究與輔助判斷，不構成投資建議。

## 已完成 MVP

- 首頁 Landing Page
- 登入頁 UI，Email/password 與 Google OAuth 預留
- 股票分析 Dashboard
- 自選股頁
- 持股管理頁
- 市場總覽頁
- 管理員後台
- REST API
- 模組化 mock 資料層
- AI 多因子分析引擎初版
- 3-5 天漲跌百分比預估
- 賣出 / 續抱 / 減碼 / 觀望提示
- PostgreSQL Prisma schema
- Docker Compose

## 本機啟動

```bash
cd ai-stock-decision-saas
cp .env.example .env
npm install
npm run dev
```

打開：

```text
http://localhost:3000
```

## Docker

```bash
cd ai-stock-decision-saas
cp .env.example .env
docker compose up --build
```

## API

- `GET /api/stocks/search?q=`
- `GET /api/stocks/{symbol}`
- `GET /api/stocks/{symbol}/prices`
- `GET /api/stocks/{symbol}/indicators`
- `GET /api/stocks/{symbol}/news`
- `GET /api/analysis/{symbol}`
- `POST /api/analysis/run`
- `GET /api/watchlist`
- `POST /api/watchlist`
- `DELETE /api/watchlist/{id}`
- `GET /api/portfolio`
- `POST /api/portfolio`
- `GET /api/market/overview`
- `GET /api/backtest/{symbol}`
- `POST /api/backtest/run`

## 分析權重

- 技術面 30%
- 籌碼面 25%
- 資金面 15%
- 基本面 15%
- 消息面 10%
- 國際市場 5%

## 重要架構原則

AI 不直接亂猜價格。價格、分數、勝率與 3-5 天漲跌百分比由資料與模型計算；AI 僅負責解釋、歸因與摘要。

## 下一步

1. 接 Prisma Client 與正式 PostgreSQL
2. 建立 NextAuth Credentials 與 Google OAuth
3. 建立 TWSE/TPEX/Yahoo/FinMind provider
4. 加 Redis 快取
5. 加排程同步與 API logs
6. 把 mock chart 換成 TradingView Lightweight Charts 資料流
7. 新聞情緒串 OpenAI API 或本地 LLM
