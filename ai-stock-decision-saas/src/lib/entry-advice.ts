import type { Action, AnalysisResult, EntryAdviceLabel, TrendStage } from "@/lib/types";

type EntrySignal = AnalysisResult["entrySignal"];

function rounded(value: number) {
  return Number(Number.isFinite(value) ? value.toFixed(2) : "0");
}

function signal(
  label: EntryAdviceLabel,
  reason: string,
  rule: string,
  riskReward: number,
  supportDistancePct: number
): EntrySignal {
  return {
    label,
    reason,
    rule,
    riskReward: rounded(riskReward),
    supportDistancePct: rounded(supportDistancePct)
  };
}

export function buildEntrySignal(input: {
  reliability: AnalysisResult["modelCalibration"]["reliability"];
  finalScore: number;
  technicalScore: number;
  capitalScore: number;
  price: number;
  support: number;
  stopLoss: number;
  takeProfit1: number;
  volumeRatio: number;
  trendStage: TrendStage;
  action: Action;
  forecastUpProbability: number;
}): EntrySignal {
  const risk = Math.max(input.price - input.stopLoss, input.price * 0.01);
  const reward = Math.max(0, input.takeProfit1 - input.price);
  const riskReward = reward / Math.max(risk, 0.01);
  const supportDistancePct = input.price > 0 ? ((input.price - input.support) / input.price) * 100 : 999;
  const nearSupport = supportDistancePct >= -0.3 && supportDistancePct <= 2.5;
  const belowSupport = supportDistancePct < -0.3;
  const riskRewardGood = riskReward >= 1.5;
  const riskRewardAcceptable = riskReward >= 1.2;
  const technicalGood = input.technicalScore >= 62;
  const volumeGood = input.volumeRatio >= 1.1 || input.capitalScore >= 56;
  const trendGood = input.trendStage === "初升段" || input.trendStage === "主升段";
  const weakTrend = input.trendStage === "破線" || input.trendStage === "轉弱";
  const weakAction = input.action === "SELL" || input.action === "STOP_LOSS" || input.action === "REDUCE";

  if (weakAction || input.price <= input.stopLoss || weakTrend || belowSupport) {
    return signal(
      "不買",
      "已接近停損、跌破支撐或趨勢轉弱，先保護本金，不把它列為買點。",
      "跌破停損 / 趨勢轉弱 / 支撐失守",
      riskReward,
      supportDistancePct
    );
  }

  if (input.reliability === "低") {
    return signal(
      "觀察",
      "可靠度低：不買，最多觀察。等模型樣本、方向正確率或價格型態改善後再判斷。",
      "可靠度低",
      riskReward,
      supportDistancePct
    );
  }

  if (input.reliability === "中" && nearSupport && riskRewardGood && input.finalScore >= 50) {
    return signal(
      "小量試單",
      "可靠度中，但價格接近支撐且風險報酬比夠好，只適合小量分批，不追高。",
      "可靠度中 + 接近支撐 + 風險報酬比好",
      riskReward,
      supportDistancePct
    );
  }

  if (input.reliability === "中") {
    return signal(
      "觀望",
      "可靠度中且條件普通，先觀望；等靠近支撐、放量轉強或風險報酬比改善。",
      "可靠度中 + 條件普通",
      riskReward,
      supportDistancePct
    );
  }

  if (
    input.reliability === "高" &&
    technicalGood &&
    volumeGood &&
    riskRewardGood &&
    trendGood &&
    input.forecastUpProbability >= 58 &&
    input.finalScore >= 65
  ) {
    return signal(
      "應買",
      "可靠度高，且技術面、量能、趨勢與風險報酬比同時達標；仍應分批進場並嚴守停損。",
      "可靠度高 + 技術面/量能/風險報酬比都好",
      riskReward,
      supportDistancePct
    );
  }

  if (input.reliability === "高" && riskRewardAcceptable && (nearSupport || technicalGood) && input.finalScore >= 55) {
    return signal(
      "可買",
      "可靠度高且條件偏多，可考慮分批；若距離支撐太遠，部位要縮小。",
      "可靠度高 + 條件偏多",
      riskReward,
      supportDistancePct
    );
  }

  return signal(
    "等待",
    "條件尚未集中，等待價格靠近支撐、放量突破或風險報酬比轉佳。",
    "條件未集中",
    riskReward,
    supportDistancePct
  );
}
