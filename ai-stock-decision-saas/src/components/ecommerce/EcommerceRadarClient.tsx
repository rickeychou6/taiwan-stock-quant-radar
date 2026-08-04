"use client";

import { AlertTriangle, CalendarClock, DollarSign, ExternalLink, RefreshCw, Search, ShoppingBag, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CommerceProduct, CommerceRadarReport } from "@/lib/ecommerce-radar";

const DEFAULT_KEYWORDS = "藍牙耳機, 行動電源, 掃地機器人, 氣炸鍋, 除濕機, 電競滑鼠, SSD, 咖啡機, 保健食品, 貓砂, 美妝保養, 筋膜槍, 兒童玩具, 露營燈, 電風扇, 空氣清淨機";

function money(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString()} 元`;
}

function pct(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

function dateTime(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function scoreTone(score: number) {
  if (score >= 78) return "text-emerald-300";
  if (score >= 62) return "text-amber-300";
  return "text-slate-200";
}

function confidenceTone(confidence: CommerceProduct["confidence"]) {
  if (confidence === "高") return "bg-emerald-400/15 text-emerald-200";
  if (confidence === "中") return "bg-amber-400/15 text-amber-200";
  return "bg-slate-500/20 text-slate-200";
}

function ProductCard({ product, mode }: { product: CommerceProduct; mode: "sales" | "profit" | "month" | "quarter" }) {
  const mainScore =
    mode === "profit"
      ? product.estimatedProfitIndex
      : mode === "month"
        ? product.nextMonthScore
        : mode === "quarter"
          ? product.nextQuarterScore
          : product.salesSignal;
  const label =
    mode === "profit"
      ? "利潤指數"
      : mode === "month"
        ? "下月大賣分"
        : mode === "quarter"
          ? "下季大賣分"
          : "熱銷分";

  return (
    <article className="glass overflow-hidden rounded-3xl">
      <div className="grid gap-0 sm:grid-cols-[170px_1fr]">
        <div className="min-h-[160px] bg-slate-900">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} className="h-full min-h-[160px] w-full object-cover" />
          ) : (
            <div className="grid h-full min-h-[160px] place-items-center text-slate-500">No Image</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-blue-200">{product.marketplace} / {product.keyword}</p>
              <h3 className="mt-1 line-clamp-2 text-lg font-black text-white">{product.title}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${confidenceTone(product.confidence)}`}>
              可信度 {product.confidence}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="價格" value={money(product.price)} />
            <MiniMetric label={label} value={mainScore.toFixed(1)} tone={scoreTone(mainScore)} />
            <MiniMetric label="單件毛利估" value={money(product.estimatedUnitProfit)} />
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-300">{product.salesSignalLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-blue-400/15 px-3 py-1 text-blue-100">{product.group}</span>
            <span className="rounded-full bg-slate-700/60 px-3 py-1 text-slate-200">估毛利率 {Math.round(product.marginRate * 100)}%</span>
            {product.discountPct > 0 ? <span className="rounded-full bg-rose-400/15 px-3 py-1 text-rose-200">折扣 {pct(product.discountPct)}</span> : null}
          </div>
          <a href={product.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-blue-200">
            查看商品來源 <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

function MiniMetric({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone}`}>{value}</p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, tone = "text-white" }: { icon: typeof ShoppingBag; label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-blue-300" />
        <p className="text-sm text-slate-400">{label}</p>
      </div>
      <p className={`mt-4 text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{sub}</p>
    </div>
  );
}

function ProductTable({ products }: { products: CommerceProduct[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-700/70">
      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-950 text-slate-300">
            <tr>
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">價格</th>
              <th className="px-4 py-3">熱銷分</th>
              <th className="px-4 py-3">利潤指數</th>
              <th className="px-4 py-3">下月</th>
              <th className="px-4 py-3">下季</th>
              <th className="px-4 py-3">來源</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={`${product.source}-${product.id}`} className="border-t border-slate-800/80 odd:bg-slate-950/25">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /> : null}
                    <div>
                      <p className="line-clamp-2 font-bold text-white">{product.title}</p>
                      <p className="text-xs text-slate-500">{product.group} / {product.keyword}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold text-white">{money(product.price)}</td>
                <td className="px-4 py-3 text-emerald-300">{product.salesSignal.toFixed(1)}</td>
                <td className="px-4 py-3 text-amber-300">{product.estimatedProfitIndex.toFixed(1)}</td>
                <td className="px-4 py-3">{product.nextMonthScore.toFixed(1)}</td>
                <td className="px-4 py-3">{product.nextQuarterScore.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <a className="text-blue-300 hover:text-blue-200" href={product.url} target="_blank" rel="noreferrer">
                    PChome
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EcommerceRadarClient() {
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [report, setReport] = useState<CommerceRadarReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRadar(nextKeywords = keywords) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/ecommerce/radar?keywords=${encodeURIComponent(nextKeywords)}&perKeywordLimit=8`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "電商雷達讀取失敗");
      setReport(payload as CommerceRadarReport);
    } catch (radarError) {
      setError(radarError instanceof Error ? radarError.message : "電商雷達讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRadar(DEFAULT_KEYWORDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topSales = report?.topSales[0];
  const topProfit = report?.topProfit[0];
  const topMonth = report?.nextMonthWinners[0];
  const topQuarter = report?.nextQuarterWinners[0];
  const allProducts = useMemo(() => [...(report?.products || [])].sort((a, b) => b.salesSignal - a.salesSignal), [report]);

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm text-blue-300">E-Commerce Intelligence Radar</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white md:text-4xl">
              <ShoppingBag className="h-8 w-8 text-blue-300" />
              電商銷售數據雷達
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
              使用 PChome 24h 公開搜尋資料即時掃描商品、價格、折扣、搜尋池與熱銷排序。銷售量欄位以「熱銷排序訊號」呈現；
              若要真正成交件數與實際利潤，需要再接你的店鋪訂單、成本、平台費與廣告費。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadRadar()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            重新撈取即時資料
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-sm font-bold text-slate-300">掃描關鍵字</span>
            <textarea
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadRadar()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-5 py-3 font-black text-slate-100 transition hover:bg-slate-800 disabled:opacity-60 lg:self-end"
          >
            <Search className="h-4 w-4" />
            用這組關鍵字掃描
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-5 text-rose-100">
          <p className="font-black">資料讀取失敗</p>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-black text-white">資料正確性提醒</p>
            <p className="mt-1">
              商品與價格是真實公開資料；實際銷量、實際成本、平台抽成、廣告費與退貨率不是公開資訊，所以本頁不會捏造「賣幾件」。
              目前用熱銷排序、搜尋池大小、折扣與季節性推估，下方每個商品都會標示可信度。
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={TrendingUp} label="目前銷售熱度最大" value={topSales?.title || (loading ? "讀取中" : "-")} sub={topSales ? `${topSales.salesSignalLabel}，熱銷分 ${topSales.salesSignal}` : "依 PChome 熱銷排序訊號"} tone="text-emerald-300" />
        <SummaryCard icon={DollarSign} label="估算利潤最高" value={topProfit?.title || (loading ? "讀取中" : "-")} sub={topProfit ? `利潤指數 ${topProfit.estimatedProfitIndex}，單件毛利估 ${money(topProfit.estimatedUnitProfit)}` : "依價格、估毛利率與熱銷分"} tone="text-amber-300" />
        <SummaryCard icon={CalendarClock} label="下個月可能大賣" value={topMonth?.title || (loading ? "讀取中" : "-")} sub={topMonth ? `下月大賣分 ${topMonth.nextMonthScore}，分類 ${topMonth.group}` : "依熱度、價格帶與季節性"} tone="text-blue-200" />
        <SummaryCard icon={ShoppingBag} label="下一季可能大賣" value={topQuarter?.title || (loading ? "讀取中" : "-")} sub={topQuarter ? `下季大賣分 ${topQuarter.nextQuarterScore}，可信度 ${topQuarter.confidence}` : "依 Q4/季節性題材推估"} tone="text-fuchsia-200" />
      </section>

      {report ? (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white">目前熱銷榜</h2>
              {report.topSales.slice(0, 3).map((product) => <ProductCard key={`sales-${product.id}`} product={product} mode="sales" />)}
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white">估算利潤榜</h2>
              {report.topProfit.slice(0, 3).map((product) => <ProductCard key={`profit-${product.id}`} product={product} mode="profit" />)}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white">下個月爆品候選</h2>
              {report.nextMonthWinners.slice(0, 3).map((product) => <ProductCard key={`month-${product.id}`} product={product} mode="month" />)}
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white">下一季爆品候選</h2>
              {report.nextQuarterWinners.slice(0, 3).map((product) => <ProductCard key={`quarter-${product.id}`} product={product} mode="quarter" />)}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-slate-400">All Products</p>
                <h2 className="text-2xl font-black text-white">全部商品雷達表</h2>
              </div>
              <p className="text-sm text-slate-400">更新：{dateTime(report.updatedAt)} / 掃描 {report.products.length} 件</p>
            </div>
            <div className="mt-4">
              <ProductTable products={allProducts} />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black text-white">資料來源狀態</h2>
              <div className="mt-4 space-y-2">
                {report.sources.map((source) => (
                  <div key={source.source} className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-white">{source.source}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${source.ok ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
                        {source.ok ? "成功" : "失敗"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{source.message}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black text-white">限制與下一步</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                {report.limitations.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </section>
        </>
      ) : (
        <section className="glass rounded-3xl p-8 text-center text-slate-300">
          {loading ? "正在撈取 PChome 即時公開資料..." : "尚無資料"}
        </section>
      )}
    </div>
  );
}

