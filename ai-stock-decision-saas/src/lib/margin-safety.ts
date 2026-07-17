import type { AlertSeverity, MarginInfo, MarginSafety, MarginSafetyLevel } from "@/lib/types";

const alertOptions: MarginSafety["alertOptions"] = [
  {
    id: "margin-util-watch",
    label: "融資佔比注意",
    severity: "info",
    threshold: "融資使用率 >= 15%",
    description: "散戶融資水位開始偏高，追價要降低部位。",
    enabled: true
  },
  {
    id: "margin-util-warning",
    label: "融資佔比警戒",
    severity: "warn",
    threshold: "融資使用率 >= 20%",
    description: "籌碼壓力增加，若技術面轉弱容易被融資停損賣壓放大。",
    enabled: true
  },
  {
    id: "margin-util-danger",
    label: "融資佔比危險",
    severity: "danger",
    threshold: "融資使用率 >= 30%",
    description: "融資水位過熱，除非強勢突破且量價健康，否則不宜追高。",
    enabled: true
  },
  {
    id: "margin-change-warning",
    label: "融資單日大增",
    severity: "warn",
    threshold: "融資單日增加 >= 5%",
    description: "短線散戶槓桿快速進場，隔日震盪風險升高。",
    enabled: true
  },
  {
    id: "margin-change-danger",
    label: "融資單日暴增",
    severity: "danger",
    threshold: "融資單日增加 >= 8%",
    description: "融資快速堆高，若不是主升段強突破，容易形成隔日賣壓。",
    enabled: true
  },
  {
    id: "margin-amount-warning",
    label: "融資金額偏重",
    severity: "warn",
    threshold: "融資金額 / 20 日均成交值 >= 120%",
    description: "融資庫存相對日成交能量偏重，出場時可能造成壓力。",
    enabled: true
  },
  {
    id: "margin-amount-danger",
    label: "融資金額過重",
    severity: "danger",
    threshold: "融資金額 / 20 日均成交值 >= 250%",
    description: "融資庫存很重，流動性不足時殺盤風險提高。",
    enabled: true
  },
  {
    id: "price-down-margin-up",
    label: "價跌融資增",
    severity: "danger",
    threshold: "股價下跌且融資增加",
    description: "價格走弱但融資加碼，代表攤平籌碼增加，是短線風險訊號。",
    enabled: true
  }
];

function warning(id: string, label: string, severity: AlertSeverity, message: string, triggeredValue: string) {
  return { id, label, severity, message, triggeredValue };
}

function scoreToLevel(score: number): MarginSafetyLevel {
  if (score >= 80) return "安全";
  if (score >= 62) return "注意";
  if (score >= 42) return "警戒";
  return "危險";
}

export function buildMarginSafety(input: {
  margin: MarginInfo;
  priceChangePct: number;
  trendWeak: boolean;
}): MarginSafety {
  const { margin, priceChangePct, trendWeak } = input;
  if (!margin.available) {
    return {
      level: "資料不足",
      score: 0,
      summary: "官方融資資料暫缺，籌碼安全性無法完整判斷。",
      warnings: [
        warning("margin-data-missing", "融資資料暫缺", "warn", margin.warning || "官方融資資料暫時無法取得。", "-")
      ],
      alertOptions
    };
  }

  let score = 100;
  const warnings: MarginSafety["warnings"] = [];

  if (margin.marginUtilizationPct >= 30) {
    score -= 32;
    warnings.push(
      warning(
        "margin-util-danger",
        "融資佔比危險",
        "danger",
        "融資使用率已超過 30%，籌碼槓桿偏熱，不宜追高。",
        `${margin.marginUtilizationPct.toFixed(2)}%`
      )
    );
  } else if (margin.marginUtilizationPct >= 20) {
    score -= 20;
    warnings.push(
      warning(
        "margin-util-warning",
        "融資佔比警戒",
        "warn",
        "融資使用率超過 20%，技術面轉弱時賣壓容易放大。",
        `${margin.marginUtilizationPct.toFixed(2)}%`
      )
    );
  } else if (margin.marginUtilizationPct >= 15) {
    score -= 9;
    warnings.push(
      warning(
        "margin-util-watch",
        "融資佔比注意",
        "info",
        "融資使用率超過 15%，可買但不適合重倉追價。",
        `${margin.marginUtilizationPct.toFixed(2)}%`
      )
    );
  }

  if (margin.marginChangePct >= 8) {
    score -= 26;
    warnings.push(
      warning(
        "margin-change-danger",
        "融資單日暴增",
        "danger",
        "融資單日增加超過 8%，隔日震盪與賣壓風險明顯升高。",
        `+${margin.marginChangePct.toFixed(2)}%`
      )
    );
  } else if (margin.marginChangePct >= 5) {
    score -= 17;
    warnings.push(
      warning(
        "margin-change-warning",
        "融資單日大增",
        "warn",
        "融資單日增加超過 5%，代表短線槓桿資金快速進場。",
        `+${margin.marginChangePct.toFixed(2)}%`
      )
    );
  } else if (margin.marginChange > 0) {
    score -= 6;
  }

  if (margin.marginAmountToTurnoverPct >= 250) {
    score -= 22;
    warnings.push(
      warning(
        "margin-amount-danger",
        "融資金額過重",
        "danger",
        "融資金額超過 20 日均成交值 250%，籌碼流動性風險偏高。",
        `${margin.marginAmountToTurnoverPct.toFixed(2)}%`
      )
    );
  } else if (margin.marginAmountToTurnoverPct >= 120) {
    score -= 12;
    warnings.push(
      warning(
        "margin-amount-warning",
        "融資金額偏重",
        "warn",
        "融資金額超過 20 日均成交值 120%，若股價跌破支撐要提高警覺。",
        `${margin.marginAmountToTurnoverPct.toFixed(2)}%`
      )
    );
  }

  if (priceChangePct < 0 && margin.marginChange > 0) {
    score -= margin.marginChangePct >= 5 ? 18 : 10;
    warnings.push(
      warning(
        "price-down-margin-up",
        "價跌融資增",
        margin.marginChangePct >= 5 ? "danger" : "warn",
        "股價下跌但融資增加，容易形成攤平賣壓，短線不宜追買。",
        `${priceChangePct.toFixed(2)}% / +${margin.marginChange.toLocaleString()} 張`
      )
    );
  }

  if (trendWeak && margin.marginUtilizationPct >= 15) {
    score -= 8;
    warnings.push(
      warning(
        "weak-trend-margin",
        "弱勢融資水位",
        "warn",
        "趨勢偏弱時融資水位仍偏高，跌破支撐要優先控風險。",
        `${margin.marginUtilizationPct.toFixed(2)}%`
      )
    );
  }

  if (!warnings.length) {
    warnings.push(
      warning(
        "margin-safe",
        "融資水位安全",
        "info",
        "融資水位未觸發主要警示，籌碼槓桿壓力相對可控。",
        `${margin.marginUtilizationPct.toFixed(2)}%`
      )
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const dangerCount = warnings.filter((item) => item.severity === "danger").length;
  const warnCount = warnings.filter((item) => item.severity === "warn").length;
  const rawLevel = scoreToLevel(score);
  const level: MarginSafetyLevel =
    dangerCount > 0 && (rawLevel === "安全" || rawLevel === "注意")
      ? "警戒"
      : warnCount > 0 && rawLevel === "安全"
        ? "注意"
        : rawLevel;
  const summary =
    level === "安全"
      ? "融資水位健康，未見明顯槓桿過熱。"
      : level === "注意"
        ? "融資水位略偏熱，買進需縮小部位並觀察支撐。"
        : level === "警戒"
          ? `融資風險偏高，已觸發 ${dangerCount + warnCount} 項警示，避免追高。`
          : `融資水位危險，已觸發 ${dangerCount} 項危險警示，優先控風險。`;

  return {
    level,
    score,
    summary,
    warnings,
    alertOptions
  };
}
