"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, DollarSign, ExternalLink, PackageCheck, RefreshCw, ShieldCheck, ShoppingBag, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ECOMMERCE_PARENT_CATEGORY_LINKS, findEcommerceParentCategory } from "@/lib/ecommerce-radar";
import type { CategoryProductRanking, CommerceProduct, CommerceRadarReport, EcommerceParentCategoryLink } from "@/lib/ecommerce-radar";

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

function matchesParentCategory(product: CommerceProduct, category: EcommerceParentCategoryLink) {
  return category.parentCategories.includes(product.parentCategory);
}

function matchesRankingParent(item: CategoryProductRanking, category: EcommerceParentCategoryLink) {
  return category.parentCategories.includes(item.parentCategory);
}

function categoryHotTrialScore(product: CommerceProduct) {
  return product.categoryTrialScore * 0.66 + (product.crossPlatformHotScore || product.salesSignal) * 0.34;
}

function MiniMetric({ label, value, tone = "text-white", sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs leading-5 text-slate-500">{sub}</p> : null}
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, sub, tone = "text-white" }: { icon: typeof ShoppingBag; label: string; value: string; sub: string; tone?: string }) {
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

function CategoryProductCard({ product }: { product: CommerceProduct }) {
  return (
    <article className="glass overflow-hidden rounded-3xl">
      <div className="grid gap-0 lg:grid-cols-[180px_1fr]">
        <div className="min-h-[180px] bg-slate-900">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} className="h-full min-h-[180px] w-full object-cover" />
          ) : (
            <div className="grid h-full min-h-[180px] place-items-center text-slate-500">No Image</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs text-blue-200">{product.marketplace} / {product.keyword}</p>
              <h3 className="mt-1 line-clamp-2 text-lg font-black text-white">{product.title}</h3>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${confidenceTone(product.confidence)}`}>資料 {product.confidence}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${confidenceTone(product.categoryConfidence)}`}>分類 {product.categoryConfidence}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MiniMetric label="跨平台熱賣" value={`#${product.crossPlatformHotRank || "-"}`} tone={scoreTone(product.crossPlatformHotScore || product.salesSignal)} sub={`綜合分 ${score(product.crossPlatformHotScore || product.salesSignal)}`} />
            <MiniMetric label="分類試賣分" value={score(product.categoryTrialScore)} tone={scoreTone(product.categoryTrialScore)} sub={`分類內第 ${product.categoryRank || "-"} 名`} />
            <MiniMetric label="AI 選品分" value={score(product.selectionScore)} tone={scoreTone(product.selectionScore)} sub={product.selectionAdvice} />
            <MiniMetric label="平台銷售價" value={money(product.sellingPrice)} sub={product.sellingPriceSource} />
            <MiniMetric label="估進貨價" value={money(product.estimatedPurchasePrice)} sub={product.purchasePriceSource} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="價差毛利" value={money(product.grossSpread)} tone={profitTone(product.grossSpread)} sub={`毛利率 ${pct(product.grossSpreadPct)}`} />
            <MiniMetric label="估淨利" value={money(product.estimatedNetProfit)} tone={profitTone(product.estimatedNetProfit)} sub={`淨利率 ${pct(product.estimatedNetMarginRate)}`} />
            <MiniMetric label="回購分" value={score(product.repurchaseScore)} tone={scoreTone(product.repurchaseScore)} sub={`低售服回購 ${score(product.lowServiceRepeatScore)}`} />
            <MiniMetric label="尺寸" value={product.sizeLabel} tone={scoreTone(product.sizeScore)} sub={product.sizeReason} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="季節熱賣" value={score(product.seasonalHotScore)} tone={scoreTone(product.seasonalHotScore)} sub={product.seasonalReason} />
            <MiniMetric label="低成本高毛利" value={score(product.lowCostHighMarginScore)} tone={scoreTone(product.lowCostHighMarginScore)} sub={`成本 ${money(product.estimatedProductCost)}`} />
            <MiniMetric label="售服負擔" value={product.afterSalesBurden} tone={product.afterSalesBurden === "低" ? "text-emerald-300" : product.afterSalesBurden === "中" ? "text-amber-300" : "text-rose-300"} sub={`低售服分 ${score(product.lowAfterSalesScore)}`} />
            <MiniMetric label="下月 / 下季" value={`${score(product.nextMonthScore)} / ${score(product.nextQuarterScore)}`} sub="爆品候選分" />
          </div>

          {product.isHealthSupplement ? (
            <div className="mt-3 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <MiniMetric label="保健品類別" value={product.healthSupplementType} />
                <MiniMetric label="廣告風險" value={`${product.healthAdRiskLevel} ${score(product.healthAdRiskScore)}`} tone={product.healthAdRiskScore >= 65 ? "text-rose-300" : product.healthAdRiskScore >= 45 ? "text-amber-300" : "text-emerald-300"} sub={product.healthAdRiskReason} />
                <MiniMetric label="保健機會分" value={score(product.healthOpportunityScore)} tone={scoreTone(product.healthOpportunityScore)} />
              </div>
              <p className="mt-3 text-xs leading-5 text-amber-100">注意：{product.healthAdAttentionNotes.slice(0, 2).join("；")}</p>
            </div>
          ) : null}

          <p className="mt-3 text-sm leading-6 text-slate-300">{product.crossPlatformHotReason || product.salesSignalLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-100">跨平台 #{product.crossPlatformHotRank || "-"} / {score(product.crossPlatformHotScore || product.salesSignal)}</span>
            <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-cyan-100">{product.crossPlatformCoverage?.join(" / ") || product.marketplace}</span>
            <span className="rounded-full bg-blue-400/15 px-3 py-1 text-blue-100">{product.parentCategory}</span>
            <span className="rounded-full bg-indigo-400/15 px-3 py-1 text-indigo-100">{product.category}</span>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-100">{product.selectionAdvice}</span>
            {product.isLifestyleSmallItem ? <span className="rounded-full bg-teal-400/15 px-3 py-1 text-teal-100">生活小物 {score(product.compactLifestyleScore)}</span> : null}
          </div>
          <a href={product.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-blue-200">
            查看商品來源 <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

function RankingGroupCard({ item }: { item: CategoryProductRanking }) {
  return (
    <article className="rounded-3xl border border-blue-400/25 bg-blue-400/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-blue-200">{item.parentCategory}</p>
          <h3 className="mt-1 text-lg font-black text-white">{item.category}</h3>
        </div>
        <span className="rounded-full bg-blue-400/15 px-3 py-1 text-xs font-black text-blue-100">{item.productCount} 件</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric label="平均試賣分" value={score(item.averageTrialScore)} tone={scoreTone(item.averageTrialScore)} />
        <MiniMetric label="最高試賣分" value={score(item.topTrialScore)} tone={scoreTone(item.topTrialScore)} />
        <MiniMetric label="平均售價" value={money(item.averageSellingPrice)} />
        <MiniMetric label="平均估進貨" value={money(item.averageEstimatedPurchasePrice)} />
      </div>
      <div className="mt-4 space-y-2">
        {item.products.slice(0, 4).map((product) => (
          <a
            key={`${product.source}-${product.id}`}
            href={product.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3 transition hover:border-blue-300/60"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="line-clamp-2 text-sm font-black text-white">#{product.categoryRank} {product.title}</p>
                <p className="mt-1 text-xs text-slate-400">{product.marketplace}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[260px]">
                <span className="rounded-xl bg-emerald-400/10 px-2 py-1 text-emerald-100">試賣 {score(product.categoryTrialScore)}</span>
                <span className="rounded-xl bg-cyan-400/10 px-2 py-1 text-cyan-100">熱賣 #{product.crossPlatformHotRank || "-"} / {score(product.crossPlatformHotScore || product.salesSignal)}</span>
                <span className="rounded-xl bg-blue-400/10 px-2 py-1 text-blue-100">售價 {money(product.sellingPrice)}</span>
                <span className="rounded-xl bg-lime-400/10 px-2 py-1 text-lime-100">進貨 {money(product.estimatedPurchasePrice)}</span>
                <span className="rounded-xl bg-amber-400/10 px-2 py-1 text-amber-100">毛利 {money(product.grossSpread)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </article>
  );
}

export function EcommerceCategoryPageClient({ slug }: { slug: string }) {
  const category = findEcommerceParentCategory(slug);
  const [report, setReport] = useState<CommerceRadarReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCategory() {
    if (!category) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        keywords: category.keywords,
        perKeywordLimit: "8",
        includeExternalSources: "1"
      });
      const response = await fetch(`/api/ecommerce/radar?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "分類雷達讀取失敗");
      setReport(payload as CommerceRadarReport);
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : "分類雷達讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const products = useMemo(() => {
    if (!report || !category) return [];
    return report.products
      .filter((product) => matchesParentCategory(product, category))
      .sort((a, b) => categoryHotTrialScore(b) - categoryHotTrialScore(a));
  }, [category, report]);

  const rankingGroups = useMemo(() => {
    if (!report || !category) return [];
    return report.categoryProductRankings.filter((item) => matchesRankingParent(item, category));
  }, [category, report]);

  const topSelection = products[0];
  const topProfit = [...products].sort((a, b) => b.estimatedNetProfit - a.estimatedNetProfit)[0];
  const topRepeat = [...products].sort((a, b) => b.lowServiceRepeatScore - a.lowServiceRepeatScore)[0];
  const topSeasonal = [...products].sort((a, b) => b.seasonalHotScore - a.seasonalHotScore)[0];
  const averageTrialScore = products.length ? products.reduce((sum, product) => sum + product.categoryTrialScore, 0) / products.length : 0;
  const averageNetMarginRate = products.length ? products.reduce((sum, product) => sum + product.estimatedNetMarginRate, 0) / products.length : 0;

  if (!category) {
    return (
      <div className="space-y-6">
        <Link href="/ecommerce-radar" className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-blue-200">
          <ArrowLeft className="h-4 w-4" /> 回電商雷達
        </Link>
        <section className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-8 text-rose-100">
          找不到這個商品分類，請回電商雷達首頁重新選擇。
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-5">
        <Link href="/ecommerce-radar" className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-blue-200">
          <ArrowLeft className="h-4 w-4" /> 回電商雷達
        </Link>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-blue-300">Category Radar</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white md:text-4xl">
              <ShoppingBag className="h-8 w-8 text-blue-300" />
              {category.label}分類雷達
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">{category.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {category.keywords.split(",").slice(0, 10).map((keyword) => (
                <span key={keyword} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">{keyword}</span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadCategory()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            重新撈取此分類
          </button>
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-slate-400">切換分類</p>
            <h2 className="text-2xl font-black text-white">其他分類次頁</h2>
          </div>
          <p className="text-sm text-slate-400">更新：{report ? dateTime(report.updatedAt) : loading ? "讀取中" : "-"}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ECOMMERCE_PARENT_CATEGORY_LINKS.map((item) => (
            <Link
              key={item.slug}
              href={`/ecommerce-radar/category/${item.slug}`}
              className={`group rounded-2xl border px-4 py-3 transition ${
                item.slug === category.slug
                  ? "border-blue-300 bg-blue-500/20 text-white"
                  : "border-slate-700/70 bg-slate-950/35 text-slate-200 hover:border-blue-300/70 hover:bg-blue-500/10"
              }`}
            >
              <span className="flex items-center justify-between gap-2 font-black">
                {item.label}
                <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-blue-200" />
              </span>
              <span className="mt-1 block line-clamp-1 text-xs text-slate-400">{item.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-5 text-rose-100">
          <p className="font-black">資料讀取失敗</p>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile icon={BadgeCheck} label="此分類首選" value={topSelection?.title || (loading ? "讀取中" : "-")} sub={topSelection ? `試賣分 ${score(topSelection.categoryTrialScore)}，跨平台熱賣 ${score(topSelection.crossPlatformHotScore || topSelection.salesSignal)}，${topSelection.selectionAdvice}` : "依分類試賣分與跨平台熱賣排序"} tone="text-emerald-200" />
        <SummaryTile icon={DollarSign} label="估淨利最高" value={topProfit?.title || (loading ? "讀取中" : "-")} sub={topProfit ? `淨利 ${money(topProfit.estimatedNetProfit)}，淨利率 ${pct(topProfit.estimatedNetMarginRate)}` : "依成本模型推估"} tone="text-amber-200" />
        <SummaryTile icon={PackageCheck} label="低售服高回購" value={topRepeat?.title || (loading ? "讀取中" : "-")} sub={topRepeat ? `回購 ${score(topRepeat.repurchaseScore)}，售服 ${topRepeat.afterSalesBurden}` : "適合穩定測品"} tone="text-cyan-200" />
        <SummaryTile icon={TrendingUp} label="季節熱賣" value={topSeasonal?.title || (loading ? "讀取中" : "-")} sub={topSeasonal ? topSeasonal.seasonalReason : "依月份與分類季節性推估"} tone="text-orange-200" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniMetric label="此分類商品數" value={`${products.length} 件`} tone="text-blue-200" />
        <MiniMetric label="子分類數" value={`${rankingGroups.length} 類`} />
        <MiniMetric label="平均試賣分" value={score(averageTrialScore)} tone={scoreTone(averageTrialScore)} />
        <MiniMetric label="平均淨利率" value={pct(averageNetMarginRate)} tone={profitTone(averageNetMarginRate)} />
      </section>

      {category.slug === "health" ? (
        <section className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black text-white">保健食品廣告風險提醒</p>
              <p className="mt-1">此分類會另外扣除誇大療效、醫療功效暗示與高風險宣稱。上架前仍要人工核對標示、許可證與文案。</p>
            </div>
          </div>
        </section>
      ) : null}

      {report ? (
        <>
          <section className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-slate-400">Subcategory Rankings</p>
                <h2 className="text-2xl font-black text-white">{category.label}子分類排名</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  每個子分類都會列出平均試賣分、平均售價、估進貨價，以及分類內前幾名商品。
                </p>
              </div>
              <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm text-blue-100">
                共 {rankingGroups.length} 個子分類
              </div>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {rankingGroups.map((item) => <RankingGroupCard key={`${item.parentCategory}/${item.category}`} item={item} />)}
            </div>
          </section>

          <section className="space-y-4">
            <div className="glass rounded-3xl p-5">
              <p className="text-sm text-slate-400">Products</p>
              <h2 className="text-2xl font-black text-white">{category.label}商品試賣清單</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                依分類試賣分與跨平台熱賣程度排序，並同步顯示售價、估進貨價、毛利、淨利、回購、尺寸、季節與下月/下季分數。
              </p>
            </div>
            {products.length ? products.slice(0, 18).map((product) => (
              <CategoryProductCard key={`${product.source}-${product.id}`} product={product} />
            )) : (
              <section className="glass rounded-3xl p-8 text-center text-slate-300">
                這個分類目前沒有撈到可用商品，請按重新撈取，或到電商首頁調整關鍵字。
              </section>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black text-white">資料來源狀態</h2>
              <div className="mt-4 space-y-2">
                {report.sources.slice(0, 16).map((source) => (
                  <div key={source.source} className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-white">{source.source}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${source.ok ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
                        {source.ok ? "成功" : "失敗"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{source.message}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black text-white">判讀方式</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                <li>• 分類試賣分高：代表熱度、毛利、回購、尺寸與售服負擔相對均衡。</li>
                <li>• 估進貨價：目前用分類毛利模型反推，真正進貨前仍要拿供應商報價。</li>
                <li>• 小體積、低退貨、可重複購買，通常比大件高售服商品更適合先小量測試。</li>
                <li>• Amazon / 蝦皮若來源受限，頁面會標失敗，不會用假資料補價格或銷量。</li>
              </ul>
            </div>
          </section>
        </>
      ) : (
        <section className="glass rounded-3xl p-8 text-center text-slate-300">
          {loading ? "正在撈取此分類的公開商品資料..." : "尚無資料"}
        </section>
      )}
    </div>
  );
}
