import { MetricCard } from "@/components/MetricCard";
import {
  marketMarginOverview,
  marketOverviewQuotes,
  type MarketMarginOverview,
  type MarketMarginWarning,
  type MarketQuote
} from "@/lib/real-data";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return value.toLocaleString("zh-TW", { maximumFractionDigits: value >= 100 ? 2 : 4 });
}

function formatChange(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMoney(value: number, signed = false) {
  const abs = Math.abs(value);
  const sign = signed ? (value > 0 ? "+" : value < 0 ? "-" : "") : value < 0 ? "-" : "";
  if (abs >= 100_000_000_000) return `${sign}${(abs / 100_000_000_000).toFixed(2)} 千億`;
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(2)} 億`;
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(2)} 萬`;
  return `${sign}${Math.round(abs).toLocaleString("zh-TW")} 元`;
}

function formatShares(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("zh-TW")} 張`;
}

function quoteTone(quote: MarketQuote) {
  if (quote.symbol === "^VIX") return quote.change >= 0 ? "warn" : "bull";
  return quote.change >= 0 ? "bull" : "bear";
}

function safetyTone(level: string) {
  if (level === "安全") return "bull";
  if (level === "危險" || level === "警戒") return "bear";
  if (level === "注意" || level === "資料不足") return "warn";
  return "neutral";
}

function warningClass(warning: MarketMarginWarning) {
  if (warning.severity === "danger") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  if (warning.severity === "warn") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
}

function marginWaterLevelText(level: string) {
  if (level === "安全") return "水位不擁擠";
  if (level === "注意") return "水位升溫";
  if (level === "警戒") return "水位偏高";
  if (level === "危險") return "水位過熱";
  return "資料不足";
}

function marginWaterExplanation(level: string) {
  if (level === "安全") return "只代表融資總量沒有過熱，不代表今天大盤安全。";
  if (level === "注意") return "融資水位開始升溫，追價部位要降低。";
  if (level === "警戒") return "融資籌碼偏熱，跌破支撐容易放大賣壓。";
  if (level === "危險") return "融資過熱，可能形成泡沫與多殺多風險。";
  return "官方資料不足，不能用融資判斷安全。";
}

function buildFinalSafetyDecision({
  marketStressLevel,
  marginLevel
}: {
  marketStressLevel: string;
  marginLevel: string;
}) {
  if (marketStressLevel === "危險") {
    return {
      label: "不安全",
      action: "先避險，不建議新買",
      tone: "danger" as const,
      explanation: "大盤急跌或期貨同步轉弱時，融資下降常是去槓桿，不是利多。"
    };
  }
  if (marketStressLevel === "警戒") {
    return {
      label: "不安全偏高",
      action: "等待止跌，不追價",
      tone: "danger" as const,
      explanation: "市場賣壓偏重，融資水位不能單獨當作買進依據。"
    };
  }
  if (marginLevel === "危險" || marginLevel === "警戒") {
    return {
      label: "不安全",
      action: "降低部位，避開高融資股",
      tone: "danger" as const,
      explanation: "融資水位本身偏高，容易形成泡沫，遇到下跌會放大多殺多。"
    };
  }
  if (marketStressLevel === "注意" || marginLevel === "注意") {
    return {
      label: "需觀察",
      action: "只看支撐，不追高",
      tone: "warn" as const,
      explanation: "市場或融資已有升溫訊號，可以觀察，但買進要更接近支撐並縮小部位。"
    };
  }
  return {
    label: "相對安全",
    action: "可依個股條件評估",
    tone: "info" as const,
    explanation: "大盤壓力與融資水位都未觸發警戒，但仍要看個股趨勢、支撐與風險報酬比。"
  };
}

function finalSafetyClass(tone: "danger" | "warn" | "info") {
  if (tone === "danger") return "border-rose-400/35 bg-rose-500/15 text-rose-50";
  if (tone === "warn") return "border-amber-400/35 bg-amber-400/15 text-amber-50";
  return "border-emerald-400/30 bg-emerald-400/15 text-emerald-50";
}

function buildMarketStress({
  twii,
  twFutures,
  vix,
  marginOverview
}: {
  twii?: MarketQuote;
  twFutures: MarketQuote[];
  vix?: MarketQuote;
  marginOverview: MarketMarginOverview;
}) {
  let riskPoints = 0;
  const warnings: MarketMarginWarning[] = [];
  const addWarning = (
    points: number,
    id: string,
    label: string,
    severity: MarketMarginWarning["severity"],
    message: string,
    triggeredValue: string
  ) => {
    riskPoints += points;
    warnings.push({ id, label, severity, message, triggeredValue });
  };

  if (twii) {
    if (twii.changePct <= -5 || twii.change <= -1500) {
      addWarning(
        50,
        "twii-crash",
        "加權指數急跌",
        "danger",
        "指數已進入急跌壓力，融資水位即使不擁擠，也可能因停損、斷頭與風控賣壓而連鎖砍倉。",
        `${formatChange(twii.change)} 點 / ${formatPct(twii.changePct)}`
      );
    } else if (twii.changePct <= -3 || twii.change <= -800) {
      addWarning(
        34,
        "twii-heavy-selloff",
        "大盤重跌",
        "danger",
        "大盤跌幅已超過短線正常波動，應先看風險控管，不應只看融資水位是否安全。",
        `${formatChange(twii.change)} 點 / ${formatPct(twii.changePct)}`
      );
    } else if (twii.changePct <= -1.5 || twii.change <= -350) {
      addWarning(
        18,
        "twii-risk-off",
        "大盤轉弱",
        "warn",
        "大盤明顯轉弱，買進訊號需降權，持股要提高停損與減碼紀律。",
        `${formatChange(twii.change)} 點 / ${formatPct(twii.changePct)}`
      );
    }
  }

  const weakestFuture = twFutures
    .filter((quote) => Number.isFinite(quote.changePct))
    .sort((a, b) => a.changePct - b.changePct)[0];
  if (weakestFuture?.changePct <= -4) {
    addWarning(
      25,
      "tw-futures-crash",
      "台指期同步重跌",
      "danger",
      "台指期同步重跌，代表現貨與期貨風險同向放大，隔日沖或融資部位容易被迫處理。",
      `${weakestFuture.label} ${formatPct(weakestFuture.changePct)}`
    );
  } else if (weakestFuture?.changePct <= -2) {
    addWarning(
      14,
      "tw-futures-weak",
      "台指期偏弱",
      "warn",
      "台指期偏弱，短線多方承接力不足時，融資減少可能是被迫降槓桿。",
      `${weakestFuture.label} ${formatPct(weakestFuture.changePct)}`
    );
  }

  if (vix && (vix.price >= 25 || vix.changePct >= 15)) {
    addWarning(
      18,
      "vix-risk-spike",
      "波動率急升",
      "danger",
      "VIX 急升代表國際風險情緒升高，台股融資安全分數必須降權。",
      `${formatNumber(vix.price)} / ${formatPct(vix.changePct)}`
    );
  } else if (vix && (vix.price >= 18 || vix.changePct >= 8)) {
    addWarning(
      9,
      "vix-risk-watch",
      "波動率升溫",
      "warn",
      "VIX 升溫時，個股買點要更靠近支撐，避免追價。",
      `${formatNumber(vix.price)} / ${formatPct(vix.changePct)}`
    );
  }

  if (twii && twii.changePct <= -2 && marginOverview.balanceChange < 0) {
    addWarning(
      twii.changePct <= -4 ? 22 : 12,
      "margin-deleveraging",
      "融資下降不等於安全",
      twii.changePct <= -4 ? "danger" : "warn",
      "大盤急跌時融資餘額下降，常常不是籌碼健康，而是停損、追繳或被迫降槓桿，不能解讀成利多。",
      `${formatShares(marginOverview.balanceChange)} / ${formatMoney(marginOverview.changeAmount, true)}`
    );
  }

  if (marginOverview.safety.level === "危險" || marginOverview.safety.level === "警戒") {
    addWarning(
      marginOverview.safety.level === "危險" ? 24 : 14,
      "margin-level-risk",
      "融資水位本身偏熱",
      marginOverview.safety.level === "危險" ? "danger" : "warn",
      "融資水位本身已偏熱，若大盤同步走弱，賣壓會更容易擴散。",
      `${marginOverview.safety.level} / ${marginOverview.safety.score} 分`
    );
  }

  const level =
    riskPoints >= 60 ? "危險" : riskPoints >= 35 ? "警戒" : riskPoints >= 18 ? "注意" : "安全";
  const summary =
    level === "危險"
      ? "大盤急跌風險已覆蓋融資水位，短線優先避險、減碼與控管停損。"
      : level === "警戒"
        ? "市場賣壓偏重，融資水位不能單獨當作可買依據。"
        : level === "注意"
          ? "市場轉弱，買進訊號需降權，等待止跌或回到支撐再評估。"
          : "大盤壓力未達覆蓋門檻，仍需搭配個股分數與風險報酬比。";

  if (warnings.length === 0) {
    warnings.push({
      id: "market-stress-safe",
      label: "大盤壓力正常",
      severity: "info",
      message: "大盤跌幅、台指期與波動率尚未觸發風險覆蓋條件。",
      triggeredValue: "未觸發"
    });
  }

  return { level, summary, warnings };
}

function MarketQuoteCard({ quote }: { quote: MarketQuote }) {
  return (
    <MetricCard
      label={quote.label}
      value={formatNumber(quote.price)}
      sub={`${formatChange(quote.change)} 點 / ${formatPct(quote.changePct)} · ${quote.session} · ${quote.source}`}
      tone={quoteTone(quote)}
    />
  );
}

export default async function MarketPage() {
  const [quotes, marginOverview] = await Promise.all([marketOverviewQuotes(), marketMarginOverview()]);
  const headline = quotes.filter((quote) => quote.group !== "futures" && quote.group !== "twfutures");
  const twFutures = quotes.filter((quote) => quote.group === "twfutures");
  const futures = quotes.filter((quote) => quote.group === "futures");
  const twii = quotes.find((quote) => quote.symbol === "^TWII");
  const vix = quotes.find((quote) => quote.symbol === "^VIX");
  const marketStress = buildMarketStress({ twii, twFutures, vix, marginOverview });
  const finalSafety = buildFinalSafetyDecision({
    marketStressLevel: marketStress.level,
    marginLevel: marginOverview.safety.level
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Market Overview</p>
        <h1 className="text-3xl font-black text-white">市場總覽</h1>
        <p className="mt-2 text-slate-300">資料來源：TWSE MIS、TAIFEX 官方即時行情與 Yahoo Finance。顯示最新點數、漲跌點與漲跌百分比。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headline.map((quote) => <MarketQuoteCard key={quote.symbol} quote={quote} />)}
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Market Margin Financing</p>
            <h2 className="text-xl font-black text-white">大盤安全判斷與融資水位</h2>
          </div>
          <p className="text-sm text-slate-400">
            {marginOverview.date || "最新官方資料"} · {marginOverview.source}
          </p>
        </div>

        <div className={`mt-4 rounded-3xl border p-5 ${finalSafetyClass(finalSafety.tone)}`}>
          <p className="text-sm font-bold opacity-80">結論：現在大盤是否安全？</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-4xl font-black tracking-tight">{finalSafety.label}</p>
              <p className="mt-2 text-xl font-black">{finalSafety.action}</p>
            </div>
            <p className="max-w-2xl text-sm leading-6 opacity-90">{finalSafety.explanation}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-current/20 bg-black/10 p-3">
              <p className="text-xs font-bold opacity-70">融資過高代表什麼</p>
              <p className="mt-1 text-sm font-bold">泡沫燃料，跌時會放大賣壓</p>
            </div>
            <div className="rounded-2xl border border-current/20 bg-black/10 p-3">
              <p className="text-xs font-bold opacity-70">大跌時融資下降代表什麼</p>
              <p className="mt-1 text-sm font-bold">多半是去槓桿，不是安全訊號</p>
            </div>
            <div className="rounded-2xl border border-current/20 bg-black/10 p-3">
              <p className="text-xs font-bold opacity-70">進場原則</p>
              <p className="mt-1 text-sm font-bold">先等止跌，再看支撐與個股分數</p>
            </div>
          </div>
        </div>

        <div className={`mt-4 rounded-2xl border p-4 ${warningClass({
          id: "market-stress",
          label: marketStress.level,
          severity: marketStress.level === "危險" || marketStress.level === "警戒" ? "danger" : marketStress.level === "注意" ? "warn" : "info",
          message: marketStress.summary,
          triggeredValue: marketStress.level
        })}`}>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold opacity-80">今日大盤風險覆蓋判斷</p>
              <p className="mt-1 text-2xl font-black">{marketStress.level}</p>
            </div>
            <p className="max-w-3xl text-sm leading-6 opacity-90">{marketStress.summary}</p>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {marketStress.warnings.map((warning) => (
              <div key={warning.id} className="rounded-xl border border-current/20 bg-black/10 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-bold">{warning.label}</p>
                  <p className="text-xs font-bold opacity-80">{warning.triggeredValue}</p>
                </div>
                <p className="mt-1 text-xs leading-5 opacity-85">{warning.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="融資水位狀態"
            value={marginWaterLevelText(marginOverview.safety.level)}
            sub={`${marginOverview.safety.score} 分 · ${marginWaterExplanation(marginOverview.safety.level)}`}
            tone={safetyTone(marginOverview.safety.level)}
          />
          <MetricCard
            label="目前融資總額"
            value={formatMoney(marginOverview.currentAmount)}
            sub={`原來總額 ${formatMoney(marginOverview.previousAmount)}`}
            tone="neutral"
          />
          <MetricCard
            label="融資增減金額"
            value={formatMoney(marginOverview.changeAmount, true)}
            sub={`相對原總額 ${formatPct(marginOverview.changePct)} · ${marginOverview.marketCount} 檔`}
            tone={marginOverview.changeAmount > 0 ? "warn" : "bull"}
          />
          <MetricCard
            label="融資餘額增減"
            value={formatShares(marginOverview.balanceChange)}
            sub={`融資張數變化 ${formatPct(marginOverview.balanceChangePct)}`}
            tone={marginOverview.balanceChange > 0 ? "warn" : "bull"}
          />
          <MetricCard
            label="融資使用率"
            value={`${marginOverview.utilizationPct.toFixed(2)}%`}
            sub={`融資餘額 / 融資限額`}
            tone={safetyTone(marginOverview.safety.level)}
          />
          <MetricCard
            label="融資總額 / 成交值"
            value={`${marginOverview.amountToTurnoverPct.toFixed(2)}%`}
            sub={`今日成交值 ${formatMoney(marginOverview.turnover)}`}
            tone={safetyTone(marginOverview.safety.level)}
          />
          <MetricCard
            label="上市融資水位"
            value={formatMoney(marginOverview.listedAmount)}
            sub={`今日增減 ${formatMoney(marginOverview.listedChangeAmount, true)}`}
            tone={marginOverview.listedChangeAmount > 0 ? "warn" : "bull"}
          />
          <MetricCard
            label="上櫃融資水位"
            value={formatMoney(marginOverview.otcAmount)}
            sub={`今日增減 ${formatMoney(marginOverview.otcChangeAmount, true)}`}
            tone={marginOverview.otcChangeAmount > 0 ? "warn" : "bull"}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {marginOverview.safety.warnings.map((warning) => (
            <div key={warning.id} className={`rounded-2xl border p-4 ${warningClass(warning)}`}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-black">{warning.label}</p>
                <p className="text-sm font-bold">{warning.triggeredValue}</p>
              </div>
              <p className="mt-2 text-sm leading-6 opacity-90">{warning.message}</p>
            </div>
          ))}
        </div>
      </div>

      {twFutures.length > 0 ? (
        <div className="glass rounded-3xl p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">TAIFEX Taiwan Index Futures</p>
              <h2 className="text-xl font-black text-white">台指期日 / 夜盤</h2>
            </div>
            <p className="text-sm text-slate-400">免費官方即時行情，依成交量自動選取近月活躍合約。</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {twFutures.map((quote) => (
              <div key={quote.symbol} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{quote.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{quote.symbol}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${quote.change >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                    {formatPct(quote.changePct)}
                  </span>
                </div>
                <p className={`mt-4 text-4xl font-black tracking-tight ${quote.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatNumber(quote.price)}
                </p>
                <p className={`mt-2 text-base font-bold ${quote.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatChange(quote.change)} 點 / {formatPct(quote.changePct)}
                </p>
                <p className="mt-3 text-xs text-slate-400">{quote.session} · {quote.source}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-black text-white">美股期貨日 / 夜盤</h2>
        <p className="mt-2 text-slate-300">期貨採電子盤即時報價，依台北時間標示日盤或夜盤，同時顯示點數、漲跌點與漲跌百分比。</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {futures.map((quote) => (
            <div key={quote.symbol} className="glass rounded-2xl p-4">
              <p className="text-sm text-slate-400">{quote.label}</p>
              <p className={`mt-2 text-2xl font-black tracking-tight ${quote.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatNumber(quote.price)}
              </p>
              <p className={`mt-1 text-sm font-bold ${quote.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatChange(quote.change)} 點 / {formatPct(quote.changePct)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{quote.session} · {quote.symbol}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-black text-white">產業資金輪動</h2>
        <p className="mt-2 text-slate-300">
          產業資金流需串接 TWSE/TPEX 成交值分產業統計或 FinMind 後啟用；目前不使用模擬排名。
        </p>
      </div>
    </div>
  );
}
