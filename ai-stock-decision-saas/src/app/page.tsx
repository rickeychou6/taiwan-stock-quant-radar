import Link from "next/link";
import { ArrowRight, Bot, ChartCandlestick, Database, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { runRealFullAnalysis } from "@/lib/real-analysis-engine";
import { MetricCard } from "@/components/MetricCard";
import { ScoreRing } from "@/components/ScoreRing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sample = await runRealFullAnalysis("2330.TW");
  return (
    <div className="space-y-10">
      <section className="grid gap-8 py-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
            AI + Quant + Risk Control
          </p>
          <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">
            AI 股票全方位分析決策網站 SaaS
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            將技術面、籌碼面、資金面、基本面、消息面與國際市場整合成 0-100 分決策模型，
            直接回答今天買、賣、續抱或觀望，並給出買點、停損、目標價與 3-5 天漲跌預估。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-500">
              開始分析 <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/radars" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 hover:bg-emerald-400">
              專用雷達 <Radar className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-600 px-6 py-4 font-bold text-slate-100 hover:bg-slate-800">
              登入 / 訂閱
            </Link>
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">範例分析</p>
              <h2 className="text-2xl font-black text-white">{sample.name} {sample.symbol}</h2>
            </div>
            <ScoreRing score={sample.finalScore} label="Sample" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MetricCard label="今日決策" value={sample.action} sub={`信心 ${sample.confidence}%`} tone={sample.finalScore >= 70 ? "bull" : "warn"} />
            <MetricCard label="持股建議" value={sample.postEntryForecast.positionAdvice} sub={sample.postEntryForecast.reason} />
            <MetricCard label="買點區間" value={sample.buyPrice} />
            <MetricCard label="停損 / 目標" value={`${sample.stopLossPrice} / ${sample.takeProfit1}`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { icon: ChartCandlestick, title: "全指標技術分析", text: "MA、EMA、MACD、RSI、KD、Bollinger、ATR、ADX/DMI、OBV、MFI、VWAP、SAR、CCI、W%R、Donchian、Keltner。" },
          { icon: Database, title: "資料層可替換", text: "TWSE、TPEX、Yahoo、FinMind、PostgreSQL、Redis、排程同步與 API log 預留。" },
          { icon: Bot, title: "AI 解釋而非亂猜", text: "數字由模型計算，AI 僅負責解釋、多因子摘要與事件影響歸因。" },
          { icon: Radar, title: "專用雷達合併", text: "盤中現貨、0050、非期貨、隔日上漲、照片群組與低價股都集中在同一網站。" },
          { icon: ShieldCheck, title: "風險可控", text: "停損、風險報酬、回測勝率、最大回撤與賣出/續抱提醒放在最上方。" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="glass rounded-2xl p-5">
              <Icon className="h-8 w-8 text-blue-300" />
              <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
            </div>
          );
        })}
      </section>

      <section className="light-panel rounded-3xl p-7">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-black">商業化 SaaS 路線</h2>
        </div>
        <p className="mt-3 text-slate-600">
          MVP 已提供頁面、API、分析引擎、schema、Docker、TWSE/TPEX 官方股名索引與 Yahoo Finance 真實 K 線。下一階段可接正式登入、資料庫、金流、法人與基本面資料。
        </p>
      </section>
    </div>
  );
}
