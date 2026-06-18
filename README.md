# 台股智慧多維度波段共振量化雷達

這是以 Streamlit 建立的台股短線量化雷達，支援中文股名與股號查詢、箱型整理、布林通道、ATR 防守線、KD/MACD、法人買賣超、初升段/主升段/末升段判讀，以及 0050 權值股掃描。

## 本機執行

```bash
pip install -r requirements.txt
streamlit run app.py
```

## 部署到 Streamlit Community Cloud

1. 將本專案推到 GitHub repository。
2. 到 Streamlit Community Cloud 建立新 app。
3. 選擇 GitHub repository、branch，主檔案填入 `app.py`。
4. 部署完成後即可取得公開網址。

## 資料來源提醒

- 股價歷史 K 線使用 Yahoo Finance。
- 最新價優先使用 TWSE/TPEx MIS 即時/延遲報價，若官方資料缺漏會退回 Yahoo Finance 日 K 備援。
- 三大法人資料使用官方盤後資料，不是即時盤中法人買賣超。
- 本系統僅供研究與輔助決策，不構成投資建議。

