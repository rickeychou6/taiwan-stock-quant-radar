# 台股 AI 決策雷達

這是一套不含自動下單的台股掃描、推薦與提醒網站。系統會讀取 TWSE／TPEX 公開市場資料，依技術面、量價、籌碼、融資風險與模型校準結果排序候選股。

## 已完成功能

- 上市櫃股票候選池掃描與推薦排序
- K 線、均線、MACD、KD、RSI、ATR、量價與突破判斷
- 買點、觀察區、停損、兩段目標價與風險報酬比
- 多空強弱、融資安全與槓桿／隔夜風險評分
- 推薦理由、資料品質與歷史訊號回測
- 自選股與持倉管理
- 自選股每 60 秒自動重查、到價／停損／風險通知
- 音效、震動與系統通知
- 手機響應式介面、可安裝 PWA 與離線頁面快取
- 專用雷達中心：盤中現貨、0050、非期貨、隔日/3-5 天上漲候選、照片群組與百元以下低價股
- AI 全自動模擬交易：GitHub Actions 盤中排程自動選股、買進、續抱、減碼或賣出，並提供當沖開關
- 完全不提供下單或券商交易指令

## 本機啟動

需要 Node.js 20 以上版本：

```bash
cd ai-stock-decision-saas
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:3000`。正式部署前可執行：

```bash
npm run typecheck
npm run build
npm run start
```

## 通知能力與限制

「自選警示」頁在網站開啟期間每 60 秒重新分析，符合條件時發出瀏覽器／PWA 系統通知。Service Worker 也已預留 Web Push 事件入口。

若要在網站完全關閉後仍全天候掃描與推播，正式環境必須另外部署排程工作、Push 訂閱儲存與 Firebase Cloud Messaging（或標準 Web Push）服務。瀏覽器本身不能保證任意週期的背景掃描。

行情用於分析與研究，不保證即時、完整或正確，也不構成投資建議。正式商用或重新散布即時行情前，請改接合法授權的券商／資料商 API。

## AI 模擬交易設定

`/auto-trader` 只做模擬買賣，不會連接券商下單。交易狀態保存在 GitHub 的 `auto-trader-state` 分支，背景排程由 GitHub Actions 免費執行。

若要讓網站上的「當沖出場」開關可以直接寫入雲端狀態，部署環境需要設定 `AUTO_TRADER_STATE_TOKEN`。這是免費 GitHub fine-grained token，只需要給本 repo 的 Contents read/write 權限。可選擇再設定 `AUTO_TRADER_ADMIN_KEY` 保護設定 API。

## 主要頁面

- `/recommendations`：全市場推薦雷達
- `/radars`：專用雷達總中心
- `/dashboard`：個股完整分析
- `/watchlist`：自選股與自動提醒
- `/portfolio`：持倉風險管理
- `/market`：大盤與融資安全
- `/auto-trader`：AI 全自動模擬交易
- `/admin`：資料與服務狀態

詳細後端與正式化規劃請參考 `docs/ARCHITECTURE.md`。
