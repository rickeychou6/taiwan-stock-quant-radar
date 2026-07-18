import type { AlertSeverity, LeverageRisk, LeverageRiskLevel, MarginInfo, MarginSafety } from "@/lib/types";

function warning(id: string, label: string, severity: AlertSeverity, message: string, triggeredValue: string) {
  return { id, label, severity, message, triggeredValue };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelFromScore(score: number): LeverageRiskLevel {
  if (score >= 78) return "極高";
  if (score >= 58) return "高";
  if (score >= 32) return "中";
  return "低";
}

function highestLevel(levels: LeverageRiskLevel[]): LeverageRiskLevel {
  const order: Record<LeverageRiskLevel, number> = { 資料不足: -1, 低: 0, 中: 1, 高: 2, 極高: 3 };
  return [...levels].sort((a, b) => order[b] - order[a])[0] ?? "低";
}

function actionFromLevel(level: LeverageRiskLevel): LeverageRisk["action"] {
  if (level === "極高") return "先避開";
  if (level === "高") return "避免追高";
  if (level === "中") return "小量觀察";
  if (level === "資料不足") return "資料不足";
  return "可正常評估";
}

function probabilityFromScore(score: number, fallback = 8) {
  return Math.max(0, Math.min(95, Math.round(fallback + score * 0.88)));
}

export function buildLeverageRisk(input: {
  margin: MarginInfo;
  marginSafety: MarginSafety;
  priceChangePct: number;
  volumeRatio: number;
  atrPct: number;
  trendWeak: boolean;
  breakout: boolean;
}): LeverageRisk {
  const { margin, marginSafety, priceChangePct, volumeRatio, atrPct, trendWeak, breakout } = input;
  if (!margin.available) {
    return {
      level: "資料不足",
      score: 0,
      dayTradeRisk: volumeRatio >= 2 || Math.abs(priceChangePct) >= 4 ? "中" : "資料不足",
      dayTradeProbability: volumeRatio >= 2 || Math.abs(priceChangePct) >= 4 ? 35 : 0,
      overnightRisk: "資料不足",
      overnightProbability: volumeRatio >= 2 || Math.abs(priceChangePct) >= 4 ? 25 : 0,
      sharpMoveRisk: volumeRatio >= 2 || Math.abs(priceChangePct) >= 4 ? "中" : "資料不足",
      directionBias: "資料不足",
      action: "資料不足",
      summary: "缺少官方融資資料，無法完整判斷槓桿是否過大。",
      explanation: [
        "融資就是開槓桿，必須有官方融資餘額、增減與使用率，才可以判斷槓桿水位。",
        "若股價或成交量劇烈變動，仍要視為短線波動風險，但不能把它等同於融資槓桿風險。"
      ],
      warnings: [
        warning(
          "leverage-data-missing",
          "槓桿資料不足",
          "warn",
          margin.warning || "官方融資資料暫缺，槓桿水位無法完整判讀。",
          "-"
        )
      ]
    };
  }

  let leverageScore = 0;
  let dayTradeScore = 0;
  let overnightScore = 0;
  const warnings: LeverageRisk["warnings"] = [];
  const explanation: string[] = [];

  if (margin.marginUtilizationPct >= 30) {
    leverageScore += 32;
    warnings.push(
      warning(
        "leverage-util-extreme",
        "槓桿水位過高",
        "danger",
        "融資使用率超過 30%，代表槓桿籌碼偏擁擠，遇到急跌容易形成停損與斷頭賣壓。",
        `${margin.marginUtilizationPct.toFixed(2)}%`
      )
    );
  } else if (margin.marginUtilizationPct >= 20) {
    leverageScore += 22;
    warnings.push(
      warning(
        "leverage-util-high",
        "槓桿水位偏高",
        "warn",
        "融資使用率超過 20%，股價跌破支撐時賣壓容易被放大。",
        `${margin.marginUtilizationPct.toFixed(2)}%`
      )
    );
  } else if (margin.marginUtilizationPct >= 15) {
    leverageScore += 10;
    warnings.push(
      warning(
        "leverage-util-watch",
        "槓桿水位升溫",
        "info",
        "融資使用率超過 15%，可以觀察但不適合重倉追價。",
        `${margin.marginUtilizationPct.toFixed(2)}%`
      )
    );
  }

  if (margin.marginAmountToTurnoverPct >= 250) {
    leverageScore += 24;
    warnings.push(
      warning(
        "leverage-liquidity-heavy",
        "融資庫存過重",
        "danger",
        "融資金額超過 20 日均成交值 250%，代表槓桿庫存相對流動性太重，出場時容易造成急跌。",
        `${margin.marginAmountToTurnoverPct.toFixed(2)}%`
      )
    );
  } else if (margin.marginAmountToTurnoverPct >= 120) {
    leverageScore += 13;
    warnings.push(
      warning(
        "leverage-liquidity-watch",
        "融資庫存偏重",
        "warn",
        "融資金額超過 20 日均成交值 120%，若短線轉弱，承接力可能不足。",
        `${margin.marginAmountToTurnoverPct.toFixed(2)}%`
      )
    );
  }

  if (margin.marginChangePct >= 8) {
    leverageScore += 22;
    dayTradeScore += 20;
    overnightScore += 22;
    warnings.push(
      warning(
        "leverage-surge",
        "融資快速堆高",
        "danger",
        "融資單日暴增，常代表短線槓桿資金湧入，容易出現當沖推升或隔日沖賣壓。",
        `+${margin.marginChangePct.toFixed(2)}%`
      )
    );
  } else if (margin.marginChangePct >= 5) {
    leverageScore += 14;
    dayTradeScore += 13;
    overnightScore += 15;
    warnings.push(
      warning(
        "leverage-rise",
        "融資明顯增加",
        "warn",
        "融資單日增加超過 5%，隔日震盪與套利賣壓風險升高。",
        `+${margin.marginChangePct.toFixed(2)}%`
      )
    );
  } else if (margin.marginChange > 0) {
    leverageScore += 6;
    dayTradeScore += 5;
    overnightScore += 5;
  }

  if (volumeRatio >= 3) {
    dayTradeScore += 24;
    overnightScore += 12;
    warnings.push(
      warning(
        "daytrade-volume-extreme",
        "量能暴增",
        "danger",
        "成交量超過 20 日均量 3 倍，短線當沖與隔日沖資金很可能介入，股價容易急漲急跌。",
        `${volumeRatio.toFixed(2)} 倍`
      )
    );
  } else if (volumeRatio >= 2) {
    dayTradeScore += 15;
    overnightScore += 8;
    warnings.push(
      warning(
        "daytrade-volume-high",
        "量能放大",
        "warn",
        "成交量超過 20 日均量 2 倍，短線資金活躍，追高容易被隔日賣壓打到。",
        `${volumeRatio.toFixed(2)} 倍`
      )
    );
  } else if (volumeRatio >= 1.5) {
    dayTradeScore += 8;
  }

  const absChange = Math.abs(priceChangePct);
  if (absChange >= 7) {
    dayTradeScore += 22;
    overnightScore += 14;
    warnings.push(
      warning(
        "sharp-price-move",
        "股價劇烈波動",
        "danger",
        "單日漲跌幅超過 7%，短線資金可能推升或砍倉，隔日延續與反轉都要防。",
        `${priceChangePct >= 0 ? "+" : ""}${priceChangePct.toFixed(2)}%`
      )
    );
  } else if (absChange >= 4) {
    dayTradeScore += 13;
    overnightScore += 8;
  }

  if (atrPct >= 6) {
    dayTradeScore += 11;
    overnightScore += 8;
  } else if (atrPct >= 4) {
    dayTradeScore += 6;
    overnightScore += 4;
  }

  if (priceChangePct > 3 && margin.marginChange > 0 && volumeRatio >= 1.5) {
    overnightScore += 22;
    warnings.push(
      warning(
        "next-day-profit-taking",
        "隔日沖賣壓風險",
        "danger",
        "股價上漲、融資增加且量能放大，可能是短線槓桿與隔日沖資金追入，隔日容易獲利了結急跌。",
        `${priceChangePct.toFixed(2)}% / +${margin.marginChange.toLocaleString()} 張`
      )
    );
  }

  if (priceChangePct < -2 && margin.marginChange > 0) {
    leverageScore += 14;
    overnightScore += 16;
    warnings.push(
      warning(
        "price-down-leverage-up",
        "價跌融資增",
        "danger",
        "股價下跌但融資增加，可能是槓桿攤平，若續跌容易形成多殺多。",
        `${priceChangePct.toFixed(2)}% / +${margin.marginChange.toLocaleString()} 張`
      )
    );
  }

  if (priceChangePct < -4 && margin.marginChange < 0) {
    overnightScore += 18;
    warnings.push(
      warning(
        "forced-deleveraging",
        "去槓桿賣壓",
        "danger",
        "股價急跌且融資下降，通常不是安全訊號，而是停損、追繳或被迫降槓桿正在發生。",
        `${priceChangePct.toFixed(2)}% / ${margin.marginChange.toLocaleString()} 張`
      )
    );
  }

  if (trendWeak && margin.marginUtilizationPct >= 15) {
    leverageScore += 10;
    overnightScore += 8;
  }

  if (breakout && volumeRatio >= 1.5 && margin.marginChange > 0) {
    dayTradeScore += 10;
    overnightScore += 10;
    explanation.push("突破伴隨量能與融資增加，可能有短線資金推升，隔日需要看是否續量。");
  }

  const leverageLevel = levelFromScore(clampScore(leverageScore));
  const dayTradeProbability = probabilityFromScore(dayTradeScore);
  const overnightProbability = probabilityFromScore(overnightScore);
  const dayTradeRisk = levelFromScore(clampScore(dayTradeScore));
  const overnightRisk = levelFromScore(clampScore(overnightScore));
  const sharpMoveRisk = highestLevel([dayTradeRisk, overnightRisk, leverageLevel]);
  const directionBias: LeverageRisk["directionBias"] =
    priceChangePct > 3 && (margin.marginChange > 0 || volumeRatio >= 2)
      ? "急漲後回吐"
      : priceChangePct < -3 && margin.marginChange < 0
        ? "急跌去槓桿"
        : sharpMoveRisk === "高" || sharpMoveRisk === "極高"
          ? "雙向劇烈震盪"
          : "相對穩定";

  const score = clampScore(Math.max(leverageScore, dayTradeScore, overnightScore));
  const level = highestLevel([leverageLevel, dayTradeRisk, overnightRisk]);
  const action = actionFromLevel(level);
  if (!warnings.length) {
    warnings.push(
      warning(
        "leverage-controlled",
        "槓桿壓力可控",
        "info",
        "融資使用率、融資增減與量價波動都未觸發主要槓桿警示。",
        `${score} 分`
      )
    );
  }

  explanation.unshift(
    `融資就是槓桿：槓桿水位越高，股價下跌時越容易出現停損、追繳或斷頭賣壓。`,
    `當沖/隔日沖風險主要看量能、單日漲跌幅、融資是否快速增加；若漲上去但融資也堆高，隔日容易被套利賣壓打回。`
  );

  const summary =
    level === "極高"
      ? "槓桿與短線資金風險極高，可能急漲急跌，先避開或大幅降低部位。"
      : level === "高"
        ? "槓桿風險偏高，當沖/隔日沖資金可能造成劇烈震盪，避免追高。"
        : level === "中"
          ? "槓桿水位或短線資金開始升溫，只適合小量觀察，買點要貼近支撐。"
          : "槓桿壓力相對低，仍需搭配趨勢、支撐與大盤風險判斷。";

  return {
    level,
    score,
    dayTradeRisk,
    dayTradeProbability,
    overnightRisk,
    overnightProbability,
    sharpMoveRisk,
    directionBias,
    action,
    summary,
    explanation,
    warnings
  };
}
