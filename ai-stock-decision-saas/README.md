# AI 股票與電商數據決策系統

這是一個 Next.js SaaS 儀表板，整合台股分析、個股推薦、自選股、持股管理、AI 模擬交易、市場總覽，以及新增的電商銷售數據雷達。

本系統僅供研究與輔助判斷，不構成投資、交易或進貨建議。

## 主要功能

- 股票 Dashboard：搜尋股號或股名，顯示 AI 分數、買賣建議、停損、目標價與 K 線分析。
- 個股推薦：依照技術面、籌碼面、資金面、風險報酬比與可靠度排序。
- 自選股與持股管理：追蹤買賣點、停損、目標價與持股建議。
- AI 模擬交易：以虛擬資金自動選股與記錄交易；目前固定禁止當沖，只允許隔日後評估出場。
- 市場總覽：台股、國際指數、期貨、融資水位與風險提醒。
- 電商銷售數據雷達：即時撈取 PChome 24h 公開搜尋資料，追蹤熱銷排序、價格、折扣、估算利潤指數，並預估下月與下一季可能大賣的商品。

## 電商雷達資料說明

目前電商雷達使用 PChome 24h 公開搜尋 JSON：

- 商品名稱、價格、原價、圖片、商品連結、搜尋池與排序訊號是真實公開資料。
- PChome 沒有公開實際成交件數，所以「銷售量最大」以熱銷排序分數呈現，不顯示假件數。
- 利潤是依商品分類預設毛利率估算，尚未扣進貨成本、平台費、物流費、廣告費與退貨率。
- 若要得到真正銷量與真正利潤，需要接入你的店鋪訂單、成本與廣告報表。

## 本機啟動

```bash
cd ai-stock-decision-saas
npm install
npm run dev
```

預設網址：

```text
http://localhost:3000
```

正式檢查：

```bash
npm run typecheck
npm run build
npm run start
```

## 主要路由

- `/dashboard`：股票分析
- `/recommendations`：個股推薦
- `/ecommerce-radar`：電商銷售數據雷達
- `/auto-trader`：AI 模擬交易
- `/radars`：多功能雷達
- `/watchlist`：自選股
- `/portfolio`：持股管理
- `/market`：市場總覽
- `/admin`：管理後台

## API

- `/api/ecommerce/radar`：電商雷達資料
- `/api/analysis/[symbol]`：股票分析
- `/api/recommendations`：個股推薦
- `/api/market/overview`：市場總覽
- `/api/auto-trader/state`：AI 模擬交易狀態

