"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, BadgeCheck, CalendarClock, DollarSign, ExternalLink, Filter, RefreshCw, Repeat2, Search, Settings2, ShieldCheck, ShoppingBag, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CommerceCategorySummary, CommerceProduct, CommerceRadarReport } from "@/lib/ecommerce-radar";

const DEFAULT_KEYWORDS = "藍牙耳機, 行動電源, 手機殼, 保護貼, 掃地機器人, 氣炸鍋, 除濕機, 空氣清淨機, 電競滑鼠, SSD, 咖啡機, 保健食品, 葉黃素, 魚油, 益生菌, 貓砂, 狗飼料, 尿布, 濕紙巾, 美妝保養, 防曬, 筋膜槍, 兒童玩具, 露營燈, 收納箱, 洗衣精, 衛生紙, 洗髮精, 牙膏, 零食, 咖啡豆, 車用吸塵器, 掛勾, 置物架, 廚房小物, 浴室收納, 電線收納, 保溫杯, 小夜燈, 防塵罩, 密封袋, 桌面收納";

type CostForm = {
  platformFeeRate: number;
  paymentFeeRate: number;
  shippingCost: number;
  adRate: number;
  returnReserveRate: number;
};

const DEFAULT_COST_FORM: CostForm = {
  platformFeeRate: 8,
  paymentFeeRate: 2,
  shippingCost: 60,
  adRate: 6,
  returnReserveRate: 3
};

function money(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString()} 元`;
}

function pct(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function score(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(1);
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

function scoreTone(value: number) {
  if (value >= 78) return "text-emerald-300";
  if (value >= 62) return "text-amber-300";
  return "text-slate-200";
}

function profitTone(value: number) {
  if (value > 0) return "text-emerald-300";
  if (value > -50) return "text-amber-300";
  return "text-rose-300";
}

function confidenceTone(confidence: CommerceProduct["confidence"] | CommerceProduct["categoryConfidence"]) {
  if (confidence === "高") return "bg-emerald-400/15 text-emerald-200";
  if (confidence === "中") return "bg-amber-400/15 text-amber-200";
  return "bg-slate-500/20 text-slate-200";
}

function SummaryCard({ icon: Icon, label, value, sub, tone = "text-white" }: { icon: LucideIcon; label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-blue-300" />
        <p className="text-sm text-slate-400">{label}</p>
      </div>
      <p className={`mt-4 line-clamp-2 text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{sub}</p>
    </div>
  );
}

function MiniMetric({ label, value, tone = "text-white", sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function CostInput({ label, value, suffix, min, max, step, onChange }: { label: string; value: number; suffix: string; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <div className="mt-2 flex items-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/60">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full bg-transparent px-3 py-2 text-sm font-bold text-white outline-none"
        />
        <span className="border-l border-slate-700 px-3 text-xs text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

function ProductCard({ product, mode }: { product: CommerceProduct; mode: "sales" | "profit" | "repeat" | "seasonal" | "margin" | "lifestyle" | "compact" | "selection" | "month" | "quarter" }) {
  const mainScore =
    mode === "profit"
      ? product.estimatedProfitIndex
      : mode === "repeat"
        ? product.lowServiceRepeatScore
      : mode === "seasonal"
        ? product.seasonalHotScore
      : mode === "margin"
        ? product.lowCostHighMarginScore
      : mode === "lifestyle"
        ? product.lifestyleScore
      : mode === "compact"
        ? product.compactLifestyleScore
      : mode === "selection"
        ? product.selectionScore
      : mode === "month"
        ? product.nextMonthScore
        : mode === "quarter"
          ? product.nextQuarterScore
          : product.salesSignal;
  const label =
    mode === "profit"
      ? "利潤指數"
      : mode === "repeat"
        ? "低售服回購分"
      : mode === "seasonal"
        ? "季節熱賣分"
      : mode === "margin"
        ? "低成本高毛利分"
      : mode === "lifestyle"
        ? "生活小物分"
      : mode === "compact"
        ? "小物精選分"
      : mode === "selection"
        ? "AI 選品分"
      : mode === "month"
        ? "下月大賣分"
        : mode === "quarter"
          ? "下季大賣分"
          : "熱銷分";

  return (
    <article className="glass overflow-hidden rounded-3xl">
      <div className="grid gap-0 sm:grid-cols-[170px_1fr]">
        <div className="min-h-[170px] bg-slate-900">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} className="h-full min-h-[170px] w-full object-cover" />
          ) : (
            <div className="grid h-full min-h-[170px] place-items-center text-slate-500">No Image</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-blue-200">{product.marketplace} / {product.keyword}</p>
              <h3 className="mt-1 line-clamp-2 text-lg font-black text-white">{product.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${confidenceTone(product.confidence)}`}>
                資料 {product.confidence}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${confidenceTone(product.categoryConfidence)}`}>
                分類 {product.categoryConfidence}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="售價" value={money(product.price)} />
            <MiniMetric label={label} value={score(mainScore)} tone={scoreTone(mainScore)} />
            <MiniMetric label="估淨利" value={money(product.estimatedNetProfit)} tone={profitTone(product.estimatedNetProfit)} sub={`淨利率 ${pct(product.estimatedNetMarginRate)}`} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="進貨成本估" value={money(product.estimatedProductCost)} sub={`成本率 ${pct(product.costRate)}`} />
            <MiniMetric label="總成本估" value={money(product.estimatedTotalCost)} sub={`損平 ${money(product.breakEvenPrice)}`} />
            <MiniMetric label="費用合計" value={money(product.estimatedPlatformFee + product.estimatedPaymentFee + product.estimatedShippingCost + product.estimatedAdCost + product.estimatedReturnReserve)} sub="平台/金流/物流/廣告/退貨" />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="回購分" value={score(product.repurchaseScore)} tone={scoreTone(product.repurchaseScore)} sub="消耗品/定期購買加分" />
            <MiniMetric label="售服負擔" value={product.afterSalesBurden} tone={product.afterSalesBurden === "低" ? "text-emerald-300" : product.afterSalesBurden === "中" ? "text-amber-300" : "text-rose-300"} sub={`低售服分 ${score(product.lowAfterSalesScore)}`} />
            <MiniMetric label="低售服回購分" value={score(product.lowServiceRepeatScore)} tone={scoreTone(product.lowServiceRepeatScore)} sub="回購/售服/熱度/淨利綜合" />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="季節熱賣分" value={score(product.seasonalHotScore)} tone={scoreTone(product.seasonalHotScore)} sub={product.seasonalReason} />
            <MiniMetric label="低成本高毛利" value={score(product.lowCostHighMarginScore)} tone={scoreTone(product.lowCostHighMarginScore)} sub={`估毛利 ${money(product.estimatedGrossProfit)}`} />
            <MiniMetric label="生活小物分" value={score(product.lifestyleScore)} tone={scoreTone(product.lifestyleScore)} sub={product.lifestyleReason} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="尺寸等級" value={product.sizeLabel} tone={scoreTone(product.sizeScore)} sub={`尺寸分 ${score(product.sizeScore)}`} />
            <MiniMetric label="AI 選品分" value={score(product.selectionScore)} tone={scoreTone(product.selectionScore)} sub={product.selectionAdvice} />
            <MiniMetric label="尺寸理由" value={product.sizeClass === "large" ? "需控風險" : "適合測品"} sub={product.sizeReason} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MiniMetric label="小物精選分" value={score(product.compactLifestyleScore)} tone={scoreTone(product.compactLifestyleScore)} sub="低售價 / 低成本 / 高回購 / 小體積" />
            <MiniMetric label="小物推薦理由" value={product.sizeClass === "large" ? "排除大型" : "符合小物"} sub={product.compactLifestyleReason} />
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-300">{product.salesSignalLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-blue-400/15 px-3 py-1 text-blue-100">{product.parentCategory}</span>
            <span className="rounded-full bg-indigo-400/15 px-3 py-1 text-indigo-100">{product.category}</span>
            <span className="rounded-full bg-slate-700/60 px-3 py-1 text-slate-200">預設毛利 {pct(product.grossMarginRate)}</span>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-100">回購 {score(product.repurchaseScore)}</span>
            <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-cyan-100">售服 {product.afterSalesBurden}</span>
            <span className="rounded-full bg-orange-400/15 px-3 py-1 text-orange-100">季節 {score(product.seasonalHotScore)}</span>
            <span className="rounded-full bg-lime-400/15 px-3 py-1 text-lime-100">低成本高毛利 {score(product.lowCostHighMarginScore)}</span>
            <span className="rounded-full bg-sky-400/15 px-3 py-1 text-sky-100">尺寸 {product.sizeLabel} {score(product.sizeScore)}</span>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-100">選品 {score(product.selectionScore)} / {product.selectionAdvice}</span>
            {product.isLifestyleSmallItem ? <span className="rounded-full bg-teal-400/15 px-3 py-1 text-teal-100">小物精選 {score(product.compactLifestyleScore)}</span> : null}
            {product.isLifestyleSmallItem ? <span className="rounded-full bg-violet-400/15 px-3 py-1 text-violet-100">生活小物 {score(product.lifestyleScore)}</span> : null}
            {product.discountPct > 0 ? <span className="rounded-full bg-rose-400/15 px-3 py-1 text-rose-200">折扣 {product.discountPct.toFixed(1)}%</span> : null}
          </div>
          <a href={product.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-blue-200">
            查看商品來源 <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

function CategoryCard({ item }: { item: CommerceCategorySummary }) {
  return (
    <article className="rounded-3xl border border-slate-700/70 bg-slate-950/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{item.parentCategory}</p>
          <h3 className="mt-1 text-lg font-black text-white">{item.category}</h3>
        </div>
        <span className="rounded-full bg-blue-400/15 px-3 py-1 text-xs font-black text-blue-100">{item.productCount} 件</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniMetric label="均價" value={money(item.averagePrice)} />
        <MiniMetric label="平均熱銷分" value={score(item.averageSalesSignal)} tone={scoreTone(item.averageSalesSignal)} />
        <MiniMetric label="平均淨利率" value={pct(item.averageNetMarginRate)} tone={profitTone(item.averageNetMarginRate)} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <MiniMetric label="平均回購分" value={score(item.averageRepurchaseScore)} tone={scoreTone(item.averageRepurchaseScore)} />
        <MiniMetric label="平均低售服分" value={score(item.averageLowAfterSalesScore)} tone={scoreTone(item.averageLowAfterSalesScore)} />
        <MiniMetric label="低售服回購分" value={score(item.averageLowServiceRepeatScore)} tone={scoreTone(item.averageLowServiceRepeatScore)} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <MiniMetric label="平均季節熱賣分" value={score(item.averageSeasonalHotScore)} tone={scoreTone(item.averageSeasonalHotScore)} />
        <MiniMetric label="平均低成本高毛利" value={score(item.averageLowCostHighMarginScore)} tone={scoreTone(item.averageLowCostHighMarginScore)} />
      </div>
      {item.bestProductTitle ? (
        <a href={item.bestProductUrl} target="_blank" rel="noreferrer" className="mt-3 block line-clamp-2 text-sm font-bold text-blue-300 hover:text-blue-200">
          高利潤代表：{item.bestProductTitle}
        </a>
      ) : null}
    </article>
  );
}

function ProductTable({ products }: { products: CommerceProduct[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-700/70">
      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[2040px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-950 text-slate-300">
            <tr>
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">分類</th>
              <th className="px-4 py-3">售價</th>
              <th className="px-4 py-3">進貨成本</th>
              <th className="px-4 py-3">估毛利</th>
              <th className="px-4 py-3">總成本</th>
              <th className="px-4 py-3">估淨利</th>
              <th className="px-4 py-3">季節熱賣</th>
              <th className="px-4 py-3">低成本高毛利</th>
              <th className="px-4 py-3">生活小物</th>
              <th className="px-4 py-3">小物精選</th>
              <th className="px-4 py-3">尺寸</th>
              <th className="px-4 py-3">選品分</th>
              <th className="px-4 py-3">選品建議</th>
              <th className="px-4 py-3">回購分</th>
              <th className="px-4 py-3">售服負擔</th>
              <th className="px-4 py-3">低售服回購</th>
              <th className="px-4 py-3">熱銷分</th>
              <th className="px-4 py-3">下月</th>
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
                      <p className="text-xs text-slate-500">{product.keyword}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-white">{product.category}</p>
                  <p className="text-xs text-slate-500">{product.parentCategory}</p>
                </td>
                <td className="px-4 py-3 font-bold text-white">{money(product.price)}</td>
                <td className="px-4 py-3">{money(product.estimatedProductCost)}</td>
                <td className="px-4 py-3 text-lime-300">{money(product.estimatedGrossProfit)}</td>
                <td className="px-4 py-3">{money(product.estimatedTotalCost)}</td>
                <td className={`px-4 py-3 font-black ${profitTone(product.estimatedNetProfit)}`}>{money(product.estimatedNetProfit)} <span className="text-xs">({pct(product.estimatedNetMarginRate)})</span></td>
                <td className="px-4 py-3 text-orange-300">{score(product.seasonalHotScore)}</td>
                <td className="px-4 py-3 text-lime-300">{score(product.lowCostHighMarginScore)}</td>
                <td className="px-4 py-3 text-violet-300">{product.isLifestyleSmallItem ? score(product.lifestyleScore) : "-"}</td>
                <td className="px-4 py-3 text-teal-300">{product.isLifestyleSmallItem ? score(product.compactLifestyleScore) : "-"}</td>
                <td className="px-4 py-3 text-sky-300">{product.sizeLabel} <span className="text-xs text-slate-500">({score(product.sizeScore)})</span></td>
                <td className="px-4 py-3 text-emerald-300">{score(product.selectionScore)}</td>
                <td className="px-4 py-3 font-black text-white">{product.selectionAdvice}</td>
                <td className="px-4 py-3 text-emerald-300">{score(product.repurchaseScore)}</td>
                <td className={`px-4 py-3 font-black ${product.afterSalesBurden === "低" ? "text-emerald-300" : product.afterSalesBurden === "中" ? "text-amber-300" : "text-rose-300"}`}>{product.afterSalesBurden}</td>
                <td className="px-4 py-3 text-cyan-300">{score(product.lowServiceRepeatScore)}</td>
                <td className="px-4 py-3 text-emerald-300">{score(product.salesSignal)}</td>
                <td className="px-4 py-3">{score(product.nextMonthScore)}</td>
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
  const [costForm, setCostForm] = useState<CostForm>(DEFAULT_COST_FORM);
  const [includeExternalSources, setIncludeExternalSources] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [report, setReport] = useState<CommerceRadarReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRadar(nextKeywords = keywords, nextCostForm = costForm) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        keywords: nextKeywords,
        perKeywordLimit: "8",
        platformFeeRate: String(nextCostForm.platformFeeRate / 100),
        paymentFeeRate: String(nextCostForm.paymentFeeRate / 100),
        shippingCost: String(nextCostForm.shippingCost),
        adRate: String(nextCostForm.adRate / 100),
        returnReserveRate: String(nextCostForm.returnReserveRate / 100),
        includeExternalSources: includeExternalSources ? "1" : "0"
      });
      const response = await fetch(`/api/ecommerce/radar?${params.toString()}`, { cache: "no-store" });
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
    void loadRadar(DEFAULT_KEYWORDS, DEFAULT_COST_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryOptions = useMemo(() => {
    const rows = report?.categorySummary || [];
    return ["全部", ...rows.map((item) => `${item.parentCategory}/${item.category}`)];
  }, [report]);

  const filteredProducts = useMemo(() => {
    const products = [...(report?.products || [])].sort((a, b) => b.salesSignal - a.salesSignal);
    if (categoryFilter === "全部") return products;
    return products.filter((product) => `${product.parentCategory}/${product.category}` === categoryFilter);
  }, [categoryFilter, report]);

  const topSales = report?.topSales[0];
  const topProfit = report?.topProfit[0];
  const topRepeat = report?.lowServiceHighRepurchase[0];
  const topSeasonal = report?.seasonalHotProducts[0];
  const topMargin = report?.lowCostHighMarginProducts[0];
  const topLifestyle = report?.lifestyleLowCostHighProfitProducts[0];
  const topCompactLifestyle = report?.compactLifestyleRecommendations[0];
  const topSelection = report?.productSelectionRecommendations[0];
  const topMonth = report?.nextMonthWinners[0];
  const topQuarter = report?.nextQuarterWinners[0];

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
              新增更多商品分類、生活小物統計、成本拆解、低售服負擔與高回購率判斷：進貨成本、平台費、金流費、物流、廣告、退貨準備金都會列入估算。
              商品資料優先使用 PChome 24h 公開搜尋，並盡量嘗試蝦皮公開端點與拼多多來源狀態；成本與回購率為模型估算，之後可接你的真實進貨、訂單與客服報表。
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

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <label className="block">
            <span className="text-sm font-bold text-slate-300">掃描關鍵字</span>
            <textarea
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400"
            />
          </label>

          <div className="rounded-3xl border border-slate-700/70 bg-slate-950/35 p-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-300" />
              <h2 className="font-black text-white">成本參數</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CostInput label="平台費" value={costForm.platformFeeRate} suffix="%" min={0} max={35} step={0.5} onChange={(value) => setCostForm((current) => ({ ...current, platformFeeRate: value }))} />
              <CostInput label="金流費" value={costForm.paymentFeeRate} suffix="%" min={0} max={12} step={0.5} onChange={(value) => setCostForm((current) => ({ ...current, paymentFeeRate: value }))} />
              <CostInput label="平均物流" value={costForm.shippingCost} suffix="元" min={0} max={500} step={10} onChange={(value) => setCostForm((current) => ({ ...current, shippingCost: value }))} />
              <CostInput label="廣告費率" value={costForm.adRate} suffix="%" min={0} max={50} step={0.5} onChange={(value) => setCostForm((current) => ({ ...current, adRate: value }))} />
              <CostInput label="退貨準備" value={costForm.returnReserveRate} suffix="%" min={0} max={30} step={0.5} onChange={(value) => setCostForm((current) => ({ ...current, returnReserveRate: value }))} />
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200">
                <span>
                  嘗試外部來源
                  <span className="mt-1 block text-xs font-normal text-slate-500">蝦皮公開搜尋、拼多多來源狀態</span>
                </span>
                <input
                  type="checkbox"
                  checked={includeExternalSources}
                  onChange={(event) => setIncludeExternalSources(event.target.checked)}
                  className="h-5 w-5 accent-blue-500"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadRadar()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-5 py-3 font-black text-slate-100 transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                套用成本並掃描
              </button>
            </div>
          </div>
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
            <p className="font-black text-white">成本估算提醒</p>
            <p className="mt-1">
              進貨成本依分類毛利率反推，平台費、金流費、物流、廣告、退貨準備金可自行調整。這不是你的真實帳務成本；
              若要精準判斷利潤最高商品，下一步要匯入進貨成本、訂單、廣告與退貨資料。
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-10">
        <SummaryCard icon={BadgeCheck} label="AI 選品首選" value={topSelection?.title || (loading ? "讀取中" : "-")} sub={topSelection ? `選品分 ${score(topSelection.selectionScore)}，${topSelection.selectionAdvice}，尺寸 ${topSelection.sizeLabel}` : "依季節、回購、成本、毛利、尺寸與售後評分"} tone="text-emerald-200" />
        <SummaryCard icon={ShoppingBag} label="低價小體積生活小物" value={topCompactLifestyle?.title || (loading ? "讀取中" : "-")} sub={topCompactLifestyle ? `小物精選分 ${score(topCompactLifestyle.compactLifestyleScore)}，售價 ${money(topCompactLifestyle.price)}，成本 ${money(topCompactLifestyle.estimatedProductCost)}，尺寸 ${topCompactLifestyle.sizeLabel}` : "低售價、低成本、高回購、非大型"} tone="text-teal-200" />
        <SummaryCard icon={TrendingUp} label="目前銷售熱度最大" value={topSales?.title || (loading ? "讀取中" : "-")} sub={topSales ? `${topSales.salesSignalLabel}，熱銷分 ${topSales.salesSignal}` : "依 PChome 熱銷排序訊號"} tone="text-emerald-300" />
        <SummaryCard icon={DollarSign} label="估算淨利最高" value={topProfit?.title || (loading ? "讀取中" : "-")} sub={topProfit ? `淨利 ${money(topProfit.estimatedNetProfit)}，淨利率 ${pct(topProfit.estimatedNetMarginRate)}` : "依成本模型與熱銷分"} tone="text-amber-300" />
        <SummaryCard icon={Repeat2} label="低售服高回購" value={topRepeat?.title || (loading ? "讀取中" : "-")} sub={topRepeat ? `回購分 ${score(topRepeat.repurchaseScore)}，售服 ${topRepeat.afterSalesBurden}，綜合 ${score(topRepeat.lowServiceRepeatScore)}` : "依回購、客服負擔、熱度與淨利"} tone="text-cyan-200" />
        <SummaryCard icon={CalendarClock} label="季節熱賣商品" value={topSeasonal?.title || (loading ? "讀取中" : "-")} sub={topSeasonal ? `季節分 ${score(topSeasonal.seasonalHotScore)}：${topSeasonal.seasonalReason}` : "依月份、類別與熱銷分"} tone="text-orange-200" />
        <SummaryCard icon={DollarSign} label="低成本高毛利" value={topMargin?.title || (loading ? "讀取中" : "-")} sub={topMargin ? `毛利 ${money(topMargin.estimatedGrossProfit)}，分數 ${score(topMargin.lowCostHighMarginScore)}` : "依成本率、毛利率與淨利率"} tone="text-lime-200" />
        <SummaryCard icon={ShoppingBag} label="生活小物低成本高獲利" value={topLifestyle?.title || (loading ? "讀取中" : "-")} sub={topLifestyle ? `生活小物分 ${score(topLifestyle.lifestyleScore)}，毛利 ${money(topLifestyle.estimatedGrossProfit)}` : "低單價、低售服、可測品"} tone="text-violet-200" />
        <SummaryCard icon={CalendarClock} label="下個月可能大賣" value={topMonth?.title || (loading ? "讀取中" : "-")} sub={topMonth ? `下月大賣分 ${topMonth.nextMonthScore}，分類 ${topMonth.category}` : "依熱度、成本與季節性"} tone="text-blue-200" />
        <SummaryCard icon={ShoppingBag} label="下一季可能大賣" value={topQuarter?.title || (loading ? "讀取中" : "-")} sub={topQuarter ? `下季大賣分 ${topQuarter.nextQuarterScore}，可信度 ${topQuarter.confidence}` : "依季節性與分類毛利推估"} tone="text-fuchsia-200" />
      </section>

      {report ? (
        <>
          <section className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-slate-400">AI Product Selection</p>
                <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                  <BadgeCheck className="h-6 w-6 text-emerald-300" />
                  AI 選品推薦
                </h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  依照季節性、回購率、低成本、毛利率、尺寸與售後負擔一起評分。小型、低單價、低退貨壓力、能重複購買且毛利足夠的商品會優先排在前面。
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                共推薦 {report.productSelectionRecommendations.length} 件可評估商品
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {report.productSelectionRecommendations.slice(0, 4).map((product) => (
                <div key={`selection-${product.source}-${product.id}`} className="space-y-3">
                  <ProductCard product={product} mode="selection" />
                  <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <p className="font-black text-emerald-100">推薦原因：{product.selectionAdvice}</p>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
                      {product.selectionReasons.map((reason) => <li key={reason}>• {reason}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-slate-400">Compact Lifestyle Picks</p>
                <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                  <ShoppingBag className="h-6 w-6 text-teal-300" />
                  低價小體積生活小物推薦
                </h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  這區只看生活小物，優先挑售價低、估成本低、回購率高、體積不要大的商品。大型品、物流壓力高或淨利為負的商品會被排除或降分。
                </p>
              </div>
              <div className="rounded-2xl border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-100">
                符合條件 {report.compactLifestyleRecommendations.length} 件
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {report.compactLifestyleRecommendations.slice(0, 6).map((product) => (
                <div key={`compact-${product.source}-${product.id}`} className="space-y-3">
                  <ProductCard product={product} mode="compact" />
                  <div className="rounded-3xl border border-teal-400/20 bg-teal-400/10 p-4">
                    <p className="font-black text-teal-100">符合原因</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{product.compactLifestyleReason}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-slate-400">Categories</p>
                <h2 className="text-2xl font-black text-white">分類雷達</h2>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/50 px-3 py-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="bg-transparent text-sm font-bold text-white outline-none"
                >
                  {categoryOptions.map((item) => <option key={item} value={item} className="bg-slate-950">{item}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {report.categorySummary.slice(0, 9).map((item) => <CategoryCard key={`${item.parentCategory}/${item.category}`} item={item} />)}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-slate-400">Lifestyle Small Items</p>
                <h2 className="text-2xl font-black text-white">生活小物類統計</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  這區專門統計低單價、低售服、低成本高毛利的生活小物，例如收納、掛勾、置物架、廚房小物、浴室收納、保溫杯、小夜燈、線材整理等。
                </p>
              </div>
              <div className="rounded-2xl border border-violet-400/30 bg-violet-400/10 px-4 py-3 text-sm text-violet-100">
                來源平台：{report.lifestyleSummary.marketplaces.length ? report.lifestyleSummary.marketplaces.join(" / ") : "尚無"}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MiniMetric label="生活小物數量" value={`${report.lifestyleSummary.productCount} 件`} tone="text-violet-200" />
              <MiniMetric label="平均售價" value={money(report.lifestyleSummary.averagePrice)} />
              <MiniMetric label="平均毛利率" value={pct(report.lifestyleSummary.averageGrossMarginRate)} tone="text-lime-300" />
              <MiniMetric label="平均淨利率" value={pct(report.lifestyleSummary.averageNetMarginRate)} tone={profitTone(report.lifestyleSummary.averageNetMarginRate)} />
              <MiniMetric label="平均生活小物分" value={score(report.lifestyleSummary.averageLifestyleScore)} tone={scoreTone(report.lifestyleSummary.averageLifestyleScore)} />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {report.lifestyleLowCostHighProfitProducts.slice(0, 4).map((product) => (
                <ProductCard key={`lifestyle-${product.source}-${product.id}`} product={product} mode="lifestyle" />
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white">目前熱銷榜</h2>
              {report.topSales.slice(0, 3).map((product) => <ProductCard key={`sales-${product.id}`} product={product} mode="sales" />)}
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white">估算淨利榜</h2>
              {report.topProfit.slice(0, 3).map((product) => <ProductCard key={`profit-${product.id}`} product={product} mode="profit" />)}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 text-cyan-300" />
              <div>
                <p className="text-sm text-slate-400">Low Service / High Repeat</p>
                <h2 className="text-2xl font-black text-white">低售服、高回購率商品</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  這裡優先找消耗型、定期補貨、客服/維修負擔低的商品。分數高不代表保證賣，但通常更適合做穩定現金流與長期品類經營。
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {report.lowServiceHighRepurchase.slice(0, 4).map((product) => <ProductCard key={`repeat-${product.id}`} product={product} mode="repeat" />)}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="glass rounded-3xl p-5">
                <p className="text-sm text-slate-400">Seasonal Demand</p>
                <h2 className="text-2xl font-black text-white">季節因素熱賣商品</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  依目前月份、分類季節字、熱銷排序、折扣與成本效率排序，適合拿來看短期活動檔期與季節性備貨。
                </p>
              </div>
              {report.seasonalHotProducts.slice(0, 3).map((product) => <ProductCard key={`seasonal-${product.id}`} product={product} mode="seasonal" />)}
            </div>
            <div className="space-y-4">
              <div className="glass rounded-3xl p-5">
                <p className="text-sm text-slate-400">Low Cost / High Margin</p>
                <h2 className="text-2xl font-black text-white">低成本高毛利獲利商品</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  依毛利率、淨利率、售價門檻、熱銷分與售服負擔排序，更適合找小資金可測、可複製上架的商品。
                </p>
              </div>
              {report.lowCostHighMarginProducts.slice(0, 3).map((product) => <ProductCard key={`margin-${product.id}`} product={product} mode="margin" />)}
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
                <h2 className="text-2xl font-black text-white">全部商品成本表</h2>
              </div>
              <p className="text-sm text-slate-400">更新：{dateTime(report.updatedAt)} / 顯示 {filteredProducts.length} 件</p>
            </div>
            <div className="mt-4">
              <ProductTable products={filteredProducts} />
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
