from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any
import html

import numpy as np
import pandas as pd
import streamlit as st

import app as core


SCAN_LIMIT = 30


def num(value: Any, default: float = np.nan) -> float:
    try:
        if value is None:
            return default
        result = float(value)
        if pd.isna(result):
            return default
        return result
    except Exception:
        return default


def price(value: Any) -> str:
    value = num(value)
    return f"{value:.2f} 元" if pd.notna(value) else "-"


def pct(value: Any) -> str:
    value = num(value)
    return f"{value:.2f}%" if pd.notna(value) else "-"


def rr_value(levels: dict[str, Any]) -> float:
    risk = num(levels.get("risk"))
    reward = num(levels.get("reward"))
    if pd.isna(risk) or pd.isna(reward) or risk <= 0:
        return np.nan
    return reward / risk


def institutional_streak_text(streak: dict[str, Any], key: str) -> str:
    value = int(streak.get(key, 0) or 0)
    if value > 0:
        return f"連買 {value} 天"
    if value < 0:
        return f"連賣 {abs(value)} 天"
    return "未連續"


def safe_resolve_symbol(query: str) -> dict[str, str] | None:
    try:
        match = core.resolve_symbol(query)
    except Exception:
        return None
    symbol = str(match.get("symbol", "")).strip()
    if not symbol:
        return None
    name = str(match.get("name", symbol)).strip() or symbol
    return {"symbol": symbol, "name": name}


def render_metric_grid(items: list[dict[str, Any]]) -> None:
    cards: list[str] = []
    for item in items:
        label = html.escape(str(item.get("label", "")))
        value = html.escape(str(item.get("value", "-")))
        delta = str(item.get("delta", "") or "")
        tone = str(item.get("tone", "neutral"))
        delta_html = ""
        if delta:
            delta_class = "metric-delta"
            if tone in {"positive", "negative", "warning"}:
                delta_class += f" {tone}"
            delta_html = f'<div class="{delta_class}">{html.escape(delta)}</div>'
        cards.append(
            f'<div class="metric-card"><div class="metric-label">{label}</div>'
            f'<div class="metric-value">{value}</div>{delta_html}</div>'
        )
    st.markdown(f'<div class="metric-grid">{"".join(cards)}</div>', unsafe_allow_html=True)


def parse_percent(value: Any) -> float:
    if value is None:
        return np.nan
    text = str(value).replace("%", "").replace(",", "").strip()
    return num(text)


def short_swing_decision_engine(
    strategy_df: pd.DataFrame,
    levels: dict[str, Any],
    phase: dict[str, Any],
    radar: dict[str, Any],
    backtest: dict[str, Any],
    streak: dict[str, Any],
    market: dict[str, Any],
) -> dict[str, Any]:
    latest = strategy_df.iloc[-1]
    previous = strategy_df.iloc[-2] if len(strategy_df) >= 2 else latest
    close = num(latest.get("Close"))
    ma20 = num(latest.get("20MA"))
    ma60 = num(latest.get("60MA"))
    bb_upper = num(latest.get("BB_Upper"))
    bb_mid = num(latest.get("BB_Mid"))
    bb_lower = num(latest.get("BB_Lower"))
    box_high = num(latest.get("Box_High"))
    box_low = num(latest.get("Box_Low"))
    atr = num(latest.get("ATR"))
    volume_ratio = num(latest.get("Volume_Ratio"), 0.0)
    macd_hist = num(latest.get("MACD_Hist"))
    prev_macd_hist = num(previous.get("MACD_Hist"))
    k_value = num(latest.get("K"))
    d_value = num(latest.get("D"))
    support_low = num(levels.get("support_low_value"))
    support_high = num(levels.get("support_high_value"))
    breakout = num(levels.get("breakout_value"))
    stop = num(levels.get("stop_value"))
    rr = rr_value(levels)
    total_streak = int(streak.get("total", 0) or 0)
    trust_streak = int(streak.get("trust", 0) or 0)
    foreign_streak = int(streak.get("foreign", 0) or 0)
    dealer_streak = int(streak.get("dealer", 0) or 0)
    radar_score = int(radar.get("score", 0) or 0)
    win_7d = parse_percent(backtest.get("win_7d"))
    avg_7d = parse_percent(backtest.get("avg_7d"))
    stop_rate = parse_percent(backtest.get("stop_rate"))

    score = 50
    positives: list[str] = []
    risks: list[str] = []
    wait_for: list[str] = []

    near_support = (
        pd.notna(close)
        and pd.notna(support_low)
        and pd.notna(support_high)
        and support_low * 0.99 <= close <= support_high + max(atr * 0.4 if pd.notna(atr) else 0, close * 0.01)
    )
    breakout_confirmed = pd.notna(close) and pd.notna(breakout) and close >= breakout and volume_ratio >= 1.2
    below_stop = pd.notna(close) and pd.notna(stop) and close <= stop
    uptrend = pd.notna(close) and pd.notna(ma20) and pd.notna(ma60) and close >= ma20 >= ma60
    weak_trend = pd.notna(close) and pd.notna(ma20) and pd.notna(ma60) and close < ma20 and ma20 < ma60
    bollinger_hot = pd.notna(close) and pd.notna(bb_upper) and close >= bb_upper * 0.995
    bollinger_reclaim = pd.notna(close) and pd.notna(bb_mid) and pd.notna(ma20) and close >= bb_mid and close >= ma20
    box_compress = (
        pd.notna(box_high)
        and pd.notna(box_low)
        and box_low > 0
        and ((box_high - box_low) / box_low * 100) <= 12
    )
    macd_rising = pd.notna(macd_hist) and pd.notna(prev_macd_hist) and macd_hist > prev_macd_hist
    kd_bull = pd.notna(k_value) and pd.notna(d_value) and k_value >= d_value

    if market.get("is_bull"):
        score += 8
        positives.append("大盤位於多頭安全區")
    else:
        score -= 12
        risks.append("大盤未站上多頭安全區，短線勝率會被壓低")

    if uptrend:
        score += 10
        positives.append("價格在 MA20/MA60 之上，趨勢結構偏多")
    elif weak_trend:
        score -= 14
        risks.append("價格與均線結構偏弱")
    else:
        wait_for.append("等待收盤重新站上 MA20 與布林中軌")

    if near_support:
        score += 12
        positives.append("現價接近支撐買點，適合低接觀察")
    if breakout_confirmed:
        score += 18
        positives.append("已帶量突破追價買點")
    elif pd.notna(breakout) and pd.notna(close) and close < breakout:
        wait_for.append(f"等待突破買點 {price(breakout)} 且量能大於 1.2x")

    if bollinger_reclaim:
        score += 8
        positives.append("收盤站回布林中軌與 MA20")
    if box_compress:
        score += 6
        positives.append("箱型整理仍有壓縮效果")
    if macd_rising:
        score += 5
        positives.append("MACD 柱狀體轉強")
    if kd_bull and k_value < 80:
        score += 4
        positives.append("KD 維持多方但未明顯過熱")

    if total_streak >= 2:
        score += 10
        positives.append(f"三大法人連買 {total_streak} 天")
    elif total_streak <= -2:
        score -= 12
        risks.append(f"三大法人連賣 {abs(total_streak)} 天")
    if trust_streak >= 2:
        score += 6
        positives.append(f"投信連買 {trust_streak} 天，短線籌碼加分")
    if foreign_streak <= -3 or dealer_streak <= -3:
        score -= 5

    if pd.notna(rr) and rr >= 1.8:
        score += 10
        positives.append(f"風險報酬比 {rr:.2f} 倍")
    elif pd.notna(rr) and rr < 1.2:
        score -= 10
        risks.append("風險報酬比不足 1.2，追價空間不佳")

    if pd.notna(win_7d) and win_7d >= 58:
        score += 8
        positives.append(f"過去同類買點 7 日勝率 {win_7d:.0f}%")
    elif pd.notna(win_7d) and win_7d < 45:
        score -= 8
        risks.append(f"過去同類買點 7 日勝率僅 {win_7d:.0f}%")
    if pd.notna(avg_7d) and avg_7d > 1.0:
        score += 4
    if pd.notna(stop_rate) and stop_rate >= 45:
        score -= 6
        risks.append(f"回測停損率 {stop_rate:.0f}% 偏高")

    if bollinger_hot and volume_ratio < 1.1:
        score -= 12
        risks.append("接近布林上軌但量能不足，追價容易震盪")
    if pd.notna(k_value) and k_value > 85 and not breakout_confirmed:
        score -= 6
        risks.append("KD 偏高但尚未帶量突破")
    if below_stop:
        score -= 35
        risks.append("現價跌破停損防守線")

    if below_stop or weak_trend:
        final_decision = "轉弱賣出"
        entry_type = "風險控管型"
        instruction = "跌破防守線或均線轉弱，短線先出場或避開。"
    elif bollinger_hot and not breakout_confirmed:
        final_decision = "過熱勿追"
        entry_type = "過熱追價風險型"
        instruction = "等回測 MA20、布林中軌或支撐買點再評估。"
    elif breakout_confirmed and score >= 68:
        final_decision = "可買"
        entry_type = "突破型"
        instruction = "已帶量突破，可用突破買點附近分批進場，停損嚴守。"
    elif near_support and score >= 62:
        final_decision = "可買"
        entry_type = "低接型"
        instruction = "接近支撐買點，可分批低接，跌破停損價放棄。"
    elif pd.notna(close) and pd.notna(breakout) and close < breakout:
        final_decision = "等突破"
        entry_type = "突破等待型"
        instruction = "先不要追，等收盤站上突破買點並放量。"
    elif pd.notna(close) and pd.notna(support_high) and close > support_high:
        final_decision = "等回測"
        entry_type = "回測等待型"
        instruction = "價格離支撐偏遠，等回測支撐區再提高勝率。"
    else:
        final_decision = "觀望"
        entry_type = "條件不足型"
        instruction = "多因子尚未共振，先觀察。"

    if score < 55 and final_decision == "可買":
        final_decision = "觀望"
        instruction = "雖有進場位置，但總分不足，先降低出手頻率。"

    score = int(max(0, min(100, score)))
    confidence = "高" if score >= 75 else "中" if score >= 60 else "低"
    return {
        "final_decision": final_decision,
        "entry_type": entry_type,
        "instruction": instruction,
        "score": score,
        "confidence": confidence,
        "positives": positives[:5],
        "risks": risks[:5],
        "wait_for": wait_for[:4],
        "win_7d": f"{win_7d:.0f}%" if pd.notna(win_7d) else "-",
        "avg_7d": f"{avg_7d:.2f}%" if pd.notna(avg_7d) else "-",
        "stop_rate": f"{stop_rate:.0f}%" if pd.notna(stop_rate) else "-",
        "rr_value": rr,
        "near_support": near_support,
        "breakout_confirmed": breakout_confirmed,
    }


def build_advanced_snapshot(
    symbol: str,
    name: str,
    refresh_token: int,
) -> dict[str, Any]:
    strategy_df, quote, institutional, institutional_history, market = core.load_single_stock_analysis_bundle(
        symbol,
        refresh_token=refresh_token,
    )
    if strategy_df.empty:
        raise ValueError("沒有足夠 K 線資料")

    latest = strategy_df.iloc[-1]
    previous = strategy_df.iloc[-2] if len(strategy_df) >= 2 else latest
    levels = core.trade_price_levels(strategy_df)
    phase = core.trend_phase_analysis(strategy_df)
    bb = core.bollinger_status(latest)
    radar = core.short_term_radar(strategy_df, market.get("return_5d", 0.0), institutional)
    backtest, trades = core.backtest_short_windows(strategy_df)
    streak = core.institutional_streak_summary(institutional_history)
    swing = short_swing_decision_engine(strategy_df, levels, phase, radar, backtest, streak, market)

    close = num(latest.get("Close"))
    prev_close = num(previous.get("Close"))
    change = close - prev_close if pd.notna(close) and pd.notna(prev_close) else np.nan
    change_pct = change / prev_close * 100 if pd.notna(change) and prev_close else np.nan
    breakout = num(levels.get("breakout_value"))
    stop = num(levels.get("stop_value"))
    target = num(levels.get("target_value"))
    support_low = num(levels.get("support_low_value"))
    support_high = num(levels.get("support_high_value"))
    box_high = num(latest.get("Box_High"))
    box_low = num(latest.get("Box_Low"))
    bb_upper = num(latest.get("BB_Upper"))
    bb_mid = num(latest.get("BB_Mid"))
    bb_lower = num(latest.get("BB_Lower"))
    volume_ratio = num(latest.get("Volume_Ratio"))
    score = int(radar.get("score", 0) or 0)
    rr = rr_value(levels)

    decision = swing["final_decision"]
    action_note = swing["instruction"]

    return {
        "symbol": symbol,
        "name": name,
        "strategy_df": strategy_df,
        "institutional": institutional,
        "institutional_history": institutional_history,
        "market": market,
        "quote": quote,
        "latest": latest,
        "levels": levels,
        "phase": phase,
        "bb": bb,
        "radar": radar,
        "backtest": backtest,
        "trades": trades,
        "streak": streak,
        "swing": swing,
        "close": close,
        "change": change,
        "change_pct": change_pct,
        "support": f"{price(support_low)} ~ {price(support_high)}",
        "breakout": price(breakout),
        "stop": price(stop),
        "target": price(target),
        "rr": f"1 : {rr:.2f}" if pd.notna(rr) else "-",
        "box_high": price(box_high),
        "box_low": price(box_low),
        "box_height": price(box_high - box_low if pd.notna(box_high) and pd.notna(box_low) else np.nan),
        "bb_upper": price(bb_upper),
        "bb_mid": price(bb_mid),
        "bb_lower": price(bb_lower),
        "volume_ratio": f"{volume_ratio:.2f}x" if pd.notna(volume_ratio) else "-",
        "score": swing["score"],
        "decision": decision,
        "action_note": action_note,
    }


def render_snapshot(snapshot: dict[str, Any]) -> None:
    name = snapshot["name"]
    symbol = snapshot["symbol"]
    change = snapshot["change"]
    delta = "-"
    delta_tone = "neutral"
    if pd.notna(change):
        sign = "+" if change >= 0 else ""
        delta = f"{sign}{change:.2f} ({sign}{snapshot['change_pct']:.2f}%)"
        delta_tone = "positive" if change >= 0 else "negative"

    st.subheader(f"{name} ({symbol})")
    render_metric_grid(
        [
            {"label": "現價", "value": price(snapshot["close"]), "delta": delta, "tone": delta_tone},
            {"label": "短線決策", "value": snapshot["decision"]},
            {"label": "進場型態", "value": snapshot["swing"]["entry_type"]},
            {"label": "決策信心", "value": snapshot["swing"]["confidence"]},
            {"label": "短線總分", "value": f"{snapshot['score']} / 100"},
            {"label": "法人總買賣", "value": institutional_streak_text(snapshot["streak"], "total")},
        ]
    )

    st.info(snapshot["action_note"])
    render_metric_grid(
        [
            {"label": "7日勝率", "value": snapshot["swing"]["win_7d"]},
            {"label": "7日平均報酬", "value": snapshot["swing"]["avg_7d"]},
            {"label": "回測停損率", "value": snapshot["swing"]["stop_rate"]},
            {"label": "風險報酬比", "value": snapshot["rr"]},
            {"label": "波段階段", "value": snapshot["phase"].get("stage", "-")},
        ]
    )

    render_metric_grid(
        [
            {"label": "支撐買點", "value": snapshot["support"]},
            {
                "label": "突破買點",
                "value": snapshot["breakout"],
                "delta": snapshot["levels"].get("breakout_status", "-"),
                "tone": "positive"
                if snapshot["levels"].get("breakout_status") == "已突破"
                else "warning",
            },
            {"label": "停損價", "value": snapshot["stop"]},
            {"label": "短線目標", "value": snapshot["target"]},
            {"label": "量能比", "value": snapshot["volume_ratio"]},
        ]
    )

    render_metric_grid(
        [
            {"label": "箱型頂部", "value": snapshot["box_high"]},
            {"label": "箱型底部", "value": snapshot["box_low"]},
            {"label": "箱體高度", "value": snapshot["box_height"]},
            {"label": "布林上軌", "value": snapshot["bb_upper"]},
            {"label": "布林中軌", "value": snapshot["bb_mid"]},
            {"label": "布林下軌", "value": snapshot["bb_lower"]},
        ]
    )

    render_metric_grid(
        [
            {"label": "外資連續", "value": institutional_streak_text(snapshot["streak"], "foreign")},
            {"label": "投信連續", "value": institutional_streak_text(snapshot["streak"], "trust")},
            {"label": "自營商連續", "value": institutional_streak_text(snapshot["streak"], "dealer")},
            {
                "label": "5-7日回測樣本",
                "value": snapshot["backtest"].get("samples", 0),
                "delta": snapshot["backtest"].get("grade", "-"),
                "tone": "positive",
            },
        ]
    )

    st.subheader("短線決策理由")
    reason_col, risk_col, wait_col = st.columns(3)
    with reason_col:
        st.markdown("**加分條件**")
        positives = snapshot["swing"].get("positives", [])
        if positives:
            for item in positives:
                st.write(f"- {item}")
        else:
            st.write("- 尚無明確加分條件")
    with risk_col:
        st.markdown("**風險燈號**")
        risks = snapshot["swing"].get("risks", [])
        if risks:
            for item in risks:
                st.write(f"- {item}")
        else:
            st.write("- 未偵測到主要風險")
    with wait_col:
        st.markdown("**等待條件**")
        waits = snapshot["swing"].get("wait_for", [])
        if waits:
            for item in waits:
                st.write(f"- {item}")
        else:
            st.write("- 目前不需額外等待條件")

    st.plotly_chart(
        core.build_candlestick_chart(snapshot["strategy_df"], f"{name} 進階短線雷達"),
        use_container_width=True,
    )


def resolve_inputs(raw_text: str) -> list[tuple[str, str]]:
    items = [item.strip() for item in raw_text.replace("\n", ",").split(",") if item.strip()]
    resolved: list[tuple[str, str]] = []
    seen: set[str] = set()
    for item in items:
        match = safe_resolve_symbol(item)
        if not match or match["symbol"] in seen:
            continue
        seen.add(match["symbol"])
        resolved.append((match["symbol"], match["name"]))
    return resolved[:SCAN_LIMIT]


def scan_symbols(symbols: list[tuple[str, str]], refresh_token: int) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(build_advanced_snapshot, symbol, name, refresh_token): (symbol, name)
            for symbol, name in symbols
        }
        for future in as_completed(futures):
            symbol, name = futures[future]
            try:
                snapshot = future.result()
            except Exception as exc:
                rows.append({"股名": name, "股號": symbol, "短線決策": "資料失敗", "備註": str(exc)})
                continue
            priority = {
                "可買": 1,
                "等突破": 2,
                "等回測": 3,
                "觀望": 4,
                "過熱勿追": 5,
                "轉弱賣出": 6,
            }.get(snapshot["decision"], 9)
            rows.append(
                {
                    "股名": snapshot["name"],
                    "股號": snapshot["symbol"],
                    "現價": snapshot["close"],
                    "漲跌": snapshot["change"],
                    "排序": priority,
                    "短線決策": snapshot["decision"],
                    "進場型態": snapshot["swing"]["entry_type"],
                    "信心": snapshot["swing"]["confidence"],
                    "分數": snapshot["score"],
                    "階段": snapshot["phase"].get("stage", "-"),
                    "7日勝率": snapshot["swing"]["win_7d"],
                    "停損率": snapshot["swing"]["stop_rate"],
                    "法人總連續": institutional_streak_text(snapshot["streak"], "total"),
                    "支撐買點": snapshot["support"],
                    "突破買點": snapshot["breakout"],
                    "停損價": snapshot["stop"],
                    "短線目標": snapshot["target"],
                    "風險報酬比": snapshot["rr"],
                    "量能比": snapshot["volume_ratio"],
                    "備註": snapshot["action_note"],
                }
            )

    result = pd.DataFrame(rows)
    if result.empty or "分數" not in result.columns:
        return result
    result = result.sort_values(["排序", "分數", "漲跌"], ascending=[True, False, False], na_position="last")
    return result.drop(columns=["排序"], errors="ignore")


def main() -> None:
    st.markdown(
        """
        <style>
        .stApp { background: #f8fafc; color: #0f172a; }
        .block-container {
            max-width: 1180px;
            padding-left: 1.5rem;
            padding-right: 1.5rem;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 14px;
            margin: 14px 0 24px 0;
            align-items: stretch;
        }
        .metric-card {
            background: #ffffff;
            border: 1px solid #dbe4ef;
            border-radius: 12px;
            padding: 16px 18px;
            min-height: 126px;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 10px;
        }
        .metric-label {
            color: #334155;
            font-size: 0.96rem;
            font-weight: 700;
            line-height: 1.25;
        }
        .metric-value {
            color: #0f172a;
            font-size: clamp(1.32rem, 2.1vw, 2.15rem);
            font-weight: 800;
            line-height: 1.15;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
        }
        .metric-delta {
            align-self: flex-start;
            border-radius: 999px;
            background: #eef2ff;
            color: #334155;
            font-size: 0.92rem;
            font-weight: 700;
            padding: 5px 10px;
            line-height: 1.2;
            max-width: 100%;
            overflow-wrap: anywhere;
        }
        .metric-delta.positive {
            background: #dcfce7;
            color: #15803d;
        }
        .metric-delta.negative {
            background: #fee2e2;
            color: #b91c1c;
        }
        .metric-delta.warning {
            background: #fef3c7;
            color: #92400e;
        }
        div[data-testid="stMetric"] {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 16px;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
        }
        div[data-testid="stAlert"] {
            border-radius: 12px;
        }
        .stButton button {
            background: #2563eb;
            color: #ffffff;
            border: 0;
            border-radius: 10px;
            min-height: 44px;
            font-weight: 700;
        }
        .stTextInput input, .stTextArea textarea {
            background: #ffffff;
            border-radius: 10px;
        }
        @media (max-width: 760px) {
            .block-container {
                padding-left: 1rem;
                padding-right: 1rem;
            }
            .metric-grid {
                grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
                gap: 10px;
            }
            .metric-card {
                min-height: 112px;
                padding: 13px 14px;
            }
            .metric-value {
                font-size: 1.35rem;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
    st.title("台股進階多因子短線雷達")
    st.caption("第二網站入口：整合 GitHub 開源台股資料工具概念、箱型、布林、法人連續買賣、5-7 日短線回測。")

    refresh_token = int(st.session_state.get("manual_refresh_token", 0))
    if st.button("更新即時/法人資料", use_container_width=True):
        refresh_token += 1
        st.session_state.manual_refresh_token = refresh_token
        st.rerun()

    tab_single, tab_scan, tab_source = st.tabs(["單股進階分析", "多股強弱排行", "GitHub 來源"])

    with tab_single:
        query = st.text_input("輸入股名或股號", value="台積電", placeholder="例如：台積電、信驊、2330、5274")
        if st.button("查詢進階分析", use_container_width=True):
            match = safe_resolve_symbol(query)
            if not match:
                st.error("找不到符合的台股，請改用股號或完整 Yahoo Finance 代碼。")
            else:
                try:
                    with st.spinner(f"分析 {match['name']} ({match['symbol']}) 中..."):
                        snapshot = build_advanced_snapshot(match["symbol"], match["name"], refresh_token)
                    render_snapshot(snapshot)
                except Exception as exc:
                    st.error(f"分析資料暫時無法載入：{exc}")
                    st.caption("請稍後重試，或改用完整股號代碼，例如 2330.TW、5274.TWO。")

    with tab_scan:
        default_symbols = ",".join(core.WATCHLIST_0050[:20])
        raw = st.text_area(
            "輸入要排行的股名或股號，每行或逗號分隔",
            value=default_symbols,
            height=120,
        )
        st.caption(f"為了載入速度，一次最多掃描 {SCAN_LIMIT} 檔。")
        if st.button("開始多股排行掃描", use_container_width=True):
            symbols = resolve_inputs(raw)
            if not symbols:
                st.error("沒有可辨識的台股。")
            else:
                with st.spinner(f"掃描 {len(symbols)} 檔中..."):
                    result = scan_symbols(symbols, refresh_token)
                st.dataframe(
                    result.style.format({"現價": "{:.2f}", "漲跌": "{:+.2f}", "分數": "{:.0f}"}, na_rep="-"),
                    use_container_width=True,
                    height=520,
                )

    with tab_source:
        st.subheader("已參考的 GitHub 開源專案")
        st.markdown(
            """
            - FinMind/FinMind：Apache-2.0，台股技術面、基本面、籌碼面、新聞與期貨選擇權資料集。
            - mlouielu/twstock：MIT，台股價格擷取與簡易買賣點工具。

            本頁沒有直接複製外部專案程式碼，而是把可用的分析概念整合到你原本的 Streamlit 系統，
            避免授權、部署相依套件與資料穩定性問題。
            """
        )

    st.divider()
    st.caption("技術分析輔助工具，不構成投資建議。請自行控管部位與風險。")


if __name__ == "__main__":
    main()
