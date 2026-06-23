from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import html
import json
import re
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
TWSE_ISIN_LISTED_URL = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=2"
TWSE_ISIN_TPEX_URL = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4"
TWSE_INSTITUTIONAL_URL = "https://www.twse.com.tw/rwd/zh/fund/T86"
TPEX_INSTITUTIONAL_URL = "https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade"
TWSE_MIS_QUOTE_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
MARKET_SYMBOL = "^TWII"
LOOKBACK_PERIOD = "3y"
CACHE_VERSION = "candlestick-v3"
HISTORY_CACHE_TTL = 1800
REALTIME_CACHE_TTL = 15
MARKET_CACHE_TTL = 30
INSTITUTIONAL_CACHE_TTL = 300
STOCK_DIRECTORY_CACHE_VERSION = "stock-directory-v5"
SYMBOL_LOOKUP_CACHE_VERSION = "symbol-lookup-v5"

STOCK_FUTURES_CODES = {
    "1101",
    "1216",
    "1301",
    "1303",
    "1326",
    "1402",
    "1476",
    "1590",
    "2002",
    "2049",
    "2201",
    "2207",
    "2301",
    "2303",
    "2308",
    "2317",
    "2324",
    "2327",
    "2330",
    "2344",
    "2345",
    "2352",
    "2353",
    "2354",
    "2356",
    "2357",
    "2376",
    "2377",
    "2379",
    "2382",
    "2383",
    "2395",
    "2408",
    "2412",
    "2449",
    "2454",
    "2603",
    "2609",
    "2615",
    "2618",
    "2633",
    "2801",
    "2880",
    "2881",
    "2882",
    "2883",
    "2884",
    "2885",
    "2886",
    "2887",
    "2890",
    "2891",
    "2892",
    "2912",
    "3008",
    "3034",
    "3045",
    "3231",
    "3481",
    "3711",
    "4904",
    "5871",
    "5876",
    "5880",
    "6415",
    "6669",
}

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
    "1476": "儒鴻",
    "2049": "上銀",
    "2201": "裕隆",
    "2301": "光寶科",
    "2324": "仁寶",
    "2344": "華邦電",
    "2353": "宏碁",
    "2354": "鴻準",
    "2356": "英業達",
    "2376": "技嘉",
    "2377": "微星",
    "2383": "台光電",
    "2404": "漢唐",
    "2409": "友達",
    "2449": "京元電子",
    "2474": "可成",
    "2484": "希華",
    "2498": "宏達電",
    "2605": "新興",
    "2610": "華航",
    "2633": "台灣高鐵",
    "3017": "奇鋐",
    "3037": "欣興",
    "3231": "緯創",
    "3481": "群創",
    "3661": "世芯-KY",
    "4938": "和碩",
    "4968": "立積",
    "4976": "佳凌",
    "6409": "旭隼",
    "8454": "富邦媒",
    "9910": "豐泰",
}

COMMON_TPEX_STOCKS = {
    "3105": "穩懋",
    "3288": "點晶",
    "3707": "漢磊",
    "4123": "晟德",
    "5274": "信驊",
    "5347": "世界",
    "5483": "中美晶",
    "6187": "萬潤",
    "6274": "台燿",
    "6488": "環球晶",
    "8071": "能率網通",
    "8299": "群聯",
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
    "希華": "2484",
    "希华": "2484",
    "佳凌": "4976",
    "信驊": "5274",
    "信骅": "5274",
    "點晶": "3288",
    "点晶": "3288",
    "漢磊": "3707",
    "汉磊": "3707",
    "能率網通": "8071",
    "能率网通": "8071",
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


def _add_stock_to_directory(
    directory: dict[str, dict[str, str]],
    code: Any,
    name: Any,
    suffix: str,
) -> None:
    code_text = str(code or "").strip()
    name_text = str(name or "").strip()
    if code_text.isdigit() and len(code_text) == 4 and name_text:
        directory[code_text] = {"symbol": f"{code_text}.{suffix}", "name": name_text}


def _record_code_name(item: dict[str, Any]) -> tuple[str, str]:
    code_keys = (
        "公司代號",
        "股票代號",
        "證券代號",
        "SecuritiesCompanyCode",
        "Code",
        "有價證券代號",
    )
    name_keys = (
        "公司簡稱",
        "公司名稱",
        "股票名稱",
        "證券名稱",
        "有價證券名稱",
        "CompanyAbbreviation",
        "CompanyName",
        "Name",
    )
    code = next((str(item.get(key) or "").strip() for key in code_keys if item.get(key)), "")
    name = next((str(item.get(key) or "").strip() for key in name_keys if item.get(key)), "")
    return code, name


def _load_openapi_stocks(
    directory: dict[str, dict[str, str]],
    url: str,
    suffix: str,
) -> None:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=10)
    response.raise_for_status()
    for item in response.json():
        if isinstance(item, dict):
            code, name = _record_code_name(item)
            _add_stock_to_directory(directory, code, name, suffix)


def _load_isin_stocks(
    directory: dict[str, dict[str, str]],
    url: str,
    suffix: str,
) -> None:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=10)
    response.raise_for_status()
    response.encoding = "big5"
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", response.text, flags=re.IGNORECASE | re.DOTALL)
    for row_html in rows:
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row_html, flags=re.IGNORECASE | re.DOTALL)
        if not cells:
            continue
        first_cell = re.sub(r"<[^>]+>", "", cells[0])
        first_cell = html.unescape(first_cell).replace("\xa0", " ").strip()
        match = re.match(r"^(\d{4})[\s\u3000]+(.+)$", first_cell)
        if not match:
            continue
        code, name = match.groups()
        name = name.strip()
        if name in {"上市認購(售)權證", "上市公司", "上櫃公司", "上櫃認購(售)權證"}:
            continue
        if "KY" not in name and any(mark in name for mark in ("購", "售", "牛", "熊", "權證", "特別股")):
            continue
        _add_stock_to_directory(directory, code, name, suffix)


@st.cache_data(ttl=1800, show_spinner=False)
def load_stock_directory(cache_version: str = STOCK_DIRECTORY_CACHE_VERSION) -> dict[str, dict[str, str]]:
    _ = cache_version
    directory = {
        code: {"symbol": _symbol_from_code(code), "name": name}
        for code, name in COMMON_TW_STOCKS.items()
    }
    directory.update(
        {
            code: {"symbol": f"{code}.TWO", "name": name}
            for code, name in COMMON_TPEX_STOCKS.items()
        }
    )

    sources = (
        (_load_openapi_stocks, TWSE_LISTED_URL, "TW"),
        (_load_openapi_stocks, TPEX_OTC_URL, "TWO"),
        (_load_isin_stocks, TWSE_ISIN_LISTED_URL, "TW"),
        (_load_isin_stocks, TWSE_ISIN_TPEX_URL, "TWO"),
    )
    for loader, url, suffix in sources:
        try:
            loader(directory, url, suffix)
        except Exception:
            pass

    return directory


def stock_selector_options() -> list[str]:
    directory = load_stock_directory(STOCK_DIRECTORY_CACHE_VERSION)
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

    directory = load_stock_directory(STOCK_DIRECTORY_CACHE_VERSION)

    if lookup_key.isdigit() and lookup_key in directory:
        data = directory[lookup_key]
        return SymbolMatch(symbol=data["symbol"], name=data["name"])

    alias_code = TW_STOCK_ALIASES.get(lookup_key)
    if alias_code and alias_code in directory:
        data = directory[alias_code]
        return SymbolMatch(symbol=data["symbol"], name=data["name"])

    exact_matches: list[SymbolMatch] = []
    prefix_matches: list[SymbolMatch] = []
    partial_matches: list[SymbolMatch] = []
    for data in directory.values():
        name = data["name"]
        name_key = _normalize_lookup_key(name)
        if lookup_key == name_key:
            exact_matches.append(SymbolMatch(symbol=data["symbol"], name=name))
        elif name_key.startswith(lookup_key):
            prefix_matches.append(SymbolMatch(symbol=data["symbol"], name=name))
        elif lookup_key in name_key:
            partial_matches.append(SymbolMatch(symbol=data["symbol"], name=name))
    if exact_matches:
        return exact_matches[0]
    if prefix_matches:
        return sorted(prefix_matches, key=lambda match: (len(match.name), match.symbol))[0]
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


def _parse_quote_levels(value: Any) -> list[float]:
    try:
        return [
            number
            for number in (_parse_float(item) for item in str(value or "").split("_"))
            if pd.notna(number)
        ]
    except Exception:
        return []


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
            "previous_close": _parse_float(item.get("y")),
            "bid_prices": _parse_quote_levels(item.get("b")),
            "ask_prices": _parse_quote_levels(item.get("a")),
            "bid_lots": _parse_quote_levels(item.get("g")),
            "ask_lots": _parse_quote_levels(item.get("f")),
            "source": "TWSE MIS 官方即時/延遲報價",
            "message": quote_message,
        }
    except Exception as exc:
        return {"ok": False, "message": f"官方報價讀取失敗：{exc}"}


@st.cache_data(ttl=REALTIME_CACHE_TTL, show_spinner=False)
def download_intraday_data(
    symbol: str,
    refresh_token: int = 0,
    _version: str = CACHE_VERSION,
) -> pd.DataFrame:
    try:
        data = yf.download(
            symbol,
            period="1d",
            interval="1m",
            auto_adjust=False,
            progress=False,
            threads=False,
            timeout=10,
        )
        if data.empty:
            return pd.DataFrame()
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        required = ["Open", "High", "Low", "Close", "Volume"]
        if not all(column in data.columns for column in required):
            return pd.DataFrame()
        data = data[required].copy().dropna(subset=["Close"])
        index = pd.to_datetime(data.index)
        if index.tz is None:
            index = index.tz_localize("UTC")
        data.index = index.tz_convert("Asia/Taipei")
        data = data.between_time("09:00", "13:30")
        typical_price = (data["High"] + data["Low"] + data["Close"]) / 3
        cumulative_volume = data["Volume"].fillna(0).cumsum()
        data["VWAP"] = (typical_price * data["Volume"].fillna(0)).cumsum().div(
            cumulative_volume.replace(0, np.nan)
        )
        return data
    except Exception:
        return pd.DataFrame()


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


@st.cache_data(ttl=INSTITUTIONAL_CACHE_TTL, show_spinner=False)
def fetch_twse_institutional_map(date_text: str, _version: str = CACHE_VERSION) -> dict[str, dict[str, Any]]:
    try:
        response = requests.get(
            TWSE_INSTITUTIONAL_URL,
            params={"date": date_text, "selectType": "ALL", "response": "json"},
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("stat") != "OK":
            return {}
        records: dict[str, dict[str, Any]] = {}
        date = pd.to_datetime(date_text, format="%Y%m%d", errors="coerce")
        date_label = date.strftime("%Y-%m-%d") if pd.notna(date) else date_text
        for row in payload.get("data", []):
            code = str(row[0]).strip()
            if not code.isdigit():
                continue
            foreign = _parse_int(row[4]) + _parse_int(row[7])
            trust = _parse_int(row[10])
            dealer = _parse_int(row[11])
            total = _parse_int(row[18]) if len(row) > 18 else foreign + trust + dealer
            records[code] = {
                "date": date_label,
                "name": str(row[1]).strip(),
                "foreign": foreign,
                "trust": trust,
                "dealer": dealer,
                "total": total,
            }
        return records
    except Exception:
        return {}


@st.cache_data(ttl=INSTITUTIONAL_CACHE_TTL, show_spinner=False)
def fetch_tpex_institutional_map(date_text: str, _version: str = CACHE_VERSION) -> dict[str, dict[str, Any]]:
    try:
        date = pd.to_datetime(date_text, format="%Y%m%d", errors="coerce")
        if pd.isna(date):
            return {}
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
            return {}
        table = tables[0]
        roc_date = str(table.get("date") or "")
        date_label = _roc_date_to_ad(roc_date) or date.strftime("%Y-%m-%d")
        records: dict[str, dict[str, Any]] = {}
        for row in table.get("data", []):
            code = str(row[0]).strip()
            if not code.isdigit():
                continue
            foreign = _parse_int(row[10])
            trust = _parse_int(row[13])
            dealer = _parse_int(row[22])
            total = _parse_int(row[23]) if len(row) > 23 else foreign + trust + dealer
            records[code] = {
                "date": date_label,
                "name": str(row[1]).strip(),
                "foreign": foreign,
                "trust": trust,
                "dealer": dealer,
                "total": total,
            }
        return records
    except Exception:
        return {}


@st.cache_data(ttl=INSTITUTIONAL_CACHE_TTL, show_spinner=False)
def fetch_institutional_history(
    symbol: str,
    lookback_days: int = 12,
    refresh_token: int = 0,
    _version: str = CACHE_VERSION,
) -> list[dict[str, Any]]:
    code = symbol.upper().split(".", 1)[0]
    suffix = symbol.upper().split(".", 1)[1] if "." in symbol else "TW"
    rows: list[dict[str, Any]] = []

    for date in _recent_dates(lookback_days):
        date_text = date.strftime("%Y%m%d")
        if suffix == "TWO":
            daily = fetch_tpex_institutional_map(date_text)
        else:
            daily = fetch_twse_institutional_map(date_text)
            if code not in daily:
                daily = fetch_tpex_institutional_map(date_text)
        record = daily.get(code)
        if record:
            rows.append(record)
    return rows


def _streak_text(value: int) -> str:
    if value > 0:
        return f"連買 {value} 天"
    if value < 0:
        return f"連賣 {abs(value)} 天"
    return "未連續"


def _signed_streak(records: list[dict[str, Any]], key: str) -> int:
    values = [int(row.get(key, 0)) for row in records if row.get(key) is not None]
    if not values or values[0] == 0:
        return 0
    sign = 1 if values[0] > 0 else -1
    count = 0
    for value in values:
        if value == 0 or (value > 0) != (sign > 0):
            break
        count += 1
    return sign * count


def institutional_streak_summary(records: list[dict[str, Any]]) -> dict[str, Any]:
    latest = records[0] if records else {}
    summary = {
        "date": latest.get("date", "-"),
        "total": _signed_streak(records, "total"),
        "foreign": _signed_streak(records, "foreign"),
        "trust": _signed_streak(records, "trust"),
        "dealer": _signed_streak(records, "dealer"),
    }
    summary["total_text"] = _streak_text(summary["total"])
    summary["foreign_text"] = _streak_text(summary["foreign"])
    summary["trust_text"] = _streak_text(summary["trust"])
    summary["dealer_text"] = _streak_text(summary["dealer"])
    return summary


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
def resolve_symbol(
    raw_query: str,
    cache_version: str = SYMBOL_LOOKUP_CACHE_VERSION,
) -> dict[str, str]:
    _ = cache_version
    query = raw_query.strip()
    if not query:
        return {"symbol": "", "name": ""}

    normalized = query.upper()
    if normalized.endswith((".TW", ".TWO")):
        code = normalized.rsplit(".", 1)[0]
        directory = load_stock_directory(STOCK_DIRECTORY_CACHE_VERSION)
        name = directory.get(code, {}).get("name", normalized)
        return {"symbol": normalized, "name": name}

    local_match = _local_symbol_match(query)
    if local_match:
        return {"symbol": local_match.symbol, "name": local_match.name}

    try:
        response = requests.get(
            YAHOO_SEARCH_URL,
            params={"q": query, "lang": "zh-TW", "quotesCount": 10},
            headers={"User-Agent": USER_AGENT},
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        quotes = payload.get("quotes") or []
        if quotes:
            quote = next(
                (
                    item
                    for item in quotes
                    if str(item.get("symbol") or "").upper().endswith((".TW", ".TWO"))
                ),
                None,
            )
            if quote is None:
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
def add_indicators(df: pd.DataFrame, version: str = CACHE_VERSION) -> pd.DataFrame:
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
    typical_price = (high + low + close) / 3
    volume_20 = volume.rolling(20, min_periods=20).sum().replace(0, np.nan)
    data["Volume_Price_20"] = (typical_price * volume).rolling(20, min_periods=20).sum() / volume_20
    intraday_range = (high - low).replace(0, np.nan)
    data["Close_Position"] = ((close - low) / intraday_range * 100).clip(0, 100)
    body_high = pd.concat([data["Open"], close], axis=1).max(axis=1)
    body_low = pd.concat([data["Open"], close], axis=1).min(axis=1)
    data["Upper_Shadow"] = (high - body_high).clip(lower=0)
    data["Lower_Shadow"] = (body_low - low).clip(lower=0)
    data["Body_Size"] = (close - data["Open"]).abs()
    data["Upper_Shadow_Ratio"] = (data["Upper_Shadow"] / intraday_range).clip(0, 1)
    data["Lower_Shadow_Ratio"] = (data["Lower_Shadow"] / intraday_range).clip(0, 1)
    data["Body_Ratio"] = (data["Body_Size"] / intraday_range).clip(0, 1)
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
    data["Prev_High_60"] = high.shift(1).rolling(60, min_periods=60).max()
    data["Prev_Low_60"] = low.shift(1).rolling(60, min_periods=60).min()
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
def run_strategy(df: pd.DataFrame, market_is_bull: bool, version: str = CACHE_VERSION) -> pd.DataFrame:
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
) -> dict[str, Any]:
    latest = strategy_df.iloc[-1]
    final = final_operation_advice(strategy_df, market, institutional)
    levels = final["levels"]
    bt_stats, _ = backtest_short_windows(strategy_df)

    latest_close = _num(latest.get("Close"))
    previous_close = _num(strategy_df.iloc[-2].get("Close")) if len(strategy_df) >= 2 else np.nan
    change_points = (
        latest_close - previous_close
        if pd.notna(latest_close) and pd.notna(previous_close)
        else np.nan
    )
    close = _price_text(latest_close)
    support_buy = levels["support_buy"]
    breakout_buy = levels["breakout_buy"]
    stop_price = levels["stop_price"]
    target_price = levels["target_price"]
    win_7d = bt_stats["win_7d"]
    reasons = final["reasons"]
    decision = final["advice"]
    instruction = "；".join(reasons)

    return {
        "decision": decision,
        "instruction": instruction,
        "now": close,
        "change_points": f"{change_points:+.2f} 點" if pd.notna(change_points) else "-",
        "change_pct": f"{(latest_close / previous_close - 1) * 100:+.2f}%" if pd.notna(latest_close) and pd.notna(previous_close) and previous_close else "-",
        "support_buy": support_buy,
        "breakout_buy": breakout_buy,
        "breakout_status": levels["breakout_status"],
        "stop": stop_price,
        "first_sell": levels["first_sell_zone"],
        "second_sell": levels["second_sell_zone"],
        "trailing_stop": levels["trailing_stop"],
        "trailing_note": levels["trailing_note"],
        "target": target_price,
        "risk_reward": levels["reward_risk"],
        "risk": levels["risk"],
        "reward": levels["reward"],
        "score": f"{final['confidence']}/100",
        "win_7d": win_7d,
        "stage": final["phase"]["stage"],
        "reasons": reasons,
        "shadow_summary": f"下引線承接{final['shadows']['lower_strength']}、上引線賣壓{final['shadows']['upper_strength']}",
        "pattern": f"{final['pattern']['pattern']} · {final['pattern']['bias']}",
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


def candlestick_analysis(strategy_df: pd.DataFrame) -> dict[str, Any]:
    latest = strategy_df.iloc[-1]
    recent = strategy_df.tail(3)
    close = _num(latest.get("Close"))
    upper_ratio = _num(latest.get("Upper_Shadow_Ratio"), 0.0)
    lower_ratio = _num(latest.get("Lower_Shadow_Ratio"), 0.0)
    volume_ratio = _num(latest.get("Volume_Ratio"), 0.0)
    box_high = _num(latest.get("Box_High"))
    box_low = _num(latest.get("Box_Low"))
    bb_upper = _num(latest.get("BB_Upper"))
    bb_lower = _num(latest.get("BB_Lower"))

    near_pressure = any(
        pd.notna(value) and value > 0 and close >= value * 0.98
        for value in [box_high, bb_upper]
    )
    near_support = any(
        pd.notna(value) and value > 0 and close <= value * 1.03
        for value in [box_low, bb_lower]
    )
    repeated_upper = int((recent["Upper_Shadow_Ratio"] >= 0.35).sum()) >= 2
    repeated_lower = int((recent["Lower_Shadow_Ratio"] >= 0.35).sum()) >= 2

    upper_score = min(
        100,
        int(upper_ratio * 100)
        + (20 if near_pressure else 0)
        + (15 if volume_ratio >= 1.5 else 0)
        + (15 if repeated_upper else 0),
    )
    lower_score = min(
        100,
        int(lower_ratio * 100)
        + (20 if near_support else 0)
        + (15 if volume_ratio >= 1.2 else 0)
        + (15 if repeated_lower else 0),
    )

    def strength(score: int) -> str:
        if score >= 85:
            return "極強"
        if score >= 65:
            return "強"
        if score >= 40:
            return "中"
        return "弱"

    upper_note = "上引線不明顯，壓力訊號有限。"
    if upper_score >= 65:
        upper_note = "接近壓力區且出現長上引線，追價前需確認賣壓已消化。"
    elif upper_score >= 40:
        upper_note = "出現部分上方賣壓，宜觀察下一根 K 線是否轉弱。"
    lower_note = "下引線不明顯，尚未看到強承接訊號。"
    if lower_score >= 65:
        lower_note = "支撐區出現長下引線，低檔承接力道明顯。"
    elif lower_score >= 40:
        lower_note = "盤中低點有承接，可作為支撐區的輔助依據。"

    return {
        "upper_strength": strength(upper_score),
        "upper_score": upper_score,
        "upper_note": upper_note,
        "lower_strength": strength(lower_score),
        "lower_score": lower_score,
        "lower_note": lower_note,
        "long_upper": upper_score >= 65,
        "long_lower": lower_score >= 65,
    }


def candlestick_pattern(strategy_df: pd.DataFrame) -> dict[str, str]:
    if len(strategy_df) < 3:
        return {"pattern": "無明顯型態", "bias": "中性", "detail": "K 線資料不足。"}

    row = strategy_df.iloc[-1]
    prev = strategy_df.iloc[-2]
    prev2 = strategy_df.iloc[-3]
    o, h, low, c = (_num(row.get(key)) for key in ["Open", "High", "Low", "Close"])
    po, pc = _num(prev.get("Open")), _num(prev.get("Close"))
    p2o, p2c = _num(prev2.get("Open")), _num(prev2.get("Close"))
    body = abs(c - o)
    candle_range = max(h - low, 1e-9)
    upper = h - max(o, c)
    lower = min(o, c) - low
    prev_body = abs(pc - po)
    body_ratio = body / candle_range

    bullish_engulfing = c > o and pc < po and o <= pc and c >= po and body >= prev_body
    bearish_engulfing = c < o and pc > po and o >= pc and c <= po and body >= prev_body
    morning_star = p2c < p2o and abs(pc - po) <= abs(p2c - p2o) * 0.5 and c > o and c >= (p2o + p2c) / 2
    evening_star = p2c > p2o and abs(pc - po) <= abs(p2c - p2o) * 0.5 and c < o and c <= (p2o + p2c) / 2

    if morning_star:
        return {"pattern": "晨星 Morning Star", "bias": "偏多", "detail": "空方力道收斂後出現反轉紅 K，低檔轉強機率提高。"}
    if evening_star:
        return {"pattern": "黃昏星 Evening Star", "bias": "偏空", "detail": "高檔動能停頓後轉弱，應留意回檔與停利。"}
    if bullish_engulfing:
        return {"pattern": "多方吞噬 Bullish Engulfing", "bias": "偏多", "detail": "紅 K 實體吞噬前一日黑 K，買盤轉強。"}
    if bearish_engulfing:
        return {"pattern": "空方吞噬 Bearish Engulfing", "bias": "偏空", "detail": "黑 K 實體吞噬前一日紅 K，賣壓轉強。"}
    if body_ratio <= 0.1:
        return {"pattern": "十字線 Doji", "bias": "中性", "detail": "多空暫時平衡，需等待下一根 K 線確認方向。"}
    if lower >= body * 2 and upper <= max(body, candle_range * 0.15):
        return {"pattern": "錘子線 Hammer", "bias": "偏多", "detail": "長下引線顯示低檔承接，若位於支撐區更具參考性。"}
    if upper >= body * 2 and lower <= max(body, candle_range * 0.15):
        if c < o:
            return {"pattern": "射擊之星 Shooting Star", "bias": "偏空", "detail": "長上引線顯示壓力沉重，高檔宜降低追價。"}
        return {"pattern": "倒錘子線 Inverted Hammer", "bias": "觀察", "detail": "上方試價後拉回，位於低檔時需隔日轉強確認。"}
    return {"pattern": "無明顯型態", "bias": "中性", "detail": "目前未形成八種主要反轉 K 線型態。"}


def trade_price_levels(strategy_df: pd.DataFrame) -> dict[str, Any]:
    latest = strategy_df.iloc[-1]
    signal = str(latest["Signal"])
    close = _num(latest.get("Close"))
    atr = _num(latest.get("ATR"))
    box_high = _num(latest.get("Box_High"))
    box_low = _num(latest.get("Box_Low"))
    ma20 = _num(latest.get("20MA"))
    ma60 = _num(latest.get("60MA"))
    bb_upper = _num(latest.get("BB_Upper"))
    bb_mid = _num(latest.get("BB_Mid"))
    bb_lower = _num(latest.get("BB_Lower"))
    volume_price = _num(latest.get("Volume_Price_20"))
    previous_high = _num(latest.get("Prev_High_60"))
    previous_low = _num(latest.get("Prev_Low_60"))
    stop_line = _num(latest.get("Stop_Line"))
    recent_long_lower = strategy_df.loc[
        strategy_df["Lower_Shadow_Ratio"].fillna(0) >= 0.35, "Low"
    ].tail(5)
    wick_support = _num(recent_long_lower.iloc[-1]) if not recent_long_lower.empty else np.nan

    support_candidates = [box_low, ma20, ma60, bb_mid, bb_lower, volume_price, previous_low, wick_support]
    support_candidates = sorted(
        {float(value) for value in support_candidates if pd.notna(value) and value > 0 and value <= close * 1.02},
        reverse=True,
    )
    if support_candidates:
        anchor = support_candidates[0]
        cluster_gap = max(atr * 1.25 if pd.notna(atr) else 0, close * 0.03)
        support_cluster = [value for value in support_candidates if anchor - value <= cluster_gap][:3]
        support_low = min(support_cluster)
        support_high = min(close, max(support_cluster))
        if support_high - support_low < close * 0.006:
            padding = max(atr * 0.25 if pd.notna(atr) else 0, close * 0.004)
            support_low = max(0, support_low - padding)
            support_high = min(close, support_high + padding)
    else:
        support_low = close - atr if pd.notna(close) and pd.notna(atr) else np.nan
        support_high = close if pd.notna(close) else np.nan

    pressure_candidates = [box_high, bb_upper, previous_high]
    pressure_candidates = sorted(
        {float(value) for value in pressure_candidates if pd.notna(value) and value > 0}
    )
    nearby_pressure = [value for value in pressure_candidates if value >= close * 0.98 and value <= close * 1.08]
    breakout_price = max(nearby_pressure) if nearby_pressure else (min(pressure_candidates) if pressure_candidates else close)
    volume_ratio = _num(latest.get("Volume_Ratio"), 0.0)
    if pd.notna(close) and pd.notna(breakout_price) and close > breakout_price:
        breakout_status = "已突破" if volume_ratio >= 1.2 else "突破量能不足，需觀察"
    else:
        breakout_status = "尚未突破"

    stop_price = stop_line
    stop_note = "跌破停損價應出場"
    if pd.isna(stop_price) and pd.notna(close) and pd.notna(atr):
        stop_price = close - 2.5 * atr
    if "出場" in signal:
        stop_note = "今日已觸發出場，跌破停損價應出場"
    elif "MACD頂背離" in signal:
        stop_note = "頂背離預警；跌破停損價應出場"

    support_mid = (support_low + support_high) / 2 if pd.notna(support_low) and pd.notna(support_high) else np.nan
    near_support = pd.notna(support_high) and pd.notna(atr) and close <= support_high + atr * 0.6
    entry_basis = support_mid if near_support and pd.notna(support_mid) else breakout_price
    entry_basis_name = "支撐買點中間值" if near_support else "突破買點"
    risk = entry_basis - stop_price if pd.notna(entry_basis) and pd.notna(stop_price) else np.nan

    first_anchor = max(
        [value for value in [breakout_price, bb_upper, entry_basis + risk * 1.5] if pd.notna(value)],
        default=np.nan,
    )
    zone_pad = atr * 0.25 if pd.notna(atr) else first_anchor * 0.008
    first_sell_low = first_anchor - zone_pad if pd.notna(first_anchor) else np.nan
    first_sell_high = first_anchor + zone_pad if pd.notna(first_anchor) else np.nan
    second_anchor = entry_basis + risk * 2.3 if pd.notna(entry_basis) and pd.notna(risk) and risk > 0 else np.nan
    second_pad = atr * 0.3 if pd.notna(atr) else second_anchor * 0.01
    second_sell_low = second_anchor - second_pad if pd.notna(second_anchor) else np.nan
    second_sell_high = second_anchor + second_pad if pd.notna(second_anchor) else np.nan
    target_price = entry_basis + risk * 3.0 if pd.notna(entry_basis) and pd.notna(risk) and risk > 0 else np.nan
    reward = first_anchor - entry_basis if pd.notna(first_anchor) and pd.notna(entry_basis) else np.nan
    reward_risk = reward / risk if pd.notna(reward) and pd.notna(risk) and risk > 0 else np.nan

    previous_day_low = _num(strategy_df.iloc[-2].get("Low")) if len(strategy_df) >= 2 else np.nan
    trailing_candidates = [value for value in [stop_line, ma20, previous_day_low] if pd.notna(value) and value < close]
    trailing_stop = max(trailing_candidates) if trailing_candidates else stop_price

    support_text = (
        f"{support_low:.2f} ~ {support_high:.2f} 元"
        if pd.notna(support_low) and pd.notna(support_high)
        else "-"
    )
    reward_risk_text = f"1 : {reward_risk:.2f}" if pd.notna(reward_risk) else "-"
    first_sell_text = (
        f"{first_sell_low:.2f} ~ {first_sell_high:.2f} 元"
        if pd.notna(first_sell_low) and pd.notna(first_sell_high) else "-"
    )
    second_sell_text = (
        f"{second_sell_low:.2f} ~ {second_sell_high:.2f} 元"
        if pd.notna(second_sell_low) and pd.notna(second_sell_high) else "-"
    )

    return {
        "support_buy": support_text,
        "support_note": "低接區：箱底、MA20、布林中/下軌與近期大量成交區的支撐群聚",
        "breakout_buy": _price_text(breakout_price),
        "breakout_status": breakout_status,
        "breakout_note": "突破確認價：收盤站上壓力並配合量能才追價，不代表現價應買入",
        "stop_price": _price_text(stop_price),
        "stop_note": stop_note,
        "target_price": _price_text(target_price),
        "first_sell_zone": first_sell_text,
        "second_sell_zone": second_sell_text,
        "trailing_stop": _price_text(trailing_stop),
        "trailing_note": f"跌破移動停利價 {_price_text(trailing_stop)} 或前一日低點時分批減碼",
        "risk": _price_text(risk),
        "reward": _price_text(reward),
        "reward_risk": reward_risk_text,
        "risk_basis": entry_basis_name,
        "support_low_value": support_low,
        "support_high_value": support_high,
        "breakout_value": breakout_price,
        "stop_value": stop_price,
        "target_value": target_price,
        "first_sell_low_value": first_sell_low,
        "first_sell_high_value": first_sell_high,
        "second_sell_low_value": second_sell_low,
        "second_sell_high_value": second_sell_high,
        "trailing_stop_value": trailing_stop,
        "buy_price": _price_text(breakout_price),
        "buy_note": "突破確認價，非低接買點",
        "sell_price": _price_text(stop_price),
        "sell_note": stop_note,
    }


def combined_box_bollinger_decision(
    strategy_df: pd.DataFrame,
    institutional_streak: dict[str, Any],
) -> dict[str, Any]:
    latest = strategy_df.iloc[-1]
    close = _num(latest.get("Close"))
    box_high = _num(latest.get("Box_High"))
    box_low = _num(latest.get("Box_Low"))
    bb_upper = _num(latest.get("BB_Upper"))
    bb_mid = _num(latest.get("BB_Mid"))
    stop_line = _num(latest.get("Stop_Line"))
    volume_ratio = _num(latest.get("Volume_Ratio"))
    atr = _num(latest.get("ATR"))
    total_streak = int(institutional_streak.get("total", 0))
    trust_streak = int(institutional_streak.get("trust", 0))

    levels = trade_price_levels(strategy_df)
    buy_line = _num(levels.get("breakout_value"))
    sell_line = _num(levels.get("stop_value"))

    box = box_status(latest)
    bb = bollinger_status(latest)
    box_ready = box["status"] in {"箱型整理中", "窄箱突破"}
    bb_ready = bb["status"] in {"貼近上軌", "突破上軌", "中軌上方"}
    institutional_ready = total_streak >= 2 or trust_streak >= 2
    institutional_risk = total_streak <= -2 or trust_streak <= -2
    volume_ready = pd.notna(volume_ratio) and volume_ratio >= 1.1

    if pd.notna(close) and pd.notna(sell_line) and close < sell_line:
        action = "賣出"
        reason = "收盤跌破綜合賣點線，先防守資金"
    elif institutional_risk and bb["status"] in {"中軌下方", "跌破下軌"}:
        action = "賣出/避開"
        reason = "法人連賣且布林偏弱，先排除"
    elif pd.notna(close) and pd.notna(buy_line) and close > buy_line and box_ready and bb_ready and institutional_ready:
        action = "買進"
        reason = "收盤突破箱型/布林買入線，且法人連買確認"
    elif box_ready and bb_ready and institutional_ready:
        action = "觀察買點"
        reason = "型態、布林與法人偏多，等收盤突破買入線"
    elif box_ready and bb_ready and volume_ready:
        action = "觀察買點"
        reason = "技術面接近買點，但法人連買尚未確認"
    else:
        action = "觀望"
        reason = "箱型、布林與法人條件尚未共振"

    return {
        "action": action,
        "reason": reason,
        "support_line": levels["support_buy"],
        "buy_line": levels["breakout_buy"],
        "breakout_status": levels["breakout_status"],
        "sell_line": _price_text(sell_line),
        "box_status": box["status"],
        "bollinger_status": bb["status"],
        "institutional_streak": institutional_streak.get("total_text", "未連續"),
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
    levels = trade_price_levels(strategy_df)

    if pd.isna(stop_line) and pd.notna(close) and pd.notna(atr):
        stop_line = close - 2.5 * atr

    lines = [
        {
            "name": "箱型突破線",
            "value": box_high,
            "color": "#facc15",
            "dash": "solid",
        },
        {
            "name": "箱型支撐線",
            "value": box_low if pd.notna(box_low) else stop_line,
            "color": "#fb923c",
            "dash": "dash",
        },
        {
            "name": "布林突破線",
            "value": bb_upper,
            "color": "#d946ef",
            "dash": "solid",
        },
        {
            "name": "布林支撐線",
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
        {
            "name": "支撐買點下緣",
            "value": _num(levels.get("support_low_value")),
            "color": "#16a34a",
            "dash": "dash",
        },
        {
            "name": "支撐買點上緣",
            "value": _num(levels.get("support_high_value")),
            "color": "#22c55e",
            "dash": "solid",
        },
        {
            "name": "第一賣出區中線",
            "value": (_num(levels.get("first_sell_low_value")) + _num(levels.get("first_sell_high_value"))) / 2,
            "color": "#f97316",
            "dash": "dash",
        },
        {
            "name": "第二賣出區中線",
            "value": (_num(levels.get("second_sell_low_value")) + _num(levels.get("second_sell_high_value"))) / 2,
            "color": "#dc2626",
            "dash": "dash",
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
    shadows = candlestick_analysis(strategy_df)
    bb_width = _num(latest.get("BB_Width_Pct"))
    prev_bb_width = _num(previous.get("BB_Width_Pct"))

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
    late_warning = uptrend and sum(bool(item) for item in late_conditions) >= 2 and (
        macd_fading or kd_hot_death or shadows["upper_score"] >= 65
    )

    bearish = (
        pd.notna(close)
        and pd.notna(ma20)
        and pd.notna(ma60)
        and close < ma20
        and ma20 < ma60
        and return_5d <= 0
    )
    if bearish:
        return {
            "stage": "空頭階段",
            "bias": "避免搶反彈",
            "detail": "價格位於 MA20 下方且 MA20 低於 MA60，短線先防守，等待重新站回均線。",
            "risk": "高",
        }

    if late_warning:
        return {
            "stage": "末升段",
            "bias": "高檔減碼",
            "detail": "短線漲幅或乖離偏大，且 MACD/KD 動能開始降溫，避免追高，偏向分批停利。",
            "risk": "高",
        }

    if ma_stack and return_5d >= 2 and return_10d >= 4 and pd.notna(bb_position) and bb_position >= 70 and shadows["upper_score"] < 85:
        detail = "均線多頭排列，價格沿 5/10 日線推升，屬於短線攻擊段。"
        if macd_fading:
            detail += " 但 MACD 柱縮短，追價要降部位。"
        return {
            "stage": "主升段",
            "bias": "續抱順勢",
            "detail": detail,
            "risk": "中",
        }

    bb_turning_up = pd.notna(bb_width) and pd.notna(prev_bb_width) and bb_width >= prev_bb_width
    if uptrend and (breakout_ready or compact_box or 0 <= return_5d <= 8) and (
        macd_rising or kd_bull or volume_support or bb_turning_up or shadows["lower_score"] >= 40
    ):
        return {
            "stage": "初升段",
            "bias": "突破試單",
            "detail": "剛站回多頭結構或接近箱頂突破，若量能放大，可依支撐買點或突破買點小部位切入。",
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
        "stage": "整理階段",
        "bias": "區間觀察",
        "detail": "價格、均線、量能與箱型尚未形成明確趨勢，低接看支撐區，追價等突破確認。",
        "risk": "中",
    }


def final_operation_advice(
    strategy_df: pd.DataFrame,
    market: dict[str, Any],
    institutional: dict[str, Any] | None = None,
) -> dict[str, Any]:
    latest = strategy_df.iloc[-1]
    previous = strategy_df.iloc[-2] if len(strategy_df) >= 2 else latest
    levels = trade_price_levels(strategy_df)
    shadows = candlestick_analysis(strategy_df)
    pattern = candlestick_pattern(strategy_df)
    phase = trend_phase_analysis(strategy_df)
    radar = short_term_radar(strategy_df, market.get("return_5d", 0.0), institutional)

    close = _num(latest.get("Close"))
    atr = _num(latest.get("ATR"), 0.0)
    stop = _num(levels.get("stop_value"))
    support_low = _num(levels.get("support_low_value"))
    support_high = _num(levels.get("support_high_value"))
    breakout = _num(levels.get("breakout_value"))
    first_sell_low = _num(levels.get("first_sell_low_value"))
    box_low = _num(latest.get("Box_Low"))
    bb_lower = _num(latest.get("BB_Lower"))
    ma20 = _num(latest.get("20MA"))
    ma60 = _num(latest.get("60MA"))
    prev_ma20 = _num(previous.get("20MA"))
    bb_mid = _num(latest.get("BB_Mid"))
    prev_bb_mid = _num(previous.get("BB_Mid"))
    volume_ratio = _num(latest.get("Volume_Ratio"), 0.0)
    institutional_score = int(institutional.get("score", 0)) if institutional else 0
    institutional_risk = institutional_score <= -6
    rr_text = str(levels.get("reward_risk", "-"))
    try:
        rr = float(rr_text.split(":", 1)[1].strip()) if ":" in rr_text else np.nan
    except (ValueError, IndexError):
        rr = np.nan

    hard_stop = pd.notna(stop) and close < stop
    structure_broken = (
        pd.notna(box_low) and pd.notna(bb_lower) and close < box_low and close < bb_lower
    ) or (pd.notna(ma60) and close < ma60 and volume_ratio < 1.0)
    near_support = (
        pd.notna(support_low)
        and pd.notna(support_high)
        and close >= support_low * 0.99
        and close <= support_high + atr * 0.6
    )
    breakout_confirmed = pd.notna(breakout) and close > breakout and volume_ratio >= 1.2
    near_sell_zone = pd.notna(first_sell_low) and close >= first_sell_low * 0.99
    ma20_rising = pd.notna(ma20) and pd.notna(prev_ma20) and ma20 > prev_ma20
    bb_mid_rising = pd.notna(bb_mid) and pd.notna(prev_bb_mid) and bb_mid > prev_bb_mid
    bullish_pattern = pattern["bias"] == "偏多"

    if hard_stop or structure_broken:
        advice = "停損"
        reasons = ["股價已跌破停損或關鍵結構", "箱型、布林或 MA60 防守轉弱", "先保留資金，等待重新站回支撐"]
        confidence = 90
    elif near_sell_zone and (shadows["upper_score"] >= 65 or phase["stage"] == "末升段"):
        advice = "賣出"
        reasons = ["股價已接近第一賣出區", shadows["upper_note"], f"目前屬於{phase['stage']}，宜分批停利"]
        confidence = max(70, shadows["upper_score"])
    elif breakout_confirmed and not shadows["long_upper"] and ma20_rising and not institutional_risk:
        advice = "加碼"
        reasons = ["收盤已站穩突破買點", f"成交量為 5 日均量的 {volume_ratio:.2f} 倍", "MA20 上彎且未見強烈長上引線"]
        confidence = min(95, max(70, int(radar["score"])))
    elif near_support and (shadows["lower_score"] >= 40 or bullish_pattern) and ma20_rising and bb_mid_rising and pd.notna(rr) and rr >= 1.5 and not institutional_risk:
        advice = "買進"
        reasons = ["現價進入支撐買點區", shadows["lower_note"], "MA20 與布林中軌同步上彎", f"風險報酬比 {rr_text} 達標"]
        confidence = min(92, max(65, int(radar["score"]) + shadows["lower_score"] // 8))
    else:
        advice = "觀望"
        reasons = []
        if not near_support:
            reasons.append("現價尚未進入支撐買點區")
        if not breakout_confirmed:
            reasons.append(f"突破狀態：{levels['breakout_status']}")
        if pd.notna(rr) and rr < 1.5:
            reasons.append("風險報酬比低於 1 : 1.5")
        if shadows["upper_score"] >= 65:
            reasons.append(shadows["upper_note"])
        if institutional_risk:
            reasons.append("三大法人籌碼明顯偏空，暫不買進或加碼")
        if not reasons:
            reasons.append("多空條件尚未形成足夠共振")
        confidence = min(80, max(45, int(radar["score"])))

    return {
        "advice": advice,
        "confidence": int(max(0, min(100, confidence))),
        "reasons": reasons[:5],
        "levels": levels,
        "shadows": shadows,
        "pattern": pattern,
        "phase": phase,
        "radar": radar,
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

    levels = trade_price_levels(strategy_df)
    target_price = _num(levels.get("target_value"))
    reward_risk_text = str(levels.get("reward_risk", "-"))
    try:
        reward_risk = float(reward_risk_text.split(":", 1)[1].strip()) if ":" in reward_risk_text else np.nan
    except Exception:
        reward_risk = np.nan

    if pd.notna(reward_risk) and reward_risk >= 1.5:
        rr_text = f"{reward_risk:.2f}"
    else:
        rr_text = "-"
        score -= 15
        notes.append("風險報酬比不足 1.5，不適合硬做")

    shadows = candlestick_analysis(strategy_df)
    if shadows["lower_score"] >= 65:
        score += 6
        notes.append("長下引線承接加分")
    if shadows["upper_score"] >= 65:
        score -= 10
        notes.append("長上引線賣壓扣分")

    score = int(max(0, min(100, score)))

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
    st.subheader("操作建議")
    message = f"{plan['decision']}：{plan['instruction']}"
    if plan["decision"] in {"買進", "加碼"}:
        st.success(message)
    elif plan["decision"] in {"賣出", "停損"}:
        st.error(message)
    else:
        st.info(message)

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("現價", plan["now"])
    with col2:
        st.metric("漲跌點數", plan["change_points"], plan["change_pct"])
    with col3:
        st.metric("建議操作", plan["decision"])
    with col4:
        st.metric("信心分數", plan["score"])

    col4, col5, col6 = st.columns(3)
    with col4:
        st.metric("建議買進區", plan["support_buy"])
    with col5:
        st.metric("突破買點", plan["breakout_buy"], plan["breakout_status"])
    with col6:
        st.metric("停損價", plan["stop"])
        st.caption("跌破停損價應出場")

    col7, col8, col9 = st.columns(3)
    with col7:
        st.metric("第一賣出區", plan["first_sell"])
    with col8:
        st.metric("第二賣出區", plan["second_sell"])
    with col9:
        st.metric("短線目標價", plan["target"])

    col10, col11, col12 = st.columns(3)
    with col10:
        st.metric("風險報酬比", plan["risk_reward"])
        st.caption(f"風險 {plan['risk']} · 報酬 {plan['reward']}")
    with col11:
        st.metric("目前階段", plan["stage"])
    with col12:
        st.metric("移動停利價", plan["trailing_stop"])
        st.caption(plan["trailing_note"])

    st.markdown("**K 線訊號**")
    st.caption(f"{plan['shadow_summary']} · {plan['pattern']}")
    st.markdown("**主要理由**")
    for index, reason in enumerate(plan["reasons"], start=1):
        st.write(f"{index}. {reason}")


def render_institutional_panel(
    institutional: dict[str, Any],
    streak: dict[str, Any] | None = None,
) -> None:
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
    if streak:
        st.caption(f"連續天數統計資料日：{streak['date']}，以最近官方交易日往前連續計算。")
        s_col1, s_col2, s_col3, s_col4 = st.columns(4)
        with s_col1:
            st.metric("合計連續買賣", streak["total_text"])
        with s_col2:
            st.metric("外資連續買賣", streak["foreign_text"])
        with s_col3:
            st.metric("投信連續買賣", streak["trust_text"])
        with s_col4:
            st.metric("自營商連續買賣", streak["dealer_text"])


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
    previous = strategy_df.iloc[-2] if len(strategy_df) >= 2 else latest
    box_high = _num(latest.get("Box_High"))
    box_low = _num(latest.get("Box_Low"))
    box_height = box_high - box_low if pd.notna(box_high) and pd.notna(box_low) else np.nan
    bb_upper = _num(latest.get("BB_Upper"))
    bb_mid = _num(latest.get("BB_Mid"))
    bb_lower = _num(latest.get("BB_Lower"))
    bb_width = _num(latest.get("BB_Width_Pct"))
    prev_bb_width = _num(previous.get("BB_Width_Pct"))
    prev_bb_mid = _num(previous.get("BB_Mid"))
    if pd.notna(bb_width) and pd.notna(prev_bb_width) and bb_width > prev_bb_width:
        bb_opening = "擴張向上" if pd.notna(bb_mid) and pd.notna(prev_bb_mid) and bb_mid >= prev_bb_mid else "擴張向下"
    else:
        bb_opening = "收斂"
    close = _num(latest.get("Close"))
    if pd.notna(close) and pd.notna(box_high) and pd.notna(box_low) and box_high > box_low:
        box_position_pct = (close - box_low) / (box_high - box_low) * 100
        if close > box_high:
            box_position = "已突破箱頂"
        elif close < box_low:
            box_position = "已跌破箱底"
        elif box_position_pct <= 33:
            box_position = "箱型偏低區"
        elif box_position_pct >= 67:
            box_position = "箱型偏高區"
        else:
            box_position = "箱型中間區"
    else:
        box_position_pct = np.nan
        box_position = "資料不足"

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("箱型整理狀態", status["status"])
    with col2:
        st.metric("箱型頂部", _price_text(box_high))
    with col3:
        st.metric("箱型底部", _price_text(box_low))
    with col4:
        st.metric("箱體高度", _price_text(box_height))
    st.caption(status["detail"])

    box_col1, box_col2, box_col3, box_col4 = st.columns(4)
    with box_col1:
        st.metric("現價在箱體位置", box_position, f"{box_position_pct:.0f}%" if pd.notna(box_position_pct) else "-")
    with box_col2:
        st.metric("接近箱底", "是" if pd.notna(box_position_pct) and box_position_pct <= 25 else "否")
    with box_col3:
        st.metric("接近箱頂", "是" if pd.notna(box_position_pct) and box_position_pct >= 75 else "否")
    with box_col4:
        st.metric("箱型突破狀態", "跌破" if close < box_low else "突破" if close > box_high else "整理中")

    colb1, colb2, colb3, colb4 = st.columns(4)
    with colb1:
        st.metric("布林上軌", _price_text(bb_upper))
    with colb2:
        st.metric("布林中軌", _price_text(bb_mid))
    with colb3:
        st.metric("布林下軌", _price_text(bb_lower))
    with colb4:
        st.metric("布林開口", bb_opening, bb["status"])
    st.caption(f"布林分析：{bb['detail']}；目前位置 {bb['position']}")

    price_col1, price_col2, price_col3 = st.columns(3)
    with price_col1:
        st.metric("支撐買點", levels["support_buy"])
        st.caption(levels["support_note"])
    with price_col2:
        st.metric("突破買點", levels["breakout_buy"], levels["breakout_status"])
        st.caption(levels["breakout_note"])
    with price_col3:
        st.metric("停損價", levels["stop_price"])
        st.caption(levels["stop_note"])

    sell_col1, sell_col2, sell_col3 = st.columns(3)
    with sell_col1:
        st.metric("第一賣出區", levels["first_sell_zone"])
    with sell_col2:
        st.metric("第二賣出區", levels["second_sell_zone"])
    with sell_col3:
        st.metric("移動停利價", levels["trailing_stop"])
        st.caption(levels["trailing_note"])

    shadows = candlestick_analysis(strategy_df)
    pattern = candlestick_pattern(strategy_df)
    st.subheader("K 線影線與型態")
    candle_col1, candle_col2, candle_col3 = st.columns(3)
    with candle_col1:
        st.metric("上引線賣壓", shadows["upper_strength"], f"{shadows['upper_score']}/100")
        st.caption(shadows["upper_note"])
    with candle_col2:
        st.metric("下引線承接", shadows["lower_strength"], f"{shadows['lower_score']}/100")
        st.caption(shadows["lower_note"])
    with candle_col3:
        st.metric("K 線型態", pattern["pattern"], pattern["bias"])
        st.caption(pattern["detail"])

    chart_lines = trade_chart_lines(strategy_df)
    line_lookup = {line["name"]: _price_text(line["value"]) for line in chart_lines}
    coll1, coll2, coll3, coll4 = st.columns(4)
    with coll1:
        st.metric("箱型突破線", line_lookup.get("箱型突破線", "-"))
    with coll2:
        st.metric("箱型支撐線", line_lookup.get("箱型支撐線", "-"))
    with coll3:
        st.metric("布林突破線", line_lookup.get("布林突破線", "-"))
    with coll4:
        st.metric("布林支撐線", line_lookup.get("布林支撐線", "-"))

    col6, col7, col8, col9 = st.columns(4)
    with col6:
        st.metric("5-7天短線分數", f"{radar['score']} / 100", radar["grade"])
    with col7:
        st.metric("短線目標價", levels["target_price"])
    with col8:
        st.metric("風險報酬比", levels["reward_risk"])
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
    if "stock_query_input" not in st.session_state:
        st.session_state.stock_query_input = st.session_state.active_query
    if "record_active_query" not in st.session_state:
        st.session_state.record_active_query = False
    if "stock_query_history" not in st.session_state:
        try:
            saved_history = json.loads(st.query_params.get("history", "[]"))
            st.session_state.stock_query_history = [
                {"name": str(item["name"]), "symbol": str(item["symbol"])}
                for item in saved_history
                if isinstance(item, dict) and item.get("name") and item.get("symbol")
            ][:12]
        except (TypeError, ValueError, json.JSONDecodeError):
            st.session_state.stock_query_history = []

    history_placeholder = "選擇最近查詢"

    def sync_history_to_url() -> None:
        history = st.session_state.stock_query_history[:12]
        if history:
            st.query_params["history"] = json.dumps(history, ensure_ascii=False, separators=(",", ":"))
        elif "history" in st.query_params:
            del st.query_params["history"]

    def history_label(item: dict[str, str]) -> str:
        return f"{item['name']} · {item['symbol']}"

    def load_history_selection() -> None:
        selected = st.session_state.get("stock_history_selector", history_placeholder)
        selected_item = next(
            (
                item
                for item in st.session_state.stock_query_history
                if history_label(item) == selected
            ),
            None,
        )
        if selected_item:
            st.session_state.active_query = selected_item["symbol"]
            st.session_state.stock_query_input = selected_item["symbol"]
            st.session_state.record_active_query = False

    def load_quick_selection() -> None:
        selected_query = query_from_selector_label(st.session_state.get("stock_quick_selector"))
        if selected_query:
            st.session_state.active_query = selected_query
            st.session_state.stock_query_input = selected_query
            st.session_state.record_active_query = True

    def delete_history_selection() -> None:
        selected = st.session_state.get("stock_history_selector", history_placeholder)
        st.session_state.stock_query_history = [
            item
            for item in st.session_state.stock_query_history
            if history_label(item) != selected
        ]
        st.session_state.stock_history_selector = history_placeholder
        st.session_state.record_active_query = False
        sync_history_to_url()

    def clear_query_history() -> None:
        st.session_state.stock_query_history = []
        st.session_state.stock_history_selector = history_placeholder
        st.session_state.record_active_query = False
        sync_history_to_url()

    history_items = st.session_state.stock_query_history
    history_options = [history_placeholder] + [history_label(item) for item in history_items]
    selected_history = st.session_state.get("stock_history_selector", history_placeholder)
    history_col1, history_col2, history_col3 = st.columns([2.2, 1, 1])
    with history_col1:
        st.selectbox(
            "最近查詢紀錄",
            options=history_options,
            key="stock_history_selector",
            on_change=load_history_selection,
        )
    with history_col2:
        st.button(
            "刪除選取紀錄",
            icon=":material/delete:",
            disabled=not history_items or selected_history == history_placeholder,
            on_click=delete_history_selection,
            use_container_width=True,
        )
    with history_col3:
        st.button(
            "清除全部",
            icon=":material/delete_sweep:",
            disabled=not history_items,
            on_click=clear_query_history,
            use_container_width=True,
        )
    if history_items:
        st.caption(f"已保存最近 {len(history_items)} 檔，本次瀏覽期間可直接選取分析。")
    else:
        st.caption("成功查詢的股票會自動保存在這裡，最多保留 12 檔。")

    def run_stock_query() -> None:
        st.session_state.active_query = st.session_state.stock_query_input.strip()
        st.session_state.record_active_query = True

    st.text_input(
        "智慧檢索",
        key="stock_query_input",
        placeholder="輸入股名或股號，例如台積電、長榮航、希華、佳凌、2330、4976",
        on_change=run_stock_query,
    )
    st.button("查詢股號並分析", on_click=run_stock_query, use_container_width=True)

    query = st.session_state.active_query
    if not query.strip():
        st.info("輸入中文股名或股票代碼即可啟動單股雷達。")
        return

    try:
        match = SymbolMatch(**resolve_symbol(query, SYMBOL_LOOKUP_CACHE_VERSION))
        if not match.symbol:
            st.error("找不到符合的台股標的，請改用股號或完整 Yahoo Finance 代碼。")
            return
        st.success(f"已對照：{match.name} = {match.symbol}")
        strategy_df = analyze_symbol(match.symbol, market["is_bull"], refresh_token=refresh_token)
        realtime_quote = fetch_realtime_quote(match.symbol, refresh_token=refresh_token)
        institutional = fetch_institutional_flow(match.symbol, refresh_token=refresh_token)
        institutional_history = fetch_institutional_history(match.symbol, refresh_token=refresh_token)
        institutional_streak = institutional_streak_summary(institutional_history)
        stock_name = match.name if match.name != match.symbol else get_symbol_name(match.symbol)
        latest = strategy_df.iloc[-1]
    except Exception as exc:
        st.error(f"單股分析失敗：{exc}")
        return

    if st.session_state.record_active_query:
        history_entry = {"name": stock_name, "symbol": match.symbol}
        st.session_state.stock_query_history = [
            history_entry,
            *[
                item
                for item in st.session_state.stock_query_history
                if item.get("symbol") != match.symbol
            ],
        ][:12]
        st.session_state.record_active_query = False
        sync_history_to_url()

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
    final_advice = final_operation_advice(strategy_df, market, institutional)
    phase = final_advice["phase"]
    render_kpi_cards(
        market,
        float(latest["Close"]),
        final_advice["advice"],
        final_signal(strategy_df),
        phase,
    )
    render_institutional_panel(institutional, institutional_streak)
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


def intraday_trade_snapshot(
    strategy_df: pd.DataFrame,
    quote: dict[str, Any],
    minute_data: pd.DataFrame,
    market: dict[str, Any],
) -> dict[str, Any]:
    latest = strategy_df.iloc[-1]
    levels = trade_price_levels(strategy_df)
    price = _num(quote.get("close"), _num(latest.get("Close")))
    previous_close = _num(quote.get("previous_close"))
    if pd.isna(previous_close) and len(strategy_df) >= 2:
        previous_close = _num(strategy_df.iloc[-2].get("Close"))

    vwap = _num(minute_data.iloc[-1].get("VWAP")) if not minute_data.empty else np.nan
    opening_rows = minute_data.between_time("09:00", "09:14") if not minute_data.empty else pd.DataFrame()
    opening_high = _num(opening_rows["High"].max()) if not opening_rows.empty else np.nan
    opening_low = _num(opening_rows["Low"].min()) if not opening_rows.empty else np.nan

    current_volume = _num(quote.get("volume"), 0.0)
    if current_volume <= 0 and not minute_data.empty:
        current_volume = _num(minute_data["Volume"].sum(), 0.0)
    daily_volumes = strategy_df["Volume"].copy()
    if quote.get("ok") and not daily_volumes.empty:
        quote_date = pd.Timestamp(quote.get("date")).normalize()
        if pd.Timestamp(daily_volumes.index[-1]).normalize() == quote_date:
            daily_volumes = daily_volumes.iloc[:-1]
    average_volume = _num(daily_volumes.tail(5).mean())

    now = pd.Timestamp.now(tz="Asia/Taipei")
    quote_time = str(quote.get("time") or "")
    try:
        hour, minute = [int(part) for part in quote_time.split(":")[:2]]
    except (TypeError, ValueError):
        hour, minute = now.hour, now.minute
    elapsed_minutes = max(1, min(270, hour * 60 + minute - 9 * 60))
    session_progress = elapsed_minutes / 270
    projected_volume = current_volume / session_progress if session_progress > 0 else current_volume
    projected_volume_ratio = (
        projected_volume / average_volume
        if pd.notna(average_volume) and average_volume > 0 and current_volume > 0
        else np.nan
    )

    bid_lots = sum(quote.get("bid_lots") or [])
    ask_lots = sum(quote.get("ask_lots") or [])
    order_imbalance = (
        (bid_lots - ask_lots) / (bid_lots + ask_lots) * 100
        if bid_lots + ask_lots > 0
        else np.nan
    )

    support_low = _num(levels.get("support_low_value"))
    support_high = _num(levels.get("support_high_value"))
    breakout = _num(levels.get("breakout_value"))
    stop = _num(levels.get("stop_value"))
    target = _num(levels.get("target_value"))
    bb_upper = _num(latest.get("BB_Upper"))
    ma20 = _num(latest.get("20MA"))
    in_support = pd.notna(price) and pd.notna(support_low) and pd.notna(support_high) and support_low <= price <= support_high
    above_vwap = pd.notna(price) and pd.notna(vwap) and price >= vwap
    volume_confirmed = pd.notna(projected_volume_ratio) and projected_volume_ratio >= 1.2
    opening_breakout = pd.notna(price) and pd.notna(opening_high) and price > opening_high
    breakout_confirmed = pd.notna(price) and pd.notna(breakout) and price >= breakout

    if pd.notna(price) and pd.notna(stop) and price <= stop:
        action = "出場"
        status = "跌破停損價"
        detail = "停止攤平，依紀律退出。"
    elif pd.notna(price) and pd.notna(bb_upper) and price > bb_upper * 1.02 and not above_vwap:
        action = "減碼"
        status = "高檔轉弱"
        detail = "股價遠離布林上軌後跌回 VWAP 下方，優先保護獲利。"
    elif breakout_confirmed and above_vwap and volume_confirmed and market.get("is_bull"):
        action = "確認買進"
        status = "突破共振"
        detail = "突破壓力、站上 VWAP 且預估量能達標；避免一次滿倉。"
    elif in_support and market.get("is_bull") and (above_vwap or pd.isna(vwap)):
        action = "試單"
        status = "支撐區承接"
        detail = "位於支撐買點區，可小部位測試，跌破停損價退出。"
    elif pd.notna(price) and pd.notna(ma20) and price > ma20 and above_vwap:
        action = "續抱"
        status = "盤中偏多"
        detail = "價格在 MA20 與 VWAP 上方，但尚未形成完整突破共振。"
    else:
        action = "等待"
        status = "條件未完成"
        detail = "等待支撐承接或突破價、VWAP、量能同步確認。"

    return {
        "price": price,
        "previous_close": previous_close,
        "change_points": price - previous_close if pd.notna(price) and pd.notna(previous_close) else np.nan,
        "change_pct": (price / previous_close - 1) * 100 if pd.notna(price) and pd.notna(previous_close) and previous_close else np.nan,
        "vwap": vwap,
        "opening_high": opening_high,
        "opening_low": opening_low,
        "opening_breakout": opening_breakout,
        "current_volume": current_volume,
        "projected_volume_ratio": projected_volume_ratio,
        "order_imbalance": order_imbalance,
        "action": action,
        "status": status,
        "detail": detail,
        "support_low": support_low,
        "support_high": support_high,
        "breakout": breakout,
        "stop": stop,
        "target": target,
        "levels": levels,
    }


def build_intraday_chart(minute_data: pd.DataFrame, snapshot: dict[str, Any], title: str) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=minute_data.index,
            y=minute_data["Close"],
            mode="lines",
            name="現價",
            line=dict(color="#2563eb", width=2),
        )
    )
    if minute_data["VWAP"].notna().any():
        fig.add_trace(
            go.Scatter(
                x=minute_data.index,
                y=minute_data["VWAP"],
                mode="lines",
                name="VWAP",
                line=dict(color="#0891b2", width=2),
            )
        )
    guide_lines = [
        ("開盤15分高", snapshot["opening_high"], "#7c3aed", "dot"),
        ("開盤15分低", snapshot["opening_low"], "#64748b", "dot"),
        ("突破買點", snapshot["breakout"], "#16a34a", "dash"),
        ("停損價", snapshot["stop"], "#dc2626", "dash"),
    ]
    for name, value, color, dash in guide_lines:
        if pd.notna(value):
            fig.add_hline(y=value, line_color=color, line_dash=dash, annotation_text=name)
    fig.update_layout(
        title=title,
        template="plotly_white",
        height=460,
        margin=dict(l=12, r=12, t=52, b=20),
        paper_bgcolor="#ffffff",
        plot_bgcolor="#ffffff",
        font=dict(color="#111827"),
        xaxis=dict(showgrid=True, gridcolor="#eef2f7"),
        yaxis=dict(showgrid=True, gridcolor="#eef2f7"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    return fig


def render_intraday_live_panel(symbol: str, name: str, market: dict[str, Any], refresh_token: int) -> None:
    try:
        strategy_df = analyze_symbol(symbol, market["is_bull"], refresh_token=refresh_token)
        quote = fetch_realtime_quote(symbol, refresh_token=refresh_token)
        minute_data = download_intraday_data(symbol, refresh_token=refresh_token)
        if not quote.get("ok") and minute_data.empty:
            st.error(f"盤中資料讀取失敗：{quote.get('message', '查無報價')}")
            return
        snapshot = intraday_trade_snapshot(strategy_df, quote, minute_data, market)
    except Exception as exc:
        st.error(f"盤中分析失敗：{exc}")
        return

    quote_date = quote.get("date")
    quote_stamp = (
        f"{pd.Timestamp(quote_date).strftime('%Y-%m-%d')} {quote.get('time', '')}"
        if quote.get("ok") and pd.notna(quote_date)
        else "分鐘線最新時間"
    )
    st.caption(f"{name} · {symbol} · {quote_stamp} · MIS 報價優先，分鐘 VWAP 使用 Yahoo Finance 盤中資料")

    top1, top2, top3, top4, top5 = st.columns(5)
    with top1:
        st.metric("盤中現價", _price_text(snapshot["price"]))
    with top2:
        change_points_text = f"{snapshot['change_points']:+.2f} 點" if pd.notna(snapshot["change_points"]) else "-"
        change_pct_text = f"{snapshot['change_pct']:+.2f}%" if pd.notna(snapshot["change_pct"]) else None
        st.metric("漲跌點數", change_points_text, change_pct_text)
    with top3:
        st.metric("盤中判斷", snapshot["action"], snapshot["status"])
    with top4:
        st.metric("VWAP", _price_text(snapshot["vwap"]), "站上" if pd.notna(snapshot["vwap"]) and snapshot["price"] >= snapshot["vwap"] else "未站上")
    with top5:
        volume_text = f"{snapshot['projected_volume_ratio']:.2f}x" if pd.notna(snapshot["projected_volume_ratio"]) else "-"
        st.metric("預估量比", volume_text, "量能確認" if pd.notna(snapshot["projected_volume_ratio"]) and snapshot["projected_volume_ratio"] >= 1.2 else "量能不足")

    st.info(f"{snapshot['status']}：{snapshot['detail']}")
    level1, level2, level3, level4, level5 = st.columns(5)
    with level1:
        st.metric("支撐買點", snapshot["levels"]["support_buy"])
    with level2:
        st.metric("突破買點", snapshot["levels"]["breakout_buy"])
    with level3:
        st.metric("停損價", snapshot["levels"]["stop_price"])
    with level4:
        st.metric("短線目標", snapshot["levels"]["target_price"])
    with level5:
        st.metric("風險報酬比", snapshot["levels"]["reward_risk"])

    micro1, micro2, micro3, micro4 = st.columns(4)
    with micro1:
        st.metric("開盤15分高", _price_text(snapshot["opening_high"]), "已突破" if snapshot["opening_breakout"] else "未突破")
    with micro2:
        st.metric("開盤15分低", _price_text(snapshot["opening_low"]))
    with micro3:
        imbalance = snapshot["order_imbalance"]
        st.metric("五檔委買賣差", f"{imbalance:+.1f}%" if pd.notna(imbalance) else "-", "委買較強" if pd.notna(imbalance) and imbalance > 10 else "委賣較強" if pd.notna(imbalance) and imbalance < -10 else "均衡")
    with micro4:
        st.metric("大盤環境", format_market_status(market))

    if minute_data.empty:
        st.warning("目前沒有可用的分鐘線，因此 VWAP 與開盤 15 分鐘區間暫不判斷；其他價位仍以 MIS 與日線計算。")
    else:
        st.plotly_chart(
            build_intraday_chart(minute_data, snapshot, f"{name} ({symbol}) 盤中走勢"),
            use_container_width=True,
        )
    st.caption("盤中訊號為技術分析提示，不會自動下單。三大法人為盤後資料，不納入即時盤中買賣判斷。")


def render_intraday_tab(market: dict[str, Any], refresh_token: int = 0) -> None:
    if "intraday_query" not in st.session_state:
        st.session_state.intraday_query = st.session_state.get("active_query", "2330")
    if "intraday_refresh_token" not in st.session_state:
        st.session_state.intraday_refresh_token = 0

    st.subheader("盤中現貨交易分析")
    st.caption("適用 5–7 天短線：盤中確認進場節奏，日線箱型、布林與停損架構維持不變。")
    with st.form("intraday_lookup_form", clear_on_submit=False):
        query = st.text_input(
            "股名或股號",
            value=st.session_state.intraday_query,
            placeholder="例如台積電、佳凌、2330、4976",
        )
        submitted = st.form_submit_button("載入盤中分析", use_container_width=True)
        if submitted and query.strip():
            st.session_state.intraday_query = query.strip()
            st.session_state.intraday_refresh_token += 1

    control1, control2 = st.columns([1, 2])
    with control1:
        if st.button("更新盤中報價", icon=":material/refresh:", use_container_width=True):
            st.session_state.intraday_refresh_token += 1
    with control2:
        auto_refresh = st.toggle("每 15 秒自動更新", value=False)

    try:
        match = SymbolMatch(**resolve_symbol(st.session_state.intraday_query, SYMBOL_LOOKUP_CACHE_VERSION))
        if not match.symbol:
            st.error("找不到符合的台股，請改用股名或股號。")
            return
        stock_name = match.name if match.name != match.symbol else get_symbol_name(match.symbol)
    except Exception as exc:
        st.error(f"股票查詢失敗：{exc}")
        return

    live_token = refresh_token + int(st.session_state.intraday_refresh_token)
    if auto_refresh and hasattr(st, "fragment"):
        st.fragment(run_every=15)(render_intraday_live_panel)(match.symbol, stock_name, market, live_token)
    else:
        render_intraday_live_panel(match.symbol, stock_name, market, live_token)


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
                        "支撐買點": levels["support_buy"],
                        "突破買點": levels["breakout_buy"],
                        "突破狀態": levels["breakout_status"],
                        "停損價": levels["stop_price"],
                        "短線目標價": levels["target_price"],
                        "風險報酬比": levels["reward_risk"],
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


def non_futures_universe(limit: int) -> list[tuple[str, str]]:
    directory = load_stock_directory(STOCK_DIRECTORY_CACHE_VERSION)
    candidates: list[tuple[str, str]] = []
    for code, data in sorted(directory.items(), key=lambda item: item[0]):
        if code in STOCK_FUTURES_CODES:
            continue
        symbol = data.get("symbol", "")
        name = data.get("name", symbol)
        if symbol.endswith((".TW", ".TWO")):
            candidates.append((symbol, name))
    return candidates[:limit]


def render_non_futures_tab(market: dict[str, Any], refresh_token: int = 0) -> None:
    st.caption(
        "排除常見有個股期貨交易的標的後，掃描一般股票；"
        "以法人連續買賣超天數、箱型整理與布林通道共同判斷買點/賣點。"
    )
    cfg1, cfg2 = st.columns(2)
    with cfg1:
        scan_limit = st.slider("掃描檔數", min_value=20, max_value=200, value=80, step=20)
    with cfg2:
        only_actionable = st.checkbox("只顯示非觀望", value=True)

    universe = non_futures_universe(scan_limit)
    st.caption(f"本次候選：排除個股期貨後取前 {len(universe)} 檔。")
    if not st.button("啟動非期貨個股法人箱型布林掃描", use_container_width=True):
        return

    progress = st.progress(0)
    status = st.empty()
    rows: list[dict[str, Any]] = []

    for idx, (symbol, name) in enumerate(universe, start=1):
        status.write(f"掃描中：{symbol} {name} ({idx}/{len(universe)})")
        try:
            strategy_df = analyze_symbol(symbol, market["is_bull"], refresh_token=refresh_token)
            latest = strategy_df.iloc[-1]
            institutional = fetch_institutional_flow(symbol, refresh_token=refresh_token)
            history = fetch_institutional_history(symbol, refresh_token=refresh_token)
            streak = institutional_streak_summary(history)
            decision = combined_box_bollinger_decision(strategy_df, streak)
            if only_actionable and decision["action"] == "觀望":
                progress.progress(idx / len(universe))
                continue
            rows.append(
                {
                    "代碼": symbol,
                    "名稱": name,
                    "資料日": latest.name.strftime("%Y-%m-%d"),
                    "收盤價": float(latest["Close"]),
                    "判斷": decision["action"],
                    "支撐買點": decision["support_line"],
                    "突破買點": decision["buy_line"],
                    "突破狀態": decision["breakout_status"],
                    "停損價": decision["sell_line"],
                    "箱型狀態": decision["box_status"],
                    "布林狀態": decision["bollinger_status"],
                    "法人合計": _shares_to_lots_text(int(institutional["total"])),
                    "合計連續": streak["total_text"],
                    "外資連續": streak["foreign_text"],
                    "投信連續": streak["trust_text"],
                    "自營商連續": streak["dealer_text"],
                    "理由": decision["reason"],
                }
            )
        except Exception as exc:
            st.warning(f"{symbol} 掃描略過：{exc}")
        progress.progress(idx / len(universe))

    status.write("掃描完成")
    if not rows:
        st.info("本次掃描沒有符合條件的非期貨個股。可提高掃描檔數或取消「只顯示非觀望」。")
        return

    result = pd.DataFrame(rows)
    st.dataframe(
        result.style.format({"收盤價": "{:.2f}"}, na_rep="-"),
        use_container_width=True,
        height=560,
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
        st.warning(f"大盤資料暫時無法載入，已採保守模式並關閉新買進訊號：{exc}")
        market_regime = {
            "is_bull": False,
            "close": 0.0,
            "ma20": np.nan,
            "ma60": np.nan,
            "return_5d": 0.0,
            "as_of": "資料暫缺",
        }

    tab_single, tab_intraday, tab_scan, tab_non_futures = st.tabs(
        [
            "單股智慧雷達儀表板",
            "盤中現貨交易分析",
            "台灣前 50 大權值股每日掃描",
            "非期貨個股法人箱型布林掃描",
        ]
    )
    with tab_single:
        render_single_stock_tab(market_regime, refresh_token=refresh_token)
    with tab_intraday:
        render_intraday_tab(market_regime, refresh_token=refresh_token)
    with tab_scan:
        render_scanner_tab(market_regime, refresh_token=refresh_token)
    with tab_non_futures:
        render_non_futures_tab(market_regime, refresh_token=refresh_token)

    st.divider()
    st.caption("本系統為技術分析輔助工具，不構成投資建議。請自行控制部位與風險。")


if __name__ == "__main__":
    main()
