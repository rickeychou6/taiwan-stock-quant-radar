import type { PriceBar } from "@/lib/types";

export function sma(values: number[], period: number) {
  return values.map((_, idx) => {
    if (idx + 1 < period) return NaN;
    const slice = values.slice(idx + 1 - period, idx + 1);
    return slice.reduce((sum, value) => sum + value, 0) / period;
  });
}

export function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((value, idx) => {
    out.push(idx === 0 ? value : value * k + out[idx - 1] * (1 - k));
  });
  return out;
}

export function rsi(values: number[], period = 14) {
  const out = values.map(() => NaN);
  for (let i = period; i < values.length; i++) {
    let gain = 0;
    let loss = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - values[j - 1];
      if (diff >= 0) gain += diff;
      else loss -= diff;
    }
    const rs = loss === 0 ? 100 : gain / loss;
    out[i] = 100 - 100 / (1 + rs);
  }
  return out;
}

export function atr(bars: PriceBar[], period = 14) {
  const tr = bars.map((bar, idx) => {
    const prev = idx > 0 ? bars[idx - 1].close : bar.close;
    return Math.max(bar.high - bar.low, Math.abs(bar.high - prev), Math.abs(bar.low - prev));
  });
  return sma(tr, period);
}

export function macd(values: number[]) {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  const dif = values.map((_, idx) => fast[idx] - slow[idx]);
  const dea = ema(dif, 9);
  const hist = dif.map((value, idx) => value - dea[idx]);
  return { dif, dea, hist };
}

export function bollinger(values: number[], period = 20, multiple = 2) {
  const mid = sma(values, period);
  const upper = values.map((_, idx) => {
    if (idx + 1 < period) return NaN;
    const slice = values.slice(idx + 1 - period, idx + 1);
    const mean = mid[idx];
    const variance = slice.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
    return mean + Math.sqrt(variance) * multiple;
  });
  const lower = upper.map((value, idx) => {
    if (Number.isNaN(value)) return NaN;
    return mid[idx] - (value - mid[idx]);
  });
  return { upper, mid, lower };
}

export function stochastic(bars: PriceBar[], period = 9) {
  const k: number[] = [];
  const d: number[] = [];
  bars.forEach((bar, idx) => {
    if (idx + 1 < period) {
      k.push(NaN);
      d.push(NaN);
      return;
    }
    const slice = bars.slice(idx + 1 - period, idx + 1);
    const low = Math.min(...slice.map((row) => row.low));
    const high = Math.max(...slice.map((row) => row.high));
    const rsv = high === low ? 50 : ((bar.close - low) / (high - low)) * 100;
    const prevK = Number.isNaN(k[idx - 1]) ? 50 : k[idx - 1];
    const nextK = (prevK * 2 + rsv) / 3;
    const prevD = Number.isNaN(d[idx - 1]) ? 50 : d[idx - 1];
    k.push(nextK);
    d.push((prevD * 2 + nextK) / 3);
  });
  return { k, d };
}

export function obv(bars: PriceBar[]) {
  const out = [0];
  for (let i = 1; i < bars.length; i++) {
    const direction = bars[i].close > bars[i - 1].close ? 1 : bars[i].close < bars[i - 1].close ? -1 : 0;
    out.push(out[i - 1] + direction * bars[i].volume);
  }
  return out;
}
