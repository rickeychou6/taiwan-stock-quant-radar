import Link from "next/link";
import { ArrowRight, Bot, ChartCandlestick, Database, Radar, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
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
            AI + Quant + Commerce Radar
          </p>
          <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">
            AI 股票與電商數據決策系統
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            股票雷達提供即時股價、技術面、籌碼面、風險控管與 AI 決策；新加入的電商雷達會撈取公開商品資料，
            追蹤熱銷排序、估算利潤指數，並預估下月與下季可能大賣的商品。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-500">
              開始股票分析 <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/radars" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 hover:bg-emerald-400">
              多功能雷達 <Radar className="h-5 w-5" />
            </Link>
            <Link href="/ecommerce-radar" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-4 font-bold text-slate-950 hover:bg-amber-300">
              電商雷達 <ShoppingBag className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-600 px-6 py-4 font-bold text-slate-100 hover:bg-slate-800">
              登入 / 訂閱
            </Link>
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">股票分析範例</p>
              <h2 className="text-2xl font-black text-white">{sample.name} {sample.symbol}</h2>
            </div>
            <ScoreRing score={sample.finalScore} label="Sample" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MetricCard label="今日決策" value={sample.action} sub={`信心 ${sample.confidence}%`} tone={sample.finalScore >= 70 ? "bull" : "warn"} />
            <MetricCard label="持股建議" value={sample.postEntryForecast.positionAdvice} sub={sample.postEntryForecast.reason} />
            <MetricCard label="買進參考" value={sample.buyPrice} />
            <MetricCard label="停損 / 目標" value={`${sample.stopLossPrice} / ${sample.takeProfit1}`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { icon: ChartCandlestick, title: "技術面分析", text: "MA、MACD、RSI、KD、布林、ATR、ADX、VWAP、箱型整理與支撐壓力。" },
          { icon: Database, title: "真實資料層", text: "股票資料以公開金融資料源為主；電商雷達以公開商品搜尋與排序訊號為主。" },
          { icon: Bot, title: "AI 決策輔助", text: "把分數、風險、買賣點、持有期間與理由整理成可以執行的建議。" },
          { icon: ShoppingBag, title: "電商銷售雷達", text: "掃描公開商品、價格、折扣、熱銷排序，找出熱銷、利潤與下季爆品候選。" },
          { icon: ShieldCheck, title: "風險控管", text: "所有頁面都標示限制與資料可信度，不把估算結果偽裝成保證。" }
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
          <h2 className="text-2xl font-black">系統提醒</h2>
        </div>
        <p className="mt-3 text-slate-600">
          本系統是研究與決策輔助工具，不構成投資或進貨建議。股票交易與電商選品都有資料延遲、平台規則、成本、競爭與庫存風險，請自行控管資金與風險。
        </p>
      </section>
    </div>
  );
}

