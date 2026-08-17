import type { Metadata } from "next";
import { GlobalMarketMonitorClient } from "@/components/global-monitor/GlobalMarketMonitorClient";

export const metadata: Metadata = {
  title: "全球事件市場雷達 | 台股 AI 決策雷達",
  description: "以地圖、事件流、資料來源可信度與市場影響追蹤全球事件對股票、指數、商品與供應鏈的影響。"
};

export default function GlobalMonitorPage() {
  return <GlobalMarketMonitorClient />;
}
