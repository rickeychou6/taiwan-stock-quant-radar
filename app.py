from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import unicodedata

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st
import yfinance as yf


st.set_page_config(
    page_title="台股智慧多維度波段共振量化雷達",
    page_icon="📡",
    layout="wide",
    initial_sidebar_state="collapsed",
)

YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search"
TWSE_LISTED_URL = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L"
TPEX_OTC_URL = "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O"
TWSE_INSTITUTIONAL_URL = "https://www.twse.com.tw/rwd/zh/fund/T86"
TPEX_INSTITUTIONAL_URL = "https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade"
TWSE_MIS_QUOTE_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
MARKET_SYMBOL = "^TWII"
LOOKBACK_PERIOD = "3y"
CACHE_VERSION = "bollinger-v2"
HISTORY_CACHE_TTL = 1800
REALTIME_CACHE_TTL = 15
MARKET_CACHE_TTL = 30
INSTITUTIONAL_CACHE_TTL = 300

WATCHLIST_0050 = [
    "2330.TW",
    "2317.TW",
    "2454.TW",
    "2308.TW",
    "2382.TW",
    "2881.TW",
    "2412.TW",
    "2882.TW",
    "2303.TW",
    "2891.TW",
    "3711.TW",
    "2886.TW",
    "1216.TW",
    "2884.TW",
    "2357.TW",
    "2892.TW",
    "3034.TW",
    "2603.TW",
    "2885.TW",
    "6669.TW",
    "5880.TW",
    "2345.TW",
    "1303.TW",
    "2002.TW",
    "3045.TW",
    "1301.TW",
    "2207.TW",
    "2880.TW",
    "5871.TW",
    "2912.TW",
    "2395.TW",
    "1326.TW",
    "4904.TW",
    "1590.TW",
    "2379.TW",
    "2327.TW",
    "3008.TW",
    "2890.TW",
    "2883.TW",
    "1101.TW",
    "2887.TW",
    "5876.TW",
    "2609.TW",
    "2615.TW",
    "2801.TW",
    "6505.TW",
    "9910.TW",
    "2408.TW",
    "1402.TW",
    "6415.TW",
]

COMMON_TW_STOCKS = {
    "1101": "台泥",
    "1216": "統一",
    "1301": "台塑",
    "1303": "南亞",
    "1326": "台化",
    "1402": "遠東新",
    "1590": "亞德客-KY",
    "2002": "中鋼",
    "2207": "和泰車",
    "2303": "聯電",
    "2308": "台達電",
    "2317": "鴻海",
    "2327": "國巨",
    "2330": "台積電",
    "2345": "智邦",
    "2357": "華碩",
    "2379": "瑞昱",
    "2382": "廣達",
    "2395": "研華",
    "2408": "南亞科",
    "2412": "中華電",
    "2454": "聯發科",
    "2603": "長榮",
    "2609": "陽明",
    "2615": "萬海",
    "2618": "長榮航",
    "2801": "彰銀",
    "2880": "華南金",
    "2881": "富邦金",
    "2882": "國泰金",
    "2883": "開發金",
    "2884": "玉山金",
    "2885": "元大金",
    "2886": "兆豐金",
    "2887": "台新金",
    "2890": "永豐金",
    "2891": "中信金",
    "2892": "第一金",
    "2912": "統一超",
    "3008": "大立光",
    "3034": "聯詠",
    "3045": "台灣大",
    "3711": "日月光投控",
    "4904": "遠傳",
    "5871": "中租-KY",
    "5876": "上海商銀",
    "5880": "合庫金",
    "6415": "矽力-KY",
    "6505": "台塑化",
    "6669": "緯穎",
    "9910": "豐泰",
}

TW_STOCK_ALIASES = {
    "台积电": "2330",
    "tsmc": "2330",
    "鴻海": "2317",
    "鸿海": "2317",
    "foxconn": "2317",
    "聯發科": "2454",
    "联发科": "2454",
    "mediatek": "2454",
    "台達電": "2308",
    "台达电": "2308",
    "廣達": "2382",
    "广达": "2382",
    "長榮航": "2618",
    "長榮航空": "2618",
    "长荣航": "2618",
    "长荣航空": "2618",
    "中華電": "2412",
    "中华电": "2412",
}


@dataclass(frozen=True)
class SymbolMatch:
    symbol: str
    name: str


def _normalize_lookup_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    normalized = normalized.replace("臺", "台")
    return "".join(normalized.lower().split())


def _symbol_from_code(code: str) -> str:
    return f"{code}.TW"


@st.cache_data(ttl=1800, show_spinner=False)
def load_stock_directory() -> dict[str, dict[str, str]]:
    directory = {
        code: {"symbol": _symbol_from_code(code), "name": name}
        for code, name in COMMON_TW_STOCKS.items()
    }

    try:
        listed = requests.get(
            TWSE_LISTED_URL,
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        listed.raise_for_status()
        for item in listed.json():
            code = str(item.get("公司代號") or "").strip()
            name = str(item.get("公司簡稱") or item.get("公司名稱") or "").strip()
            if code.isdigit() and name:
                directory[code] = {"symbol": f"{code}.TW", "name": name}
    except Exception:
        pass

    try:
        otc = requests.get(
            TPEX_OTC_URL,
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        otc.raise_for_status()
        for item in otc.json():
            code = str(item.get("SecuritiesCompanyCode") or "").strip()
            name = str(item.get("CompanyAbbreviation") or item.get("CompanyName") or "").strip()
            if code.isdigit() and name:
                directory[code] = {"symbol": f"{code}.TWO", "name": name}
    except Exception:
        pass

    return directory


def stock_selector_options() -> list[str]:
    directory = load_stock_directory()
    pairs = sorted(directory.items(), key=lambda item: item[0])
    return ["手動輸入"] + [f"{data['name']} ({data['symbol']})" for _, data in pairs]


def query_from_selector_label(label: str) -> str:
    if label == "手動輸入":
        return ""
    if "(" in label and ")" in label:
        return label.rsplit("(", 1)[1].rstrip(")")
    return label


def _local_symbol_match(query: str) -> SymbolMatch | None:
    lookup_key = _normalize_lookup_key(query)
    if not lookup_key:
        return None

    directory = load_stock_directory()

    if lookup_key.isdigit() and lookup_key in directory:
        data = directory[lookup_key]
        return SymbolMatch(symbol=data["symbol"], name=data["name"])

    alias_code = TW_STOCK_ALIASES.get(lookup_key)
    if alias_code and alias_code in directory:
        data = directory[alias_code]
        return SymbolMatch(symbol=data["symbol"], name=data["name"])

    exact_matches: list[SymbolMatch] = []
    partial_matches: list[SymbolMatch] = []
    for data in directory.values():
        name = data["name"]
        name_key = _normalize_lookup_key(name)
        if lookup_key == name_key:
            exact_matches.append(SymbolMatch(symbol=data["symbol"], name=name))
        elif lookup_key in name_key:
            partial_matches.append(SymbolMatch(symbol=data["symbol"], name=name))
    if exact_matches:
        return exact_matches[0]
    if len(partial_matches) == 1:
        return partial_matches[0]
    return None


def _flatten_yfinance_columns(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        df = df.copy()
        df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]
    return df


def _clean_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
    df = _flatten_yfinance_columns(df)
    needed = ["Open", "High", "Low", "Close", "Volume"]
    missing = [col for col in needed if col not in df.columns]
    if missing:
        raise ValueError(f"缺少必要欄位: {', '.join(missing)}")

    cleaned = df[needed].copy()
    cleaned.index = pd.to_datetime(cleaned.index)
    cleaned = cleaned.dropna(subset=["Open", "High", "Low", "Close"])
    cleaned["Volume"] = cleaned["Volume"].fillna(0)
    return cleaned


def _parse_int(value: Any) -> int:
    try:
        text = str(value).replace(",", "").strip()
        if text in {"", "--", "None", "nan"}:
            return 0
        return int(float(text))
    except Exception:
        return 0


def _parse_float(value: Any) -> float:
    try:
        text = str(value).replace(",", "").strip()
        if text in {"", "-", "--", "None", "nan"}:
            return np.nan
        return float(text)
    except Exception:
        return np.nan


def _recent_dates(days: int = 12) -> list[pd.Timestamp]:
    today = pd.Timestamp.today(tz="Asia/Taipei").normalize().tz_localize(None)
    return [today - pd.Timedelta(days=i) for i in range(days)]


@st.cache_data(ttl=REALTIME_CACHE_TTL, show_spinner=False)
def fetch_realtime_quote(
    symbol: str,
    refresh_token: int = 0,
    _version: str = CACHE_VERSION,
) -> dict[str, Any]:
    symbol = symbol.upper()
    code = symbol.split(".", 1)[0]
    suffix = symbol.split(".", 1)[1] if "." in symbol else "TW"
    market = "otc" if suffix == "TWO" else "tse"

    try:
        session = requests.Session()
        session.headers.update({"User-Agent": USER_AGENT})
        session.get(
            "https://mis.twse.com.tw/stock/index.jsp",
            timeout=5,
        )
        response = session.get(
            TWSE_MIS_QUOTE_URL,
            params={"ex_ch": f"{market}_{code}.tw", "json": "1", "delay": "0"},
            headers={
                "User-Agent": USER_AGENT,
                "Referer": "https://mis.twse.com.tw/stock/index.jsp",
            },
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        items = payload.get("msgArray") or []
        if not items:
            return {"ok": False, "message": "查無官方即時/延遲報價"}
        item = items[0]
        quote_date = pd.to_datetime(str(item.get("d")), format="%Y%m%d", errors="coerce")
        last = _parse_float(item.get("z"))
        quote_message = "OK"
        if pd.isna(last):
            last = _parse_float(item.get("pz"))
        high = _parse_float(item.get("h"))
        low = _parse_float(item.get("l"))
        upper = _parse_float(item.get("u"))
        lower = _parse_float(item.get("w"))
        if pd.isna(last) and pd.notna(high) and pd.notna(upper) and high == upper:
            last = high
            quote_message = "最新成交欄位空值，使用漲停鎖住價估算"
        elif pd.isna(last) and pd.notna(low) and pd.notna(lower) and low == lower:
            last = low
            quote_message = "最新成交欄位空值，使用跌停鎖住價估算"
        volume_lots = _parse_float(item.get("v"))
        quote_ok = bool(pd.notna(quote_date) and pd.notna(last))
        if not quote_ok and quote_message == "OK":
            quote_message = "官方回傳缺少日期或成交價，未套用即時價"
        return {
            "ok": quote_ok,
            "date": quote_date,
            "time": str(item.get("t") or item.get("%") or ""),
            "name": str(item.get("n") or code),
            "open": _parse_float(item.get("o")),
            "high": high,
            "low": low,
            "close": last,
            "volume": volume_lots * 1000 if pd.notna(volume_lots) else np.nan,
            "source": "TWSE MIS 官方即時/延遲報價",
            "message": quote_message,
        }
    except Exception as exc:
        return {"ok": False, "message": f"官方報價讀取失敗：{exc}"}


def apply_realtime_quote(df: pd.DataFrame, symbol: str, refresh_token: int = 0) -> pd.DataFrame:
    quote = fetch_realtime_quote(symbol, refresh_token=refresh_token)
    if not quote.get("ok"):
        return df

    data = df.copy()
    quote_date = pd.Timestamp(quote["date"]).normalize()
    existing_dates = pd.to_datetime(data.index).normalize()
    values = {
        "Open": quote["open"],
        "High": quote["high"],
        "Low": quote["low"],
        "Close": quote["close"],
        "Volume": quote["volume"],
    }
    if quote_date in set(existing_dates):
        row_position = list(existing_dates).index(quote_date)
        for col, value in values.items():
            if pd.notna(value):
                data.iat[row_position, data.columns.get_loc(col)] = value
    elif quote_date > existing_dates.max():
        last_close = data["Close"].iloc[-1]
        row = {
            "Open": quote["open"] if pd.notna(quote["open"]) else last_close,
            "High": quote["high"] if pd.notna(quote["high"]) else quote["close"],
            "Low": quote["low"] if pd.notna(quote["low"]) else quote["close"],
            "Close": quote["close"],
            "Volume": quote["volume"] if pd.notna(quote["volume"]) else 0,
        }
        data.loc[quote_date] = row
        data = data.sort_index()
    return data


def _empty_institutional(symbol: str, message: str = "查無最新官方法人資料") -> dict[str, Any]:
    return {
        "symbol": symbol,
        "date": "-",
        "name": symbol,
        "foreign": 0,
        "trust": 0,
        "dealer": 0,
        "total": 0,
        "status": "資料不足",
        "bias": "中性",
        "score": 0,
        "message": message,
    }


@st.cache_data(ttl=INSTITUTIONAL_CACHE_TTL, show_spinner=False)
def fetch_institutional_flow(
    symbol: str,
    refresh_token: int = 0,
    _version: str = CACHE_VERSION,
) -> dict[str, Any]:
    code = symbol.upper().split(".", 1)[0]
    suffix = symbol.upper().split(".", 1)[1] if "." in symbol else "TW"

    if suffix == "TWO":
        return _fetch_tpex_institutional(code, symbol)
    result = _fetch_twse_institutional(code, symbol)
    if result["status"] != "資料不足":
        return result
    return _fetch_tpex_institutional(code, symbol)


def _fetch_twse_institutional(code: str, symbol: str) -> dict[str, Any]:
    try:
        for date in _recent_dates():
            date_text = date.strftime("%Y%m%d")
            response = requests.get(
                TWSE_INSTITUTIONAL_URL,
                params={"date": date_text, "selectType": "ALL", "response": "json"},
                headers={"User-Agent": USER_AGENT},
                timeout=10,
            )
            response.raise_for_status()
            payload = response.json()
            if payload.get("stat") != "OK":
                continue
            for row in payload.get("data", []):
                if str(row[0]).strip() == code:
                    foreign = _parse_int(row[4]) + _parse_int(row[7])
                    trust = _parse_int(row[10])
                    dealer = _parse_int(row[11])
                    total = _parse_int(row[18]) if len(row) > 18 else foreign + trust + dealer
                    return institutional_summary(
                        symbol=symbol,
                        name=str(row[1]).strip(),
                        date=date.strftime("%Y-%m-%d"),
                        foreign=foreign,
                        trust=trust,
                        dealer=dealer,
                        total=total,
                    )
    except Exception as exc:
        return _empty_institutional(symbol, f"TWSE 法人資料讀取失敗：{exc}")
    return _empty_institutional(symbol)


def _fetch_tpex_institutional(code: str, symbol: str) -> dict[str, Any]:
    try:
        for date in _recent_dates():
            response = requests.get(
                TPEX_INSTITUTIONAL_URL,
                params={
                    "date": date.strftime("%Y/%m/%d"),
                    "type": "Daily",
                    "response": "json",
                },
                headers={"User-Agent": USER_AGENT},
                timeout=10,
            )
            response.raise_for_status()
            payload = response.json()
            tables = payload.get("tables") or []
            if not tables:
                continue
            table = tables[0]
            for row in table.get("data", []):
                if str(row[0]).strip() == code:
                    foreign = _parse_int(row[10])
                    trust = _parse_int(row[13])
                    dealer = _parse_int(row[22])
                    total = _parse_int(row[23]) if len(row) > 23 else foreign + trust + dealer
                    roc_date = str(table.get("date") or "")
                    return institutional_summary(
                        symbol=symbol,
                        name=str(row[1]).strip(),
                        date=_roc_date_to_ad(roc_date) or date.strftime("%Y-%m-%d"),
                        foreign=foreign,
                        trust=trust,
                        dealer=dealer,
                        total=total,
                    )
    except Exception as exc:
        return _empty_institutional(symbol, f"TPEx 法人資料讀取失敗：{exc}")
    return _empty_institutional(symbol)


def _roc_date_to_ad(value: str) -> str:
    try:
        parts = value.replace("年", "/").replace("月", "/").replace("日", "").split("/")
        year = int(parts[0]) + 1911
        month = int(parts[1])
        day = int(parts[2])
        return f"{year:04d}-{month:02d}-{day:02d}"
    except Exception:
        return ""


def institutional_summary(
    symbol: str,
    name: str,
    date: str,
    foreign: int,
    trust: int,
    dealer: int,
    total: int,
) -> dict[str, Any]:
    buyers = sum(value > 0 for value in [foreign, trust, dealer])
    sellers = sum(value < 0 for value in [foreign, trust, dealer])

    score = 0
    if total > 0:
        score += 4
    elif total < 0:
        score -= 4
    if buyers >= 2:
        score += 4
    if sellers >= 2:
        score -= 4
    if trust > 0:
        score += 2
    elif trust < 0:
        score -= 2

    if score >= 6:
        bias = "偏多"
        status = "法人同步偏買"
    elif score <= -6:
        bias = "偏空"
        status = "法人同步偏賣"
    elif total > 0:
        bias = "小多"
        status = "法人合計買超"
    elif total < 0:
        bias = "小空"
        status = "法人合計賣超"
    else:
        bias = "中性"
        status = "法人中性"

    return {
        "symbol": symbol,
        "date": date,
        "name": name,
        "foreign": foreign,
        "trust": trust,
        "dealer": dealer,
        "total": total,
        "status": status,
        "bias": bias,
        "score": score,
        "message": "官方盤後資料，非即時盤中法人買賣超",
    }


@st.cache_data(ttl=1800, show_spinner=False)
def resolve_symbol(raw_query: str) -> dict[str, str]:
    query = raw_query.strip()
    if not query:
        return {"symbol": "", "name": ""}

    normalized = query.upper()
    if normalized.endswith((".TW", ".TWO")):
        code = normalized.rsplit(".", 1)[0]
        directory = load_stock_directory()
        name = directory.get(code, {}).get("name", normalized)
        return {"symbol": normalized, "name": name}

    local_match = _local_symbol_match(query)
    if local_match:
        return {"symbol": local_match.symbol, "name": local_match.name}

    try:
        response = requests.get(
            YAHOO_SEARCH_URL,
            params={"q": query, "lang": "zh-TW", "quotesCount": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        quotes = payload.get("quotes") or []
        if quotes:
            quote = quotes[0]
            symbol = str(quote.get("symbol") or "").upper()
            name = quote.get("shortname") or quote.get("longname") or symbol
            if symbol:
                return {"symbol": symbol, "name": str(name)}
    except Exception:
        if query.isdigit():
            return {"symbol": f"{query}.TW", "name": query}
        return {"symbol": "", "name": ""}

    if query.isdigit():
        return {"symbol": f"{query}.TW", "name": query}
    return {"symbol": "", "name": ""}


def download_price_data(
    symbol: str,
    period: str = LOOKBACK_PERIOD,
    refresh_token: int = 0,
    _version: str = CACHE_VERSION,
) -> pd.DataFrame:
    history = download_history_data(symbol, period=period)
    return apply_realtime_quote(history, symbol, refresh_token=refresh_token)


@st.cache_data(ttl=HISTORY_CACHE_TTL, show_spinner=False)
def download_history_data(
    symbol: str,
    period: str = LOOKBACK_PERIOD,
    _version: str = CACHE_VERSION,
) -> pd.DataFrame:
    try:
        df = yf.download(
            symbol,
            period=period,
            interval="1d",
            auto_adjust=False,
            progress=False,
            threads=False,
        )
        if df.empty:
            raise ValueError(f"{symbol} 查無日 K 資料，可能停牌、代碼錯誤或資料源暫時無回應。")
        return _clean_ohlcv(df)
    except Exception as exc:
        raise RuntimeError(f"下載 {symbol} 資料失敗：{exc}") from exc


@st.cache_data(ttl=1800, show_spinner=False)
def get_symbol_name(symbol: str) -> str:
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.get_info()
        return str(info.get("shortName") or info.get("longName") or symbol)
    except Exception:
        return symbol


@st.cache_data(ttl=1800, show_spinner=False)
def add_indicators(df: pd.DataFrame, _version: str = CACHE_VERSION) -> pd.DataFrame:
    data = df.copy()
    close = data["Close"]
    high = data["High"]
    low = data["Low"]
    volume = data["Volume"]

    data["20MA"] = close.rolling(20, min_periods=20).mean()
    data["60MA"] = close.rolling(60, min_periods=60).mean()
    data["5MA"] = close.rolling(5, min_periods=5).mean()
    data["10MA"] = close.rolling(10, min_periods=10).mean()
    bb_std = close.rolling(20, min_periods=20).std()
    data["BB_Mid"] = data["20MA"]
    data["BB_Upper"] = data["BB_Mid"] + 2 * bb_std
    data["BB_Lower"] = data["BB_Mid"] - 2 * bb_std
    bb_range = (data["BB_Upper"] - data["BB_Lower"]).replace(0, np.nan)
    data["BB_Width_Pct"] = bb_range / data["BB_Mid"] * 100
    data["BB_Position"] = ((close - data["BB_Lower"]) / bb_range * 100).clip(0, 150)
    data["5MA_Vol"] = volume.rolling(5, min_periods=5).mean()
    data["Avg_Value_5D"] = (close * volume).rolling(5, min_periods=5).mean()
    data["Volume_Ratio"] = volume / data["5MA_Vol"].replace(0, np.nan)
    intraday_range = (high - low).replace(0, np.nan)
    data["Close_Position"] = ((close - low) / intraday_range * 100).clip(0, 100)
    data["Return_3D"] = close.pct_change(3) * 100
    data["Return_5D"] = close.pct_change(5) * 100
    data["Return_10D"] = close.pct_change(10) * 100
    data["Return_20D"] = close.pct_change(20) * 100
    data["Dist_20MA_Pct"] = (close / data["20MA"] - 1) * 100
    data["Dist_60MA_Pct"] = (close / data["60MA"] - 1) * 100

    low_9 = low.rolling(9, min_periods=9).min()
    high_9 = high.rolling(9, min_periods=9).max()
    rsv_denominator = (high_9 - low_9).replace(0, np.nan)
    data["RSV"] = ((close - low_9) / rsv_denominator * 100).clip(0, 100)
    data["K"] = data["RSV"].ewm(com=2, adjust=False, min_periods=3).mean()
    data["D"] = data["K"].ewm(com=2, adjust=False, min_periods=3).mean()

    previous_close = close.shift(1)
    tr_parts = pd.concat(
        [
            high - low,
            (high - previous_close).abs(),
            (low - previous_close).abs(),
        ],
        axis=1,
    )
    data["TR"] = tr_parts.max(axis=1)
    data["ATR"] = data["TR"].rolling(14, min_periods=14).mean()
    data["ATR_Pct"] = data["ATR"] / close * 100

    ema_12 = close.ewm(span=12, adjust=False, min_periods=12).mean()
    ema_26 = close.ewm(span=26, adjust=False, min_periods=26).mean()
    data["DIF"] = ema_12 - ema_26
    data["DEA"] = data["DIF"].ewm(span=9, adjust=False, min_periods=9).mean()
    data["MACD_Hist"] = data["DIF"] - data["DEA"]

    data["Box_High"] = high.shift(1).rolling(20, min_periods=20).max()
    data["Box_Low"] = low.shift(1).rolling(20, min_periods=20).min()
    data["Box_Width_Pct"] = ((data["Box_High"] - data["Box_Low"]) / data["Box_Low"]) * 100
    return data


@st.cache_data(ttl=MARKET_CACHE_TTL, show_spinner=False)
def get_market_regime(refresh_token: int = 0, _version: str = CACHE_VERSION) -> dict[str, Any]:
    market = add_indicators(download_price_data(MARKET_SYMBOL, refresh_token=refresh_token))
    latest = market.dropna(subset=["20MA", "60MA"]).iloc[-1]
    is_bull = bool(latest["Close"] > latest["20MA"] and latest["Close"] > latest["60MA"])
    return_5d = float(latest["Return_5D"]) if pd.notna(latest["Return_5D"]) else 0.0
    return {
        "is_bull": is_bull,
        "close": float(latest["Close"]),
        "ma20": float(latest["20MA"]),
        "ma60": float(latest["60MA"]),
        "return_5d": return_5d,
        "as_of": latest.name.strftime("%Y-%m-%d"),
    }


def _entry_reason(data: pd.DataFrame, i: int) -> str | None:
    row = data.iloc[i]
    prev = data.iloc[i - 1]
    prev2 = data.iloc[i - 2]

    breakout = (
        row["Box_Width_Pct"] <= 8.5
        and row["Close"] > row["Box_High"]
        and row["Close"] > row["60MA"]
        and row["Volume"] > row["5MA_Vol"] * 1.5
    )
    if breakout:
        return "🚀 強勢箱型爆量突破"

    kd_cross = (
        prev["Close"] > prev["60MA"]
        and prev["K"] > prev["D"]
        and prev2["K"] <= prev2["D"]
        and prev["K"] < 35
    )
    if kd_cross:
        return "🔥 趨勢回檔低檔金叉"
    return None


def _top_divergence_warning(data: pd.DataFrame, i: int, entry_price: float) -> bool:
    row = data.iloc[i]
    prev = data.iloc[i - 1]
    gain_pct = (row["Close"] - entry_price) / entry_price * 100
    if gain_pct <= 10:
        return False

    price_new_high = row["Close"] >= data["Close"].iloc[max(0, i - 19) : i + 1].max()
    hist_peak = data["MACD_Hist"].iloc[max(0, i - 19) : i + 1].max()
    kd_death_cross = row["K"] < row["D"] and prev["K"] >= prev["D"] and row["K"] > 75
    return bool(price_new_high and row["MACD_Hist"] < hist_peak and kd_death_cross)


@st.cache_data(ttl=1800, show_spinner=False)
def run_strategy(df: pd.DataFrame, market_is_bull: bool, _version: str = CACHE_VERSION) -> pd.DataFrame:
    data = add_indicators(df).copy()
    data["Signal"] = "觀望"
    data["Position"] = False
    data["Entry_Price"] = np.nan
    data["Highest_Since_Entry"] = np.nan
    data["Stop_Line"] = np.nan
    data["Initial_Stop"] = np.nan

    in_position = False
    entry_price = np.nan
    highest_since_entry = np.nan
    stop_line = np.nan
    initial_stop = np.nan

    for i in range(60, len(data)):
        row = data.iloc[i]
        if pd.isna(row[["Close", "High", "ATR", "60MA", "K", "D", "MACD_Hist"]]).any():
            continue

        signal = "續抱" if in_position else "觀望"

        if in_position:
            highest_since_entry = max(highest_since_entry, row["High"])
            trailing_candidate = highest_since_entry - 3.0 * row["ATR"]
            stop_line = max(stop_line, trailing_candidate, initial_stop)

            if row["Close"] < stop_line:
                signal = "⚠️ 觸發 ATR 移動停利出場"
                in_position = False
                data.iat[i, data.columns.get_loc("Signal")] = signal
                data.iat[i, data.columns.get_loc("Position")] = False
                data.iat[i, data.columns.get_loc("Entry_Price")] = entry_price
                data.iat[i, data.columns.get_loc("Highest_Since_Entry")] = highest_since_entry
                data.iat[i, data.columns.get_loc("Stop_Line")] = stop_line
                data.iat[i, data.columns.get_loc("Initial_Stop")] = initial_stop
                entry_price = np.nan
                highest_since_entry = np.nan
                stop_line = np.nan
                initial_stop = np.nan
                continue

            if _top_divergence_warning(data, i, entry_price):
                signal = "🚨 MACD頂背離(建議分批減碼)"

        else:
            reason = _entry_reason(data, i)
            if reason:
                if market_is_bull:
                    signal = f"買進：{reason}"
                    in_position = True
                    entry_price = row["Close"]
                    highest_since_entry = row["High"]
                    initial_stop = entry_price - 2.5 * row["ATR"]
                    stop_line = initial_stop
                else:
                    signal = "🛑 滿足技術買點 (因大盤走空而放棄)"

        data.iat[i, data.columns.get_loc("Signal")] = signal
        data.iat[i, data.columns.get_loc("Position")] = in_position
        data.iat[i, data.columns.get_loc("Entry_Price")] = entry_price
        data.iat[i, data.columns.get_loc("Highest_Since_Entry")] = highest_since_entry
        data.iat[i, data.columns.get_loc("Stop_Line")] = stop_line
        data.iat[i, data.columns.get_loc("Initial_Stop")] = initial_stop

    return data


def final_signal(strategy_df: pd.DataFrame) -> str:
    latest = strategy_df.iloc[-1]
    signal = str(latest["Signal"])
    if signal == "續抱":
        stop_line = latest.get("Stop_Line")
        if pd.notna(stop_line):
            return f"續抱，防守線 {stop_line:.2f}"
    return signal


def action_recommendation(strategy_df: pd.DataFrame) -> str:
    latest = strategy_df.iloc[-1]
    signal = str(latest["Signal"])
    if "買進" in signal:
        return "買進"
    if "出場" in signal:
        return "賣出"
    if "MACD頂背離" in signal:
        return "賣出/減碼"
    if signal == "續抱":
        stop_line = latest.get("Stop_Line")
        if pd.notna(stop_line):
            return f"續抱，跌破 {stop_line:.2f} 賣出"
        return "續抱"
    return "觀望"


def plain_trade_plan(
    strategy_df: pd.DataFrame,
    market: dict[str, Any],
    institutional: dict[str, Any] | None = None,
) -> dict[str, str]:
    latest = strategy_df.iloc[-1]
    action = action_recommendation(strategy_df)
    signal = str(latest["Signal"])
    box = box_status(latest)
    bb = bollinger_status(latest)
    levels = trade_price_levels(strategy_df)
    radar = short_term_radar(strategy_df, market.get("return_5d", 0.0), institutional)
    bt_stats, _ = backtest_short_windows(strategy_df)

    close = _price_text(latest.get("Close"))
    close_value = _num(latest.get("Close"))
    buy_value = _num(latest.get("Box_High"))
    buy_price = levels["buy_price"]
    sell_price = levels["sell_price"]
    target_price = radar["target_price"]
    score = int(radar["score"])
    win_7d = bt_stats["win_7d"]

    if "買進" in signal:
        decision = "現在是買進訊號"
        instruction = f"可用收盤價附近分批買進，跌破 {sell_price} 停損，短線先看 {target_price}。"
    elif "出場" in signal:
        decision = "現在是賣出訊號"
        instruction = f"已跌破防守線，先賣出或至少減碼，等下一次站回買點 {buy_price} 再評估。"
    elif "MACD頂背離" in signal:
        decision = "現在偏向賣出/減碼"
        instruction = f"有動能轉弱警訊，若已有獲利先分批減碼；跌破 {sell_price} 全面防守。"
    elif action.startswith("續抱"):
        decision = "目前續抱"
        instruction = f"已有持股就續抱，不跌破 {sell_price} 不急賣；上方先看 {target_price}。"
    elif box["status"] == "箱型整理中":
        decision = "現在先觀望，等突破"
        instruction = f"不要提早追，等收盤站上 {buy_price} 且量能放大再買；若買進後跌破 {sell_price} 停損。"
    elif bb["status"] == "突破上軌":
        decision = "強勢但不適合盲追"
        instruction = f"已突破布林上軌，短線強但容易震盪。若要做，等回測上軌不破或隔日續強；跌破 {sell_price} 防守。"
    elif bb["status"] in {"中軌下方", "跌破下軌"}:
        decision = "現在觀望"
        instruction = f"布林位置偏弱，先等站回中軌或突破 {buy_price} 再買。"
    elif pd.notna(close_value) and pd.notna(buy_value) and close_value > buy_value:
        decision = "已過參考買點，勿盲目追高"
        instruction = f"原買點在 {buy_price}，現在價格已在其上。若要做，等回測不破買點或隔日續強再分批；跌破 {sell_price} 立刻防守。"
    elif score >= 75 and market["is_bull"]:
        decision = "接近可買，但還沒觸發"
        instruction = f"短線條件不差，但仍等價格突破 {buy_price} 再買；追高前確認量能放大。"
    else:
        decision = "現在觀望"
        instruction = f"還沒有精準買點。等突破 {buy_price}，或回測/量能轉強後再做。"

    return {
        "decision": decision,
        "instruction": instruction,
        "now": close,
        "buy": buy_price,
        "sell": sell_price,
        "target": target_price,
        "score": f"{score}/100",
        "win_7d": win_7d,
    }


def box_status(latest: pd.Series) -> dict[str, str]:
    close = latest.get("Close")
    box_high = latest.get("Box_High")
    box_low = latest.get("Box_Low")
    width = latest.get("Box_Width_Pct")

    if pd.isna(close) or pd.isna(box_high) or pd.isna(box_low) or pd.isna(width):
        return {
            "status": "箱型資料不足",
            "detail": "等待 20 日箱型資料成形",
            "range": "-",
            "distance": "-",
        }

    range_text = f"{box_low:.2f} - {box_high:.2f} / 寬度 {width:.2f}%"
    distance_pct = (box_high - close) / close * 100
    if width <= 8.5 and box_low <= close <= box_high:
        return {
            "status": "箱型整理中",
            "detail": "觀望，等收盤突破箱頂且放量",
            "range": range_text,
            "distance": f"距箱頂 {distance_pct:.2f}%",
        }
    if width <= 8.5 and close > box_high:
        return {
            "status": "窄箱突破",
            "detail": "已突破箱頂，交給量能與大盤濾網判斷買進",
            "range": range_text,
            "distance": f"高於箱頂 {(close - box_high) / box_high * 100:.2f}%",
        }
    if close < box_low:
        return {
            "status": "跌破箱底",
            "detail": "偏弱，觀望或依停利線賣出",
            "range": range_text,
            "distance": f"低於箱底 {(box_low - close) / box_low * 100:.2f}%",
        }
    return {
        "status": "非窄箱整理",
        "detail": "觀望，等待壓縮到 8.5% 內或其他買點",
        "range": range_text,
        "distance": f"距箱頂 {distance_pct:.2f}%",
    }


def bollinger_status(latest: pd.Series) -> dict[str, str]:
    close = latest.get("Close")
    upper = latest.get("BB_Upper")
    mid = latest.get("BB_Mid")
    lower = latest.get("BB_Lower")
    width = latest.get("BB_Width_Pct")
    position = latest.get("BB_Position")

    if pd.isna(close) or pd.isna(upper) or pd.isna(mid) or pd.isna(lower):
        return {
            "status": "布林資料不足",
            "detail": "等待 20 日布林通道資料成形",
            "range": "-",
            "position": "-",
        }

    range_text = f"{lower:.2f} / {mid:.2f} / {upper:.2f}"
    position_text = f"{position:.0f}% · 寬度 {width:.2f}%"

    if close > upper:
        return {
            "status": "突破上軌",
            "detail": "短線很強但追價風險升高，適合等回測上軌不破或隔日續強",
            "range": range_text,
            "position": position_text,
        }
    if close >= upper * 0.985:
        return {
            "status": "貼近上軌",
            "detail": "攻擊力強，若量能同步放大可列為短線追蹤",
            "range": range_text,
            "position": position_text,
        }
    if close >= mid:
        return {
            "status": "中軌上方",
            "detail": "短線偏多，但仍需要量能或箱型突破確認",
            "range": range_text,
            "position": position_text,
        }
    if close < lower:
        return {
            "status": "跌破下軌",
            "detail": "短線弱勢或急殺，先觀望，勿接刀",
            "range": range_text,
            "position": position_text,
        }
    return {
        "status": "中軌下方",
        "detail": "短線尚未轉強，等站回中軌再評估",
        "range": range_text,
        "position": position_text,
    }


def _price_text(value: Any) -> str:
    if pd.isna(value):
        return "-"
    return f"{float(value):.2f} 元"


def _num(value: Any, default: float = np.nan) -> float:
    return default if pd.isna(value) else float(value)


def trade_price_levels(strategy_df: pd.DataFrame) -> dict[str, str]:
    latest = strategy_df.iloc[-1]
    signal = str(latest["Signal"])
    close = latest.get("Close")
    atr = latest.get("ATR")
    box_high = latest.get("Box_High")
    stop_line = latest.get("Stop_Line")
    entry_price = latest.get("Entry_Price")

    buy_price = np.nan
    buy_note = "等待箱頂突破或 KD 低檔金叉"
    sell_price = np.nan
    sell_note = "等待買進後建立停損"

    if "買進" in signal:
        buy_price = close
        buy_note = "今日觸發買進，以收盤價估算"
    elif pd.notna(box_high):
        buy_price = box_high
        buy_note = "收盤突破 20 日箱頂且放量才買"

    if signal == "續抱" and pd.notna(entry_price):
        buy_price = entry_price
        buy_note = "目前持股的進場價"

    if pd.notna(stop_line):
        sell_price = stop_line
        sell_note = "跌破 ATR 移動停利線賣出"
    elif pd.notna(close) and pd.notna(atr):
        sell_price = close - 2.5 * atr
        sell_note = "若現在建倉的初始停損估算"

    if "出場" in signal:
        sell_price = close
        sell_note = "今日觸發出場，以收盤價估算"
    elif "MACD頂背離" in signal:
        sell_price = close
        sell_note = "頂背離預警，現價可分批減碼"

    return {
        "buy_price": _price_text(buy_price),
        "buy_note": buy_note,
        "sell_price": _price_text(sell_price),
        "sell_note": sell_note,
    }


def trade_chart_lines(strategy_df: pd.DataFrame) -> list[dict[str, Any]]:
    latest = strategy_df.iloc[-1]
    close = _num(latest.get("Close"))
    atr = _num(latest.get("ATR"))
    box_high = _num(latest.get("Box_High"))
    box_low = _num(latest.get("Box_Low"))
    stop_line = _num(latest.get("Stop_Line"))
    bb_upper = _num(latest.get("BB_Upper"))
    bb_mid = _num(latest.get("BB_Mid"))

    if pd.isna(stop_line) and pd.notna(close) and pd.notna(atr):
        stop_line = close - 2.5 * atr

    lines = [
        {
            "name": "箱型買入線",
            "value": box_high,
            "color": "#facc15",
            "dash": "solid",
        },
        {
            "name": "箱型賣出線",
            "value": box_low if pd.notna(box_low) else stop_line,
            "color": "#fb923c",
            "dash": "dash",
        },
        {
            "name": "布林買入線",
            "value": bb_upper,
            "color": "#d946ef",
            "dash": "solid",
        },
        {
            "name": "布林賣出線",
            "value": bb_mid,
            "color": "#60a5fa",
            "dash": "dash",
        },
        {
            "name": "ATR停損線",
            "value": stop_line,
            "color": "#ef4444",
            "dash": "dot",
        },
    ]
    return [line for line in lines if pd.notna(line["value"])]


def trend_phase_analysis(strategy_df: pd.DataFrame) -> dict[str, str]:
    latest = strategy_df.iloc[-1]
    previous = strategy_df.iloc[-2] if len(strategy_df) >= 2 else latest

    close = _num(latest.get("Close"))
    ma5 = _num(latest.get("5MA"))
    ma10 = _num(latest.get("10MA"))
    ma20 = _num(latest.get("20MA"))
    ma60 = _num(latest.get("60MA"))
    box_high = _num(latest.get("Box_High"))
    box_width = _num(latest.get("Box_Width_Pct"))
    volume_ratio = _num(latest.get("Volume_Ratio"))
    bb_position = _num(latest.get("BB_Position"))
    return_5d = _num(latest.get("Return_5D"), 0.0)
    return_10d = _num(latest.get("Return_10D"), 0.0)
    return_20d = _num(latest.get("Return_20D"), 0.0)
    dist_20ma = _num(latest.get("Dist_20MA_Pct"), 0.0)
    k_value = _num(latest.get("K"))
    d_value = _num(latest.get("D"))
    macd_hist = _num(latest.get("MACD_Hist"))
    prev_macd_hist = _num(previous.get("MACD_Hist"))
    close_position = _num(latest.get("Close_Position"))

    uptrend = pd.notna(close) and pd.notna(ma20) and pd.notna(ma60) and close > ma20 and close > ma60
    ma_stack = (
        pd.notna(close)
        and pd.notna(ma5)
        and pd.notna(ma10)
        and pd.notna(ma20)
        and pd.notna(ma60)
        and close > ma5 > ma10 > ma20 > ma60
    )
    breakout_ready = pd.notna(box_high) and close >= box_high * 0.995
    compact_box = pd.notna(box_width) and box_width <= 10
    macd_rising = pd.notna(macd_hist) and pd.notna(prev_macd_hist) and macd_hist > prev_macd_hist
    macd_fading = pd.notna(macd_hist) and pd.notna(prev_macd_hist) and macd_hist > 0 and macd_hist < prev_macd_hist
    kd_bull = pd.notna(k_value) and pd.notna(d_value) and k_value > d_value
    kd_hot_death = pd.notna(k_value) and pd.notna(d_value) and k_value > 75 and k_value < d_value
    volume_support = pd.notna(volume_ratio) and volume_ratio >= 1.05
    volume_overheat = pd.notna(volume_ratio) and volume_ratio >= 2.8
    high_close = pd.notna(close_position) and close_position >= 70

    late_conditions = [
        return_20d >= 18,
        return_10d >= 12,
        dist_20ma >= 9,
        pd.notna(bb_position) and bb_position >= 110,
        volume_overheat,
    ]
    late_warning = uptrend and sum(bool(item) for item in late_conditions) >= 2 and (macd_fading or kd_hot_death)

    if late_warning:
        return {
            "stage": "末升段",
            "bias": "高檔減碼",
            "detail": "短線漲幅或乖離偏大，且 MACD/KD 動能開始降溫，避免追高，偏向分批停利。",
            "risk": "高",
        }

    if ma_stack and return_5d >= 2 and return_10d >= 4 and pd.notna(bb_position) and bb_position >= 70:
        detail = "均線多頭排列，價格沿 5/10 日線推升，屬於短線攻擊段。"
        if macd_fading:
            detail += " 但 MACD 柱縮短，追價要降部位。"
        return {
            "stage": "主升段",
            "bias": "續抱順勢",
            "detail": detail,
            "risk": "中",
        }

    if uptrend and (breakout_ready or compact_box or 0 <= return_5d <= 8) and (macd_rising or kd_bull or volume_support):
        return {
            "stage": "初升段",
            "bias": "突破試單",
            "detail": "剛站回多頭結構或接近箱頂突破，若量能放大，適合用買點線小部位切入。",
            "risk": "中低",
        }

    if uptrend and high_close:
        return {
            "stage": "初升段",
            "bias": "等待確認",
            "detail": "趨勢剛轉強但尚未形成主升段，等箱頂或布林買入線突破再提高勝率。",
            "risk": "中",
        }

    return {
        "stage": "尚未進入升段",
        "bias": "觀望",
        "detail": "目前還沒有明確初升、主升或末升特徵，先等價格、量能與均線結構同步。",
        "risk": "低",
    }


def short_term_radar(
    strategy_df: pd.DataFrame,
    market_return_5d: float = 0.0,
    institutional: dict[str, Any] | None = None,
) -> dict[str, Any]:
    latest = strategy_df.iloc[-1]
    close = _num(latest.get("Close"))
    box_high = _num(latest.get("Box_High"))
    atr = _num(latest.get("ATR"))
    atr_pct = _num(latest.get("ATR_Pct"))
    value_5d = _num(latest.get("Avg_Value_5D"), 0.0)
    volume_ratio = _num(latest.get("Volume_Ratio"))
    close_position = _num(latest.get("Close_Position"))
    return_5d = _num(latest.get("Return_5D"), 0.0)
    ma5 = _num(latest.get("5MA"))
    ma10 = _num(latest.get("10MA"))
    stop_line = _num(latest.get("Stop_Line"))
    bb = bollinger_status(latest)

    score = 0
    notes: list[str] = []

    if value_5d >= 200_000_000:
        score += 20
        liquidity = "佳"
    elif value_5d >= 50_000_000:
        score += 12
        liquidity = "普通"
        notes.append("成交金額普通，留意滑價")
    else:
        liquidity = "偏低"
        notes.append("成交金額偏低，短線不宜重倉")

    if pd.notna(close) and pd.notna(ma5) and pd.notna(ma10) and close > ma5 > ma10 and return_5d > 0:
        score += 20
    elif return_5d > 0:
        score += 10
        notes.append("短線有漲幅，但均線排列尚未完整")
    else:
        notes.append("5 日動能未轉強")

    relative_strength = return_5d - market_return_5d
    if relative_strength >= 2:
        score += 15
    elif relative_strength >= 0:
        score += 8
        notes.append("相對大盤僅小幅勝出")
    else:
        notes.append("5 日表現弱於大盤")

    if 1.15 <= volume_ratio <= 2.8:
        score += 15
    elif volume_ratio > 2.8:
        score += 8
        notes.append("爆量偏急，追價風險升高")
    else:
        notes.append("量能尚未放大")

    if close_position >= 70:
        score += 15
    elif close_position >= 55:
        score += 8
        notes.append("收盤位置尚可，但攻擊性不強")
    else:
        notes.append("收盤不夠靠近高點")

    if 1.2 <= atr_pct <= 5.5:
        score += 15
    elif 0.8 <= atr_pct <= 7:
        score += 8
        notes.append("波動率可交易但不理想")
    else:
        notes.append("波動率過低或過高，不利 5-7 天節奏")

    if bb["status"] == "貼近上軌":
        score += 8
    elif bb["status"] == "突破上軌":
        score += 4
        notes.append("布林突破上軌，強勢但勿追太急")
    elif bb["status"] == "中軌上方":
        score += 5
    elif bb["status"] in {"中軌下方", "跌破下軌"}:
        score -= 8
        notes.append("布林位置偏弱")

    institutional_score = 0
    if institutional:
        institutional_score = int(institutional.get("score", 0))
        if institutional_score >= 6:
            score += 10
            notes.append("法人籌碼偏多加分")
        elif institutional_score <= -6:
            score -= 10
            notes.append("法人籌碼偏空扣分")
        elif institutional_score > 0:
            score += 5
        elif institutional_score < 0:
            score -= 5

    score = int(max(0, min(100, score)))

    buy_price = box_high if pd.notna(box_high) else close
    sell_price = stop_line if pd.notna(stop_line) else close - 2.5 * atr
    risk = buy_price - sell_price if pd.notna(buy_price) and pd.notna(sell_price) else np.nan
    target_price = buy_price + 1.6 * risk if pd.notna(risk) and risk > 0 else np.nan
    reward_risk = (target_price - buy_price) / risk if pd.notna(target_price) and risk > 0 else np.nan

    if pd.notna(reward_risk) and reward_risk >= 1.5:
        rr_text = f"{reward_risk:.2f}"
    else:
        rr_text = "-"
        notes.append("風險報酬比不足 1.5，不適合硬做")

    if score >= 75:
        grade = "強"
    elif score >= 55:
        grade = "普通"
    else:
        grade = "弱"

    return {
        "score": score,
        "grade": grade,
        "liquidity": liquidity,
        "relative_strength": f"{relative_strength:.2f}%",
        "volume_ratio": f"{volume_ratio:.2f}x" if pd.notna(volume_ratio) else "-",
        "close_position": f"{close_position:.0f}%" if pd.notna(close_position) else "-",
        "atr_pct": f"{atr_pct:.2f}%" if pd.notna(atr_pct) else "-",
        "institutional_bias": institutional.get("bias", "中性") if institutional else "未納入",
        "bollinger_status": bb["status"],
        "target_price": _price_text(target_price),
        "reward_risk": rr_text,
        "notes": "；".join(notes[:3]) if notes else "短線條件完整，仍需依買點與停損執行",
    }


def backtest_short_windows(strategy_df: pd.DataFrame, years: int = 2) -> tuple[dict[str, Any], pd.DataFrame]:
    cutoff = strategy_df.index.max() - pd.DateOffset(years=years)
    trades: list[dict[str, Any]] = []

    for i, (trade_date, row) in enumerate(strategy_df.iterrows()):
        signal = str(row.get("Signal", ""))
        if trade_date < cutoff or "買進" not in signal:
            continue
        if i + 7 >= len(strategy_df):
            continue

        entry = _num(row.get("Close"))
        atr = _num(row.get("ATR"))
        stop = _num(row.get("Initial_Stop"))
        if pd.isna(stop) and pd.notna(entry) and pd.notna(atr):
            stop = entry - 2.5 * atr
        if pd.isna(entry):
            continue

        future = strategy_df.iloc[i + 1 : i + 8]
        close_5 = _num(strategy_df.iloc[i + 5].get("Close"))
        close_7 = _num(strategy_df.iloc[i + 7].get("Close"))
        max_high_7 = _num(future["High"].max())
        min_low_7 = _num(future["Low"].min())
        stop_hit = bool(pd.notna(stop) and (future["Low"] <= stop).any())

        trades.append(
            {
                "日期": trade_date.strftime("%Y-%m-%d"),
                "進場價": entry,
                "5日報酬": (close_5 - entry) / entry * 100 if pd.notna(close_5) else np.nan,
                "7日報酬": (close_7 - entry) / entry * 100 if pd.notna(close_7) else np.nan,
                "7日最大漲幅": (max_high_7 - entry) / entry * 100 if pd.notna(max_high_7) else np.nan,
                "7日最大回撤": (min_low_7 - entry) / entry * 100 if pd.notna(min_low_7) else np.nan,
                "碰停損": stop_hit,
                "訊號": signal,
            }
        )

    trades_df = pd.DataFrame(trades)
    if trades_df.empty:
        return {
            "samples": 0,
            "win_5d": "-",
            "win_7d": "-",
            "avg_5d": "-",
            "avg_7d": "-",
            "avg_mfe": "-",
            "avg_mae": "-",
            "stop_rate": "-",
            "grade": "樣本不足",
        }, trades_df

    win_5d = (trades_df["5日報酬"] > 0).mean() * 100
    win_7d = (trades_df["7日報酬"] > 0).mean() * 100
    avg_5d = trades_df["5日報酬"].mean()
    avg_7d = trades_df["7日報酬"].mean()
    avg_mfe = trades_df["7日最大漲幅"].mean()
    avg_mae = trades_df["7日最大回撤"].mean()
    stop_rate = trades_df["碰停損"].mean() * 100

    if len(trades_df) < 5:
        grade = "樣本偏少"
    elif win_7d >= 60 and avg_7d > 1.5 and stop_rate <= 35:
        grade = "可積極追蹤"
    elif win_7d >= 50 and avg_7d > 0:
        grade = "可小倉試單"
    else:
        grade = "保守觀望"

    return {
        "samples": int(len(trades_df)),
        "win_5d": f"{win_5d:.0f}%",
        "win_7d": f"{win_7d:.0f}%",
        "avg_5d": f"{avg_5d:.2f}%",
        "avg_7d": f"{avg_7d:.2f}%",
        "avg_mfe": f"{avg_mfe:.2f}%",
        "avg_mae": f"{avg_mae:.2f}%",
        "stop_rate": f"{stop_rate:.0f}%",
        "grade": grade,
    }, trades_df


def format_market_status(market: dict[str, Any]) -> str:
    if market["is_bull"]:
        return f"🟢 多頭安全區 ({market['as_of']})"
    return f"🔴 空頭警戒區 ({market['as_of']})"


def _shares_to_lots_text(value: int) -> str:
    lots = value / 1000
    return f"{lots:,.0f} 張"


def render_kpi_cards(
    market: dict[str, Any],
    latest_close: float,
    action: str,
    signal: str,
    phase: dict[str, str],
) -> None:
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("大盤當前狀態", format_market_status(market), f"TWII {market['close']:.0f}")
    with col2:
        st.metric("個股最新收盤價", f"{latest_close:.2f} 元")
    with col3:
        st.metric("操作建議", action)
    with col4:
        st.metric("升段階段", phase["stage"], phase["bias"])
    with col5:
        st.metric("系統訊號", signal)


def render_plain_trade_plan(
    strategy_df: pd.DataFrame,
    market: dict[str, Any],
    institutional: dict[str, Any] | None = None,
) -> None:
    plan = plain_trade_plan(strategy_df, market, institutional)
    st.subheader("短線操作單")
    st.info(f"{plan['decision']}：{plan['instruction']}")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("現在價格", plan["now"])
    with col2:
        st.metric("買進點", plan["buy"])
    with col3:
        st.metric("停損/賣出點", plan["sell"])
    with col4:
        st.metric("短線目標", plan["target"])

    col5, col6 = st.columns(2)
    with col5:
        st.metric("短線分數", plan["score"])
    with col6:
        st.metric("歷史7日勝率", plan["win_7d"])


def render_institutional_panel(institutional: dict[str, Any]) -> None:
    st.subheader("三大法人買賣狀態")
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("法人狀態", institutional["status"], institutional["bias"])
    with col2:
        st.metric("外資買賣超", _shares_to_lots_text(int(institutional["foreign"])))
    with col3:
        st.metric("投信買賣超", _shares_to_lots_text(int(institutional["trust"])))
    with col4:
        st.metric("自營商買賣超", _shares_to_lots_text(int(institutional["dealer"])))
    with col5:
        st.metric("合計買賣超", _shares_to_lots_text(int(institutional["total"])))
    st.caption(f"資料日：{institutional['date']}。{institutional['message']}。")


def render_box_panel(
    strategy_df: pd.DataFrame,
    market: dict[str, Any],
    institutional: dict[str, Any] | None = None,
) -> None:
    latest = strategy_df.iloc[-1]
    status = box_status(latest)
    bb = bollinger_status(latest)
    levels = trade_price_levels(strategy_df)
    radar = short_term_radar(strategy_df, market.get("return_5d", 0.0), institutional)
    phase = trend_phase_analysis(strategy_df)
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("箱型整理狀態", status["status"])
    with col2:
        st.metric("20 日箱型區間", status["range"])
    with col3:
        st.metric("突破距離", status["distance"])
    st.caption(status["detail"])

    colb1, colb2, colb3 = st.columns(3)
    with colb1:
        st.metric("布林通道狀態", bb["status"])
    with colb2:
        st.metric("布林下/中/上軌", bb["range"])
    with colb3:
        st.metric("布林位置", bb["position"])
    st.caption(f"布林分析：{bb['detail']}")

    col4, col5 = st.columns(2)
    with col4:
        st.metric("買點金額", levels["buy_price"])
        st.caption(levels["buy_note"])
    with col5:
        st.metric("賣點金額", levels["sell_price"])
        st.caption(levels["sell_note"])

    chart_lines = trade_chart_lines(strategy_df)
    line_lookup = {line["name"]: _price_text(line["value"]) for line in chart_lines}
    coll1, coll2, coll3, coll4 = st.columns(4)
    with coll1:
        st.metric("箱型買入線", line_lookup.get("箱型買入線", "-"))
    with coll2:
        st.metric("箱型賣出線", line_lookup.get("箱型賣出線", "-"))
    with coll3:
        st.metric("布林買入線", line_lookup.get("布林買入線", "-"))
    with coll4:
        st.metric("布林賣出線", line_lookup.get("布林賣出線", "-"))

    col6, col7, col8, col9 = st.columns(4)
    with col6:
        st.metric("5-7天短線分數", f"{radar['score']} / 100", radar["grade"])
    with col7:
        st.metric("短線目標價", radar["target_price"])
    with col8:
        st.metric("風險報酬比", radar["reward_risk"])
    with col9:
        st.metric("流動性", radar["liquidity"])

    col10, col11, col12, col13 = st.columns(4)
    with col10:
        st.metric("相對大盤5日", radar["relative_strength"])
    with col11:
        st.metric("量能脈衝", radar["volume_ratio"])
    with col12:
        st.metric("收盤強度", radar["close_position"])
    with col13:
        st.metric("ATR波動率", radar["atr_pct"])
    st.caption(f"短線雷達：{radar['notes']}")

    st.subheader("升段階段判讀")
    phase_col1, phase_col2, phase_col3 = st.columns(3)
    with phase_col1:
        st.metric("目前階段", phase["stage"], phase["bias"])
    with phase_col2:
        st.metric("追價風險", phase["risk"])
    with phase_col3:
        st.metric("短線處理", phase["bias"])
    st.caption(phase["detail"])


def render_backtest_panel(strategy_df: pd.DataFrame) -> None:
    stats, trades = backtest_short_windows(strategy_df)
    st.subheader("5-7 天短線回測")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("歷史樣本數", stats["samples"])
    with col2:
        st.metric("5日勝率", stats["win_5d"])
    with col3:
        st.metric("7日勝率", stats["win_7d"])
    with col4:
        st.metric("回測結論", stats["grade"])

    col5, col6, col7, col8 = st.columns(4)
    with col5:
        st.metric("5日平均報酬", stats["avg_5d"])
    with col6:
        st.metric("7日平均報酬", stats["avg_7d"])
    with col7:
        st.metric("7日最大漲幅均值", stats["avg_mfe"])
    with col8:
        st.metric("停損觸發率", stats["stop_rate"])

    st.caption(f"7日最大回撤均值：{stats['avg_mae']}。回測以歷史買進訊號當日收盤價進場，觀察後續第 5 / 第 7 個交易日。")

    if trades.empty:
        st.info("近兩年買進樣本不足，暫時無法形成可靠勝率。")
        return

    recent = trades.tail(10).copy()
    st.dataframe(
        recent.style.format(
            {
                "進場價": "{:.2f}",
                "5日報酬": "{:.2f}%",
                "7日報酬": "{:.2f}%",
                "7日最大漲幅": "{:.2f}%",
                "7日最大回撤": "{:.2f}%",
            },
            na_rep="-",
        ),
        use_container_width=True,
        height=300,
    )


def build_candlestick_chart(strategy_df: pd.DataFrame, title: str) -> go.Figure:
    plot_df = strategy_df.tail(260).copy()
    fig = go.Figure()
    fig.add_trace(
        go.Candlestick(
            x=plot_df.index,
            open=plot_df["Open"],
            high=plot_df["High"],
            low=plot_df["Low"],
            close=plot_df["Close"],
            name="日 K",
            increasing_line_color="#22c55e",
            decreasing_line_color="#ef4444",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=plot_df.index,
            y=plot_df["60MA"],
            mode="lines",
            line=dict(color="#22d3ee", width=2),
            name="60MA 季線",
        )
    )
    if {"BB_Upper", "BB_Mid", "BB_Lower"}.issubset(plot_df.columns):
        fig.add_trace(
            go.Scatter(
                x=plot_df.index,
                y=plot_df["BB_Upper"],
                mode="lines",
                line=dict(color="#c084fc", width=1, dash="dash"),
                name="布林上軌",
            )
        )
        fig.add_trace(
            go.Scatter(
                x=plot_df.index,
                y=plot_df["BB_Mid"],
                mode="lines",
                line=dict(color="#94a3b8", width=1, dash="dash"),
                name="布林中軌",
            )
        )
        fig.add_trace(
            go.Scatter(
                x=plot_df.index,
                y=plot_df["BB_Lower"],
                mode="lines",
                line=dict(color="#818cf8", width=1, dash="dash"),
                name="布林下軌",
            )
        )
    fig.add_trace(
        go.Scatter(
            x=plot_df.index,
            y=plot_df["Box_High"],
            mode="lines",
            line=dict(color="#facc15", width=1, dash="dot"),
            name="20日箱頂",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=plot_df.index,
            y=plot_df["Box_Low"],
            mode="lines",
            line=dict(color="#a3e635", width=1, dash="dot"),
            name="20日箱底",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=plot_df.index,
            y=plot_df["Stop_Line"],
            mode="lines",
            line=dict(color="#fb7185", width=2, dash="dash"),
            name="ATR 動態防守",
        )
    )

    for line in trade_chart_lines(strategy_df):
        fig.add_trace(
            go.Scatter(
                x=plot_df.index,
                y=[line["value"]] * len(plot_df),
                mode="lines",
                line=dict(color=line["color"], width=2, dash=line["dash"]),
                name=f"{line['name']} {line['value']:.2f}",
                hovertemplate=f"{line['name']}<br>{line['value']:.2f}<extra></extra>",
            )
        )

    buy_df = plot_df[plot_df["Signal"].str.contains("買進", na=False)]
    exit_df = plot_df[plot_df["Signal"].str.contains("出場", na=False)]
    if not buy_df.empty:
        fig.add_trace(
            go.Scatter(
                x=buy_df.index,
                y=buy_df["Low"] * 0.98,
                mode="markers",
                marker=dict(symbol="triangle-up", size=14, color="#22c55e"),
                name="買進",
                text=buy_df["Signal"],
                hovertemplate="%{x}<br>%{text}<extra></extra>",
            )
        )
    if not exit_df.empty:
        fig.add_trace(
            go.Scatter(
                x=exit_df.index,
                y=exit_df["High"] * 1.02,
                mode="markers",
                marker=dict(symbol="triangle-down", size=14, color="#f97316"),
                name="出場",
                text=exit_df["Signal"],
                hovertemplate="%{x}<br>%{text}<extra></extra>",
            )
        )

    fig.update_layout(
        title=title,
        template="plotly_white",
        height=620,
        margin=dict(l=12, r=12, t=56, b=28),
        paper_bgcolor="#ffffff",
        plot_bgcolor="#ffffff",
        font=dict(color="#111827"),
        xaxis_rangeslider_visible=False,
        xaxis=dict(showgrid=True, gridcolor="#eef2f7"),
        yaxis=dict(showgrid=True, gridcolor="#eef2f7"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    return fig


def render_decision_table(strategy_df: pd.DataFrame) -> None:
    cutoff = strategy_df.index.max() - pd.DateOffset(years=2)
    table = strategy_df[(strategy_df.index >= cutoff) & (strategy_df["Signal"] != "觀望")].copy()
    if table.empty:
        st.info("過去兩年尚無非觀望交易紀錄。")
        return

    display_columns = [
        "Close",
        "Box_Width_Pct",
        "K",
        "D",
        "DIF",
        "DEA",
        "MACD_Hist",
        "Volume_Ratio",
        "Close_Position",
        "ATR_Pct",
        "BB_Position",
        "BB_Width_Pct",
        "Stop_Line",
        "Signal",
    ]
    table = table[[col for col in display_columns if col in table.columns]]
    table.index = table.index.strftime("%Y-%m-%d")
    st.dataframe(
        table.style.format(
            {
                "Close": "{:.2f}",
                "Box_Width_Pct": "{:.2f}%",
                "K": "{:.2f}",
                "D": "{:.2f}",
                "DIF": "{:.2f}",
                "DEA": "{:.2f}",
                "MACD_Hist": "{:.2f}",
                "Volume_Ratio": "{:.2f}x",
                "Close_Position": "{:.0f}%",
                "ATR_Pct": "{:.2f}%",
                "BB_Position": "{:.0f}%",
                "BB_Width_Pct": "{:.2f}%",
                "Stop_Line": "{:.2f}",
            },
            na_rep="-",
        ),
        use_container_width=True,
        height=360,
    )


def analyze_symbol(symbol: str, market_is_bull: bool, refresh_token: int = 0) -> pd.DataFrame:
    prices = download_price_data(symbol, refresh_token=refresh_token)
    return run_strategy(prices, market_is_bull)


def render_single_stock_tab(market: dict[str, Any], refresh_token: int = 0) -> None:
    if "active_query" not in st.session_state:
        st.session_state.active_query = "2330"

    selected_stock = st.selectbox(
        "股名/股號快速對照",
        options=stock_selector_options(),
        index=0,
        placeholder="可輸入股名搜尋，例如台積電、長榮航、希華",
    )
    selected_query = query_from_selector_label(selected_stock)
    if selected_query:
        st.session_state.active_query = selected_query

    with st.form("stock_lookup_form", clear_on_submit=False):
        query_input = st.text_input(
            "智慧檢索",
            value=st.session_state.active_query,
            placeholder="輸入股名或股號，例如台積電、長榮航、希華、2330、2618",
        )
        submitted = st.form_submit_button("查詢股號並分析", use_container_width=True)
        if submitted:
            st.session_state.active_query = query_input.strip()

    query = st.session_state.active_query
    if not query.strip():
        st.info("輸入中文股名或股票代碼即可啟動單股雷達。")
        return

    try:
        match = SymbolMatch(**resolve_symbol(query))
        if not match.symbol:
            st.error("找不到符合的台股標的，請改用股號或完整 Yahoo Finance 代碼。")
            return
        st.success(f"已對照：{match.name} = {match.symbol}")
        strategy_df = analyze_symbol(match.symbol, market["is_bull"], refresh_token=refresh_token)
        realtime_quote = fetch_realtime_quote(match.symbol, refresh_token=refresh_token)
        institutional = fetch_institutional_flow(match.symbol, refresh_token=refresh_token)
        stock_name = match.name if match.name != match.symbol else get_symbol_name(match.symbol)
        latest = strategy_df.iloc[-1]
    except Exception as exc:
        st.error(f"單股分析失敗：{exc}")
        return

    st.caption(f"{stock_name} · {match.symbol} · 最新資料日 {strategy_df.index[-1].strftime('%Y-%m-%d')}")
    if realtime_quote.get("ok"):
        st.caption(
            f"最新價來源：{realtime_quote['source']} · "
            f"{pd.Timestamp(realtime_quote['date']).strftime('%Y-%m-%d')} {realtime_quote['time']} · "
            f"{realtime_quote['message']}"
        )
    else:
        st.caption(f"最新價來源：Yahoo Finance 日 K 備援。官方即時/延遲報價未套用：{realtime_quote.get('message', '原因不明')}")
    render_plain_trade_plan(strategy_df, market, institutional)
    phase = trend_phase_analysis(strategy_df)
    render_kpi_cards(
        market,
        float(latest["Close"]),
        action_recommendation(strategy_df),
        final_signal(strategy_df),
        phase,
    )
    render_institutional_panel(institutional)
    render_box_panel(strategy_df, market, institutional)

    signal = str(latest["Signal"])
    if "MACD頂背離" in signal:
        st.warning("🚨 MACD頂背離(建議分批減碼)")
    elif "大盤走空" in signal:
        st.error("🛑 個股已滿足技術買點，但大盤未處於多頭安全區。")

    render_backtest_panel(strategy_df)

    st.plotly_chart(
        build_candlestick_chart(strategy_df, f"{stock_name} ({match.symbol}) 波段共振雷達"),
        use_container_width=True,
    )
    st.subheader("歷史決策表格")
    render_decision_table(strategy_df)


def render_scanner_tab(market: dict[str, Any], refresh_token: int = 0) -> None:
    st.caption(f"掃描基準：0050 權值股內建清單，共 {len(WATCHLIST_0050)} 檔。")
    if not st.button("🚀 啟動全自動多股共振掃描", use_container_width=True):
        return

    progress = st.progress(0)
    status = st.empty()
    rows: list[dict[str, Any]] = []

    for idx, symbol in enumerate(WATCHLIST_0050, start=1):
        status.write(f"掃描中：{symbol} ({idx}/{len(WATCHLIST_0050)})")
        try:
            strategy_df = analyze_symbol(symbol, market["is_bull"], refresh_token=refresh_token)
            latest = strategy_df.iloc[-1]
            signal = str(latest["Signal"])
            action = action_recommendation(strategy_df)
            box = box_status(latest)
            bb = bollinger_status(latest)
            levels = trade_price_levels(strategy_df)
            institutional = fetch_institutional_flow(symbol, refresh_token=refresh_token)
            radar = short_term_radar(strategy_df, market.get("return_5d", 0.0), institutional)
            phase = trend_phase_analysis(strategy_df)
            bt_stats, _ = backtest_short_windows(strategy_df)
            is_actionable = (
                "買進" in signal
                or "出場" in signal
                or "MACD頂背離" in signal
                or "大盤走空" in signal
                or box["status"] == "箱型整理中"
            )
            if is_actionable and signal != "續抱":
                rows.append(
                    {
                        "代碼": symbol,
                        "名稱": get_symbol_name(symbol),
                        "日期": latest.name.strftime("%Y-%m-%d"),
                        "收盤價": float(latest["Close"]),
                        "箱型寬度": float(latest["Box_Width_Pct"])
                        if pd.notna(latest["Box_Width_Pct"])
                        else np.nan,
                        "K": float(latest["K"]) if pd.notna(latest["K"]) else np.nan,
                        "D": float(latest["D"]) if pd.notna(latest["D"]) else np.nan,
                        "MACD柱": float(latest["MACD_Hist"]) if pd.notna(latest["MACD_Hist"]) else np.nan,
                        "ATR防守線": float(latest["Stop_Line"]) if pd.notna(latest["Stop_Line"]) else np.nan,
                        "箱型狀態": box["status"],
                        "布林狀態": bb["status"],
                        "升段階段": phase["stage"],
                        "階段操作": phase["bias"],
                        "追價風險": phase["risk"],
                        "法人狀態": institutional["status"],
                        "法人合計": _shares_to_lots_text(int(institutional["total"])),
                        "操作建議": action,
                        "短線分數": radar["score"],
                        "7日勝率": bt_stats["win_7d"],
                        "回測結論": bt_stats["grade"],
                        "目標價": radar["target_price"],
                        "風險報酬比": radar["reward_risk"],
                        "買點金額": levels["buy_price"],
                        "賣點金額": levels["sell_price"],
                        "訊號": signal,
                    }
                )
        except Exception as exc:
            st.warning(f"{symbol} 掃描略過：{exc}")
        progress.progress(idx / len(WATCHLIST_0050))

    status.write("掃描完成")
    if not rows:
        st.info("今日 0050 內建清單沒有剛觸發買進、賣出、頂背離或箱型整理觀察名單。")
        return

    result = pd.DataFrame(rows)
    st.dataframe(
        result.style.format(
            {
                "收盤價": "{:.2f}",
                "箱型寬度": "{:.2f}%",
                "K": "{:.2f}",
                "D": "{:.2f}",
                "MACD柱": "{:.2f}",
                "ATR防守線": "{:.2f}",
            },
            na_rep="-",
        ),
        use_container_width=True,
        height=520,
    )


def main() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background: #ffffff;
            color: #111827;
        }
        .block-container {
            padding-top: 2rem;
            padding-bottom: 3rem;
            max-width: 1440px;
        }
        h1 {
            color: #0f172a;
            font-weight: 800;
            letter-spacing: 0;
            padding-bottom: .25rem;
            border-bottom: 1px solid #e5e7eb;
        }
        h2, h3 {
            color: #111827;
            font-weight: 750;
            letter-spacing: 0;
        }
        p, label, span {
            color: #1f2937;
        }
        div[data-testid="stMetric"] {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 14px 16px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }
        div[data-testid="stMetricLabel"] p {
            color: #64748b;
            font-size: .88rem;
            font-weight: 650;
        }
        div[data-testid="stMetricValue"] {
            color: #0f172a;
            font-size: 1.28rem;
            font-weight: 760;
        }
        div[data-testid="stMetricDelta"] {
            color: #475569;
        }
        .stTabs [data-baseweb="tab-list"] {
            gap: 8px;
            border-bottom: 1px solid #e5e7eb;
            overflow-x: auto;
            flex-wrap: nowrap;
        }
        .stTabs [data-baseweb="tab"] {
            background: #f8fafc;
            color: #334155;
            border: 1px solid #e5e7eb;
            border-bottom: 0;
            border-radius: 8px 8px 0 0;
            padding: 10px 18px;
            white-space: nowrap;
        }
        .stTabs [aria-selected="true"] {
            background: #ffffff;
            color: #0f172a;
            font-weight: 750;
        }
        div[data-testid="stAlert"] {
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            color: #111827;
        }
        div[data-testid="stCaptionContainer"] p {
            color: #64748b;
        }
        button[kind="primary"], .stButton button, .stFormSubmitButton button {
            border-radius: 8px;
            border: 1px solid #2563eb;
            background: #2563eb;
            color: #ffffff;
            font-weight: 700;
            min-height: 44px;
            box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
        }
        button[kind="primary"]:hover, .stButton button:hover, .stFormSubmitButton button:hover {
            border-color: #1d4ed8;
            background: #1d4ed8;
            color: #ffffff;
        }
        .stTextInput input, div[data-baseweb="select"] {
            background: #ffffff;
            border-color: #cbd5e1;
            color: #111827;
            font-size: 16px;
        }
        div[data-testid="stDataFrame"] {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        @media (max-width: 768px) {
            .block-container {
                padding: 0.75rem 0.65rem 2rem;
                max-width: 100%;
            }
            h1 {
                font-size: 1.45rem;
                line-height: 1.25;
                padding-bottom: .5rem;
            }
            h2 {
                font-size: 1.15rem;
                line-height: 1.3;
            }
            h3 {
                font-size: 1.02rem;
            }
            div[data-testid="column"] {
                width: 100% !important;
                flex: 1 1 100% !important;
                min-width: 0 !important;
            }
            div[data-testid="stHorizontalBlock"] {
                gap: .55rem;
            }
            div[data-testid="stMetric"] {
                padding: 11px 12px;
                margin-bottom: .35rem;
            }
            div[data-testid="stMetricLabel"] p {
                font-size: .78rem;
                line-height: 1.25;
            }
            div[data-testid="stMetricValue"] {
                font-size: 1.05rem;
                line-height: 1.25;
                overflow-wrap: anywhere;
            }
            div[data-testid="stMetricDelta"] {
                font-size: .78rem;
            }
            .stTabs [data-baseweb="tab-list"] {
                gap: 6px;
                padding-bottom: 2px;
            }
            .stTabs [data-baseweb="tab"] {
                padding: 8px 11px;
                font-size: .86rem;
                border-radius: 7px 7px 0 0;
            }
            button[kind="primary"], .stButton button, .stFormSubmitButton button {
                width: 100%;
                min-height: 46px;
                font-size: .95rem;
            }
            div[data-testid="stCaptionContainer"] p,
            div[data-testid="stMarkdownContainer"] p {
                font-size: .88rem;
                line-height: 1.55;
            }
            div[data-testid="stPlotlyChart"] {
                overflow-x: auto;
            }
            div[data-testid="stDataFrame"] {
                max-width: calc(100vw - 1.3rem);
                overflow-x: auto;
            }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.title("台股智慧多維度波段共振量化雷達")

    if "refresh_token" not in st.session_state:
        st.session_state.refresh_token = 0
    if "last_refresh_at" not in st.session_state:
        st.session_state.last_refresh_at = pd.Timestamp.now(tz="Asia/Taipei")

    refresh_col1, refresh_col2 = st.columns([1, 3])
    with refresh_col1:
        if st.button("🔄 立即刷新最新資料", use_container_width=True):
            st.session_state.refresh_token += 1
            st.session_state.last_refresh_at = pd.Timestamp.now(tz="Asia/Taipei")
            st.rerun()
    with refresh_col2:
        st.caption(
            "最新成交價採 TWSE/TPEx MIS 即時/延遲報價，快取 15 秒；"
            "大盤狀態快取 30 秒；法人資料為官方盤後資料，快取 5 分鐘。"
        )
        st.caption(f"本頁刷新時間：{st.session_state.last_refresh_at.strftime('%Y-%m-%d %H:%M:%S')}")

    refresh_token = int(st.session_state.refresh_token)

    try:
        market_regime = get_market_regime(refresh_token=refresh_token)
    except Exception as exc:
        st.error(f"大盤資料載入失敗：{exc}")
        st.stop()

    tab_single, tab_scan = st.tabs(["單股智慧雷達儀表板", "台灣前 50 大權值股每日掃描"])
    with tab_single:
        render_single_stock_tab(market_regime, refresh_token=refresh_token)
    with tab_scan:
        render_scanner_tab(market_regime, refresh_token=refresh_token)


if __name__ == "__main__":
    main()
