from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

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

    if pd.notna(close) and pd.notna(stop) and close <= stop:
        decision = "賣出 / 避開"
        action_note = "現價跌破停損或防守線，先保護本金。"
    elif pd.notna(close) and pd.notna(support_low) and pd.notna(support_high) and support_low <= close <= support_high:
        decision = "支撐觀察買"
        action_note = "現價在支撐買點區，需搭配量能與大盤。"
    elif pd.notna(close) and pd.notna(breakout) and close >= breakout and volume_ratio >= 1.2:
        decision = "突破買進"
        action_note = "收盤/盤中站上突破買點且量能確認。"
    elif score >= 70 and pd.notna(rr) and rr >= 1.5:
        decision = "偏多觀察"
        action_note = "條件接近共振，等待支撐或突破位置。"
    else:
        decision = "觀望"
        action_note = "條件尚未集中，不急著出手。"

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
        "score": score,
        "decision": decision,
        "action_note": action_note,
    }


def render_snapshot(snapshot: dict[str, Any]) -> None:
    name = snapshot["name"]
    symbol = snapshot["symbol"]
    change = snapshot["change"]
    delta = "-"
    if pd.notna(change):
        sign = "+" if change >= 0 else ""
        delta = f"{sign}{change:.2f} ({sign}{snapshot['change_pct']:.2f}%)"

    st.subheader(f"{name} ({symbol})")
    cols = st.columns(6)
    cols[0].metric("現價", price(snapshot["close"]), delta)
    cols[1].metric("短線決策", snapshot["decision"])
    cols[2].metric("強度分數", f"{snapshot['score']} / 100")
    cols[3].metric("波段階段", snapshot["phase"].get("stage", "-"))
    cols[4].metric("法人總買賣", institutional_streak_text(snapshot["streak"], "total"))
    cols[5].metric("風險報酬比", snapshot["rr"])

    st.info(snapshot["action_note"])

    trade_cols = st.columns(5)
    trade_cols[0].metric("支撐買點", snapshot["support"])
    trade_cols[1].metric("突破買點", snapshot["breakout"], snapshot["levels"].get("breakout_status", "-"))
    trade_cols[2].metric("停損價", snapshot["stop"])
    trade_cols[3].metric("短線目標", snapshot["target"])
    trade_cols[4].metric("量能比", snapshot["volume_ratio"])

    box_cols = st.columns(6)
    box_cols[0].metric("箱型頂部", snapshot["box_high"])
    box_cols[1].metric("箱型底部", snapshot["box_low"])
    box_cols[2].metric("箱體高度", snapshot["box_height"])
    box_cols[3].metric("布林上軌", snapshot["bb_upper"])
    box_cols[4].metric("布林中軌", snapshot["bb_mid"])
    box_cols[5].metric("布林下軌", snapshot["bb_lower"])

    inst_cols = st.columns(4)
    inst_cols[0].metric("外資連續", institutional_streak_text(snapshot["streak"], "foreign"))
    inst_cols[1].metric("投信連續", institutional_streak_text(snapshot["streak"], "trust"))
    inst_cols[2].metric("自營商連續", institutional_streak_text(snapshot["streak"], "dealer"))
    inst_cols[3].metric("5-7日回測樣本", snapshot["backtest"].get("samples", 0), snapshot["backtest"].get("grade", "-"))

    st.plotly_chart(
        core.build_candlestick_chart(snapshot["strategy_df"], f"{name} 進階短線雷達"),
        use_container_width=True,
    )


def resolve_inputs(raw_text: str) -> list[tuple[str, str]]:
    items = [item.strip() for item in raw_text.replace("\n", ",").split(",") if item.strip()]
    resolved: list[tuple[str, str]] = []
    seen: set[str] = set()
    for item in items:
        match = core.resolve_stock_symbol(item)
        if not match or not match.symbol or match.symbol in seen:
            continue
        seen.add(match.symbol)
        resolved.append((match.symbol, match.name))
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
            rows.append(
                {
                    "股名": snapshot["name"],
                    "股號": snapshot["symbol"],
                    "現價": snapshot["close"],
                    "漲跌": snapshot["change"],
                    "短線決策": snapshot["decision"],
                    "分數": snapshot["score"],
                    "階段": snapshot["phase"].get("stage", "-"),
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
    return result.sort_values(["分數", "漲跌"], ascending=[False, False], na_position="last")


def main() -> None:
    st.markdown(
        """
        <style>
        .stApp { background: #f8fafc; color: #0f172a; }
        div[data-testid="stMetric"] {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 16px;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
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
            match = core.resolve_stock_symbol(query)
            if not match:
                st.error("找不到符合的台股，請改用股號或完整 Yahoo Finance 代碼。")
            else:
                with st.spinner(f"分析 {match.name} ({match.symbol}) 中..."):
                    snapshot = build_advanced_snapshot(match.symbol, match.name, refresh_token)
                render_snapshot(snapshot)

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
