from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any
import html

import numpy as np
import pandas as pd
import streamlit as st

import advanced_app as adv
import app as core


PHOTO_WATCHLIST = [
    {"name": "信驊", "symbol": "5274.TWO", "source": "照片"},
    {"name": "希華", "symbol": "2484.TW", "source": "照片"},
    {"name": "東元", "symbol": "1504.TW", "source": "照片"},
    {"name": "擎亞", "symbol": "8096.TWO", "source": "照片"},
    {"name": "均豪", "symbol": "5443.TWO", "source": "照片"},
    {"name": "東聯", "symbol": "1710.TW", "source": "照片"},
    {"name": "佳世達", "symbol": "2352.TW", "source": "照片"},
    {"name": "仁寶", "symbol": "2324.TW", "source": "照片"},
    {"name": "益登", "symbol": "3048.TW", "source": "照片"},
    {"name": "能率網通", "symbol": "8071.TWO", "source": "照片"},
    {"name": "能率亞洲", "symbol": "7777.TWO", "source": "照片"},
    {"name": "鴻海", "symbol": "2317.TW", "source": "追加"},
    {"name": "友達", "symbol": "2409.TW", "source": "追加"},
    {"name": "佳凌", "symbol": "4976.TW", "source": "追加"},
]


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


def price_text(value: Any) -> str:
    value = num(value)
    return f"{value:.2f} 元" if pd.notna(value) else "-"


def pct_text(value: Any) -> str:
    value = num(value)
    return f"{value:.2f}%" if pd.notna(value) else "-"


def render_metric_cards(items: list[dict[str, Any]]) -> None:
    cards: list[str] = []
    for item in items:
        label = html.escape(str(item.get("label", "")))
        value = html.escape(str(item.get("value", "-")))
        note = html.escape(str(item.get("note", "") or ""))
        tone = html.escape(str(item.get("tone", "neutral")))
        note_html = f'<div class="watch-note {tone}">{note}</div>' if note else ""
        cards.append(
            f'<div class="watch-card"><div class="watch-label">{label}</div>'
            f'<div class="watch-value">{value}</div>{note_html}</div>'
        )
    st.markdown(f'<div class="watch-grid">{"".join(cards)}</div>', unsafe_allow_html=True)


def first_items(items: list[str], limit: int = 4) -> str:
    clean = [item for item in items if str(item).strip()]
    return "；".join(clean[:limit]) if clean else "-"


def technical_reason(latest: pd.Series, levels: dict[str, Any], box: dict[str, str], bb: dict[str, str]) -> str:
    reasons: list[str] = []
    close = num(latest.get("Close"))
    ma20 = num(latest.get("20MA"))
    ma60 = num(latest.get("60MA"))
    volume_ratio = num(latest.get("Volume_Ratio"))
    macd_hist = num(latest.get("MACD_Hist"))
    k_value = num(latest.get("K"))
    d_value = num(latest.get("D"))
    if pd.notna(close) and pd.notna(ma20) and pd.notna(ma60):
        if close >= ma20 >= ma60:
            reasons.append("均線多頭排列，收盤站上 MA20/MA60")
        elif close < ma20:
            reasons.append("收盤低於 MA20，短線轉弱")
        else:
            reasons.append("均線結構尚未完全轉強")
    if pd.notna(volume_ratio):
        if volume_ratio >= 1.5:
            reasons.append(f"量能放大 {volume_ratio:.2f}x")
        elif volume_ratio < 0.8:
            reasons.append(f"量能不足 {volume_ratio:.2f}x")
        else:
            reasons.append(f"量能普通 {volume_ratio:.2f}x")
    reasons.append(f"箱型：{box.get('status', '-')}")
    reasons.append(f"布林：{bb.get('status', '-')}")
    if pd.notna(macd_hist):
        reasons.append(f"MACD 柱狀體 {macd_hist:.2f}")
    if pd.notna(k_value) and pd.notna(d_value):
        reasons.append(f"KD {k_value:.1f}/{d_value:.1f}")
    reasons.append(f"支撐 {levels.get('support_buy', '-')}")
    reasons.append(f"突破 {levels.get('breakout_buy', '-')}")
    return first_items(reasons, 7)


def final_action(
    purchase_action: str,
    swing: dict[str, Any],
    estimate: dict[str, Any],
    levels: dict[str, Any],
    latest: pd.Series,
) -> tuple[str, str, int]:
    close = num(latest.get("Close"))
    stop = num(levels.get("stop_value"))
    probability = num(estimate.get("probability"), 0.0)
    expected_pct = num(estimate.get("expected_pct"), 0.0)
    risks = estimate.get("risks", []) or []
    swing_decision = str(swing.get("final_decision", ""))

    if pd.notna(close) and pd.notna(stop) and close <= stop:
        return "賣出", "現價跌破停損防守線，先保護本金。", 3
    if swing_decision == "轉弱賣出":
        return "賣出", "短線決策引擎判定轉弱，避免續抱。", 3
    if purchase_action == "購入" and probability >= 65 and expected_pct >= 5 and swing_decision not in {"過熱勿追", "轉弱賣出"}:
        return "買進", "購入建議與短線引擎同向偏多，可分批並嚴設停損。", 1
    if swing_decision == "過熱勿追":
        return "等待", "上漲機率雖高但位置過熱，等回測或放量突破。", 2
    if purchase_action == "不可" or len(risks) >= 3:
        return "等待", "條件不足或風險偏多，不建議立即進場。", 2
    return "等待", "尚未形成完整共振，等待突破、回測支撐或法人續買。", 2


@st.cache_data(ttl=900, show_spinner=False)
def analyze_watch_symbol(symbol: str, name: str, source: str, refresh_token: int = 0) -> dict[str, Any]:
    strategy_df, quote, institutional, institutional_history, market = core.load_single_stock_analysis_bundle(
        symbol,
        refresh_token=refresh_token,
    )
    if strategy_df.empty:
        raise ValueError(f"{symbol} 沒有足夠資料")
    latest = strategy_df.iloc[-1]
    previous = strategy_df.iloc[-2] if len(strategy_df) >= 2 else latest
    levels = core.trade_price_levels(strategy_df)
    phase = core.trend_phase_analysis(strategy_df)
    box = core.box_status(latest)
    bb = core.bollinger_status(latest)
    radar = core.short_term_radar(strategy_df, market.get("return_5d", 0.0), institutional)
    backtest, trades = core.backtest_short_windows(strategy_df)
    streak = core.institutional_streak_summary(institutional_history)
    news = core.fetch_theme_news(name, symbol, refresh_token=refresh_token)
    estimate = core.estimate_next_day_jump_probability(strategy_df, market, institutional, streak, news)
    purchase_action, purchase_note = core.purchase_recommendation(estimate, market)
    swing = adv.short_swing_decision_engine(strategy_df, levels, phase, radar, backtest, streak, market)
    final, final_reason, priority = final_action(purchase_action, swing, estimate, levels, latest)

    close = num(latest.get("Close"))
    prev_close = num(previous.get("Close"))
    change = close - prev_close if pd.notna(close) and pd.notna(prev_close) else np.nan
    change_pct = change / prev_close * 100 if pd.notna(change) and pd.notna(prev_close) and prev_close else np.nan
    rise_reason = core.build_rise_reason_summary(estimate, news)
    technical = technical_reason(latest, levels, box, bb)
    message = "；".join(f"{item['title']}（{item['source']}）" for item in news[:3]) or "暫無即時題材新聞"
    outlook = (
        f"隔日上漲機率 {estimate['probability']:.0f}%、預估漲幅 {estimate['expected_pct']:.2f}%；"
        f"短線引擎 {swing['final_decision']}，購入模型 {purchase_action}"
    )
    return {
        "source": source,
        "symbol": symbol,
        "name": name,
        "strategy_df": strategy_df,
        "latest": latest,
        "levels": levels,
        "phase": phase,
        "box": box,
        "bb": bb,
        "radar": radar,
        "backtest": backtest,
        "streak": streak,
        "institutional": institutional,
        "news": news,
        "estimate": estimate,
        "purchase_action": purchase_action,
        "purchase_note": purchase_note,
        "swing": swing,
        "final": final,
        "final_reason": final_reason,
        "priority": priority,
        "close": close,
        "change": change,
        "change_pct": change_pct,
        "technical_reason": technical,
        "message_reason": message,
        "outlook_reason": outlook,
        "rise_reason": rise_reason,
    }


def analyze_all(refresh_token: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(analyze_watch_symbol, item["symbol"], item["name"], item["source"], refresh_token): item
            for item in PHOTO_WATCHLIST
        }
        for future in as_completed(futures):
            item = futures[future]
            try:
                rows.append(future.result())
            except Exception as exc:
                rows.append(
                    {
                        "source": item["source"],
                        "symbol": item["symbol"],
                        "name": item["name"],
                        "final": "等待",
                        "final_reason": f"資料載入失敗：{exc}",
                        "priority": 9,
                        "close": np.nan,
                        "change": np.nan,
                        "change_pct": np.nan,
                        "estimate": {"probability": 0.0, "expected_pct": 0.0, "risks": [str(exc)], "factors": []},
                        "purchase_action": "不可",
                        "purchase_note": "資料不足，不建議操作。",
                        "swing": {"final_decision": "資料不足", "entry_type": "-"},
                        "phase": {"stage": "-"},
                        "levels": {"support_buy": "-", "breakout_buy": "-", "stop_price": "-"},
                        "streak": {"total_text": "-"},
                        "institutional": {"total": 0},
                        "technical_reason": "-",
                        "message_reason": "-",
                        "outlook_reason": "-",
                        "rise_reason": "-",
                        "news": [],
                    }
                )
    return sorted(rows, key=lambda row: (row.get("priority", 9), -num(row.get("estimate", {}).get("probability"), 0)))


def result_table(results: list[dict[str, Any]]) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for row in results:
        estimate = row.get("estimate", {})
        levels = row.get("levels", {})
        rows.append(
            {
                "來源": row.get("source", "-"),
                "最終答案": row.get("final", "-"),
                "股名": row.get("name", "-"),
                "股號": row.get("symbol", "-"),
                "現價": row.get("close", np.nan),
                "漲跌": row.get("change", np.nan),
                "漲跌幅": row.get("change_pct", np.nan),
                "預估漲跌": "偏漲" if num(estimate.get("probability"), 0) >= 60 else "震盪/偏弱",
                "隔日上漲機率": estimate.get("probability", np.nan),
                "預估漲幅": estimate.get("expected_pct", np.nan),
                "購入模型": row.get("purchase_action", "-"),
                "短線引擎": row.get("swing", {}).get("final_decision", "-"),
                "短線階段": row.get("phase", {}).get("stage", "-"),
                "支撐買點": levels.get("support_buy", "-"),
                "突破買點": levels.get("breakout_buy", "-"),
                "停損價": levels.get("stop_price", "-"),
                "法人連續": row.get("streak", {}).get("total_text", "-"),
                "三大法人買賣超": core._shares_to_lots_text(int(row.get("institutional", {}).get("total", 0))),
                "技術面理由": row.get("technical_reason", "-"),
                "消息面理由": row.get("message_reason", "-"),
                "展望面理由": row.get("outlook_reason", "-"),
                "統整理由": row.get("final_reason", "-"),
            }
        )
    return pd.DataFrame(rows)


def render_details(results: list[dict[str, Any]]) -> None:
    st.subheader("逐檔詳細分析")
    for row in results:
        title = f"{row.get('final', '-')}｜{row.get('name', '-')} ({row.get('symbol', '-')})"
        with st.expander(title, expanded=row.get("final") == "買進"):
            estimate = row.get("estimate", {})
            levels = row.get("levels", {})
            render_metric_cards(
                [
                    {"label": "最終答案", "value": row.get("final", "-"), "note": row.get("final_reason", "")},
                    {"label": "現價", "value": price_text(row.get("close")), "note": f"{num(row.get('change'), 0):+.2f} / {num(row.get('change_pct'), 0):+.2f}%"},
                    {"label": "隔日上漲機率", "value": f"{num(estimate.get('probability'), 0):.0f}%"},
                    {"label": "預估漲幅", "value": pct_text(estimate.get("expected_pct"))},
                    {"label": "購入模型", "value": row.get("purchase_action", "-"), "note": row.get("purchase_note", "")},
                    {"label": "短線引擎", "value": row.get("swing", {}).get("final_decision", "-"), "note": row.get("swing", {}).get("entry_type", "")},
                ]
            )
            st.markdown("**技術面**")
            st.write(row.get("technical_reason", "-"))
            st.markdown("**消息面**")
            st.write(row.get("message_reason", "-"))
            st.markdown("**展望面**")
            st.write(row.get("outlook_reason", "-"))
            st.markdown("**上漲原因整合**")
            st.write(row.get("rise_reason", "-"))
            st.markdown("**風險提醒**")
            st.write(first_items(estimate.get("risks", []) or ["未偵測到主要風險"], 5))
            render_metric_cards(
                [
                    {"label": "支撐買點", "value": levels.get("support_buy", "-")},
                    {"label": "突破買點", "value": levels.get("breakout_buy", "-")},
                    {"label": "停損價", "value": levels.get("stop_price", "-")},
                    {"label": "法人連續", "value": row.get("streak", {}).get("total_text", "-")},
                ]
            )
            if "strategy_df" in row:
                st.plotly_chart(
                    core.build_candlestick_chart(row["strategy_df"], f"{row['name']} ({row['symbol']}) 技術分析"),
                    use_container_width=True,
                )


def main() -> None:
    st.markdown(
        """
        <style>
        .stApp { background: #f8fafc; color: #0f172a; }
        .block-container { max-width: 1320px; padding-top: 1.5rem; }
        h1, h2, h3 { color: #0f172a; letter-spacing: 0; }
        .watch-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin: 12px 0 22px;
        }
        .watch-card {
            background: #ffffff;
            border: 1px solid #dbe4ef;
            border-radius: 12px;
            padding: 14px 16px;
            min-height: 118px;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
        }
        .watch-label { color: #475569; font-size: .92rem; font-weight: 750; }
        .watch-value {
            color: #0f172a;
            font-size: clamp(1.35rem, 2vw, 2.05rem);
            font-weight: 850;
            line-height: 1.15;
            margin-top: 10px;
            overflow-wrap: anywhere;
        }
        .watch-note {
            display: inline-block;
            margin-top: 10px;
            padding: 5px 9px;
            border-radius: 999px;
            background: #e0f2fe;
            color: #0369a1;
            font-size: .85rem;
            font-weight: 700;
            line-height: 1.25;
            overflow-wrap: anywhere;
        }
        .stButton button {
            background: #2563eb;
            color: #ffffff;
            border: 0;
            border-radius: 10px;
            min-height: 46px;
            font-weight: 800;
        }
        div[data-testid="stDataFrame"] {
            border: 1px solid #dbe4ef;
            border-radius: 10px;
            overflow: hidden;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
    st.title("照片群組個股統整分析雷達")
    st.caption("分析照片中的個股，並加入鴻海、友達、佳凌。結論分為買進、賣出、等待，並列出技術面、消息面、展望面理由。")
    with st.expander("本頁分析股票", expanded=False):
        st.write("、".join(f"{item['name']}({item['symbol']})" for item in PHOTO_WATCHLIST))

    if "photo_refresh_token" not in st.session_state:
        st.session_state.photo_refresh_token = 0
    col1, col2 = st.columns([1, 3])
    with col1:
        if st.button("重新抓取最新資料", use_container_width=True):
            st.session_state.photo_refresh_token += 1
            st.rerun()
    with col2:
        st.caption("資料使用 Yahoo Finance、TWSE/TPEx、三大法人、箱型、布林、KD、MACD、ATR、新聞題材與短線機率模型。")

    if not st.button("啟動照片群組完整分析", use_container_width=True):
        st.info("按下後會逐檔下載資料並統整最終買進、賣出或等待答案。")
        return

    with st.spinner("分析 14 檔股票中，正在整合技術面、籌碼面、消息面與展望面..."):
        results = analyze_all(int(st.session_state.photo_refresh_token))

    counts = pd.Series([row.get("final", "等待") for row in results]).value_counts()
    render_metric_cards(
        [
            {"label": "買進", "value": int(counts.get("買進", 0))},
            {"label": "等待", "value": int(counts.get("等待", 0))},
            {"label": "賣出", "value": int(counts.get("賣出", 0))},
            {"label": "分析檔數", "value": len(results)},
        ]
    )

    table = result_table(results)
    st.subheader("統整結論")
    st.dataframe(
        table.style.format(
            {
                "現價": "{:.2f}",
                "漲跌": "{:+.2f}",
                "漲跌幅": "{:+.2f}%",
                "隔日上漲機率": "{:.0f}%",
                "預估漲幅": "{:.2f}%",
            },
            na_rep="-",
        ),
        use_container_width=True,
        height=620,
    )
    render_details(results)
    st.divider()
    st.caption("本頁為技術與資訊整合工具，不構成投資建議。請自行控管資金與停損。")


if __name__ == "__main__":
    main()
