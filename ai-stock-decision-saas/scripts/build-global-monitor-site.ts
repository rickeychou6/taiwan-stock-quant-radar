import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fallbackQuotes,
  layerMeta,
  monitorEvents,
  monitorSources,
  regionMeta
} from "../src/lib/global-monitor-data";

const marketApi = "https://ai-stock-decision-saas.vercel.app/api/market/overview";

const html = String.raw`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>全球事件市場雷達</title>
  <meta name="description" content="全球事件市場雷達：用地圖、事件流、資料來源狀態與市場行情追蹤全球風險對股票的影響。" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #070a0b;
      --panel: rgba(16, 20, 22, .82);
      --panel-soft: rgba(255, 255, 255, .045);
      --line: rgba(255, 255, 255, .12);
      --muted: #8b9aaa;
      --text: #f4f7f8;
      --green: #77e6b6;
      --cyan: #7dd3fc;
      --amber: #f6cf6f;
      --rose: #fda4af;
      --violet: #c4b5fd;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 18% 4%, rgba(119, 230, 182, .16), transparent 26rem),
        radial-gradient(circle at 84% 8%, rgba(125, 211, 252, .13), transparent 25rem),
        linear-gradient(180deg, #091010 0%, var(--bg) 48%, #050607 100%);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif;
    }
    button, input { font: inherit; }
    button { cursor: pointer; }
    .shell { width: min(1480px, calc(100vw - 28px)); margin: 0 auto; padding: 24px 0 34px; }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .mark {
      width: 42px; height: 42px; display: grid; place-items: center;
      border: 1px solid rgba(119, 230, 182, .35);
      background: rgba(119, 230, 182, .12);
      border-radius: 8px;
      font-weight: 950;
      color: var(--green);
    }
    .brand small { display: block; color: var(--muted); font-weight: 750; }
    .brand strong { display: block; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .status-line { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
    .pill {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.055);
      border-radius: 8px;
      padding: 8px 12px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 800;
    }
    .pill.good { border-color: rgba(119, 230, 182, .38); background: rgba(119, 230, 182, .1); color: #d8fff0; }
    .pill.warn { border-color: rgba(246, 207, 111, .38); background: rgba(246, 207, 111, .1); color: #fff1c6; }
    .hero, .panel {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      box-shadow: 0 22px 80px rgba(0, 0, 0, .3);
      backdrop-filter: blur(18px);
    }
    .hero { padding: 20px; margin-bottom: 14px; }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, .85fr); gap: 18px; align-items: end; }
    .eyebrow { color: var(--green); font-size: 13px; font-weight: 900; letter-spacing: .03em; }
    h1 { margin: 6px 0 8px; font-size: clamp(32px, 5vw, 58px); line-height: 1.02; letter-spacing: 0; }
    .lead { max-width: 850px; margin: 0; color: #c7d0d7; line-height: 1.8; }
    .notice {
      margin-top: 12px;
      border: 1px solid rgba(246, 207, 111, .28);
      background: rgba(246, 207, 111, .1);
      color: #fff3cd;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 800;
      line-height: 1.6;
    }
    .hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .stat {
      border: 1px solid var(--line);
      background: var(--panel-soft);
      border-radius: 8px;
      padding: 14px;
      min-height: 98px;
    }
    .stat span { color: var(--muted); font-size: 12px; font-weight: 800; }
    .stat strong { display: block; margin-top: 8px; font-size: 32px; line-height: 1; }
    .filters { display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 10px; margin-bottom: 12px; }
    .search {
      display: flex; align-items: center; gap: 10px;
      min-height: 48px;
      border: 1px solid var(--line);
      background: rgba(16, 20, 22, .76);
      border-radius: 8px;
      padding: 0 12px;
    }
    .search input {
      width: 100%;
      height: 44px;
      border: 0;
      outline: 0;
      color: white;
      background: transparent;
    }
    .filter-row, .layers { display: flex; flex-wrap: wrap; gap: 8px; }
    .filter-btn {
      min-height: 40px;
      border: 1px solid var(--line);
      background: rgba(16, 20, 22, .62);
      color: #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      font-weight: 850;
      font-size: 14px;
    }
    .filter-btn.active { border-color: rgba(119, 230, 182, .48); background: rgba(119, 230, 182, .14); color: #eafff7; }
    .layer-dot { display: inline-block; width: 9px; height: 9px; border-radius: 99px; margin-right: 7px; }
    .quote-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 12px 0; }
    .quote { border: 1px solid var(--line); background: rgba(16,20,22,.74); border-radius: 8px; padding: 13px; min-height: 122px; }
    .quote small { color: var(--muted); display: block; font-weight: 800; }
    .quote .symbol { margin-top: 3px; color: #5d6b78; font-size: 12px; }
    .quote strong { display: block; margin-top: 14px; font-size: 23px; }
    .quote .up { color: var(--green); font-weight: 950; }
    .quote .down { color: var(--rose); font-weight: 950; }
    .workspace { display: grid; grid-template-columns: minmax(0, 1.55fr) 410px; gap: 14px; align-items: start; }
    .panel { padding: 14px; }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .map {
      position: relative;
      min-height: 470px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0b1414;
    }
    .map svg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .72; }
    .map-label {
      position: absolute;
      left: 14px;
      top: 14px;
      z-index: 2;
      border: 1px solid var(--line);
      background: rgba(0,0,0,.42);
      border-radius: 8px;
      padding: 8px 10px;
      color: #d9fdee;
      font-size: 12px;
      font-weight: 900;
    }
    .marker {
      position: absolute;
      z-index: 3;
      width: 32px;
      height: 32px;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      border-radius: 999px;
      border: 2px solid #fff;
      color: #071010;
      font-size: 11px;
      font-weight: 950;
      box-shadow: 0 0 0 7px rgba(255,255,255,.08);
    }
    .marker.high { background: var(--rose); box-shadow: 0 0 0 7px rgba(253,164,175,.17); }
    .marker.medium { background: var(--amber); box-shadow: 0 0 0 7px rgba(246,207,111,.16); }
    .marker.watch { background: var(--green); box-shadow: 0 0 0 7px rgba(119,230,182,.14); }
    .marker.selected { scale: 1.2; }
    .map-foot {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      z-index: 2;
      border-top: 1px solid var(--line);
      background: rgba(0,0,0,.48);
      backdrop-filter: blur(12px);
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 800;
    }
    .detail h2 { margin: 8px 0 10px; font-size: 25px; line-height: 1.15; }
    .meta { color: var(--muted); font-size: 13px; font-weight: 850; }
    .badge {
      display: inline-flex;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 6px 9px;
      font-size: 12px;
      font-weight: 950;
    }
    .badge.high { border-color: rgba(253,164,175,.48); background: rgba(253,164,175,.13); color: #ffe2e6; }
    .badge.medium { border-color: rgba(246,207,111,.48); background: rgba(246,207,111,.13); color: #fff1c1; }
    .badge.watch { border-color: rgba(119,230,182,.38); background: rgba(119,230,182,.12); color: #ddfff2; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; }
    .mini { border: 1px solid var(--line); background: var(--panel-soft); border-radius: 8px; padding: 12px; }
    .mini span { color: var(--muted); font-size: 12px; font-weight: 800; }
    .mini strong { display: block; margin-top: 6px; font-size: 27px; }
    .section-title { margin: 16px 0 6px; color: #758290; font-size: 12px; font-weight: 950; text-transform: uppercase; }
    .detail p { color: #d3dbe1; line-height: 1.7; }
    .chips { display: flex; flex-wrap: wrap; gap: 7px; }
    .chip { border: 1px solid rgba(125,211,252,.25); background: rgba(125,211,252,.09); color: #d9f3ff; border-radius: 8px; padding: 7px 9px; font-size: 12px; font-weight: 900; }
    .feed { display: grid; gap: 10px; max-height: 560px; overflow: auto; padding-right: 3px; }
    .feed-card { width: 100%; text-align: left; border: 1px solid var(--line); background: var(--panel-soft); color: inherit; border-radius: 8px; padding: 14px; }
    .feed-card.selected { border-color: rgba(125,211,252,.48); background: rgba(125,211,252,.1); }
    .feed-card h3 { margin: 9px 0 5px; font-size: 18px; }
    .feed-card p { margin: 0; color: #cbd5e1; line-height: 1.6; }
    .sources { display: grid; gap: 10px; }
    .source-card { border: 1px solid var(--line); background: var(--panel-soft); border-radius: 8px; padding: 14px; }
    .source-top { display: flex; justify-content: space-between; gap: 14px; align-items: start; }
    .meter { height: 7px; background: rgba(255,255,255,.1); border-radius: 999px; overflow: hidden; margin-top: 10px; }
    .meter i { display: block; height: 100%; background: var(--cyan); }
    .hidden { display: none !important; }
    @media (max-width: 1120px) {
      .hero-grid, .workspace { grid-template-columns: 1fr; }
      .quote-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .topbar { align-items: stretch; flex-direction: column; }
      .status-line { justify-content: flex-start; }
      .hero-stats, .detail-grid, .map-foot { grid-template-columns: 1fr; }
      .filters { grid-template-columns: 1fr; }
      .quote-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .map { min-height: 390px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="mark">GM</div>
        <div>
          <small>Global Event Market Radar</small>
          <strong>全球事件市場雷達</strong>
        </div>
      </div>
      <div class="status-line">
        <span id="marketStatus" class="pill warn">行情同步中</span>
        <span class="pill warn">事件資料為內建示範</span>
      </div>
    </header>

    <section class="hero">
      <div class="hero-grid">
        <div>
          <div class="eyebrow">MARKET-AWARE RISK MAP</div>
          <h1>全球事件市場雷達</h1>
          <p class="lead">把地緣事件、供應鏈、能源、政策與市場報價放在同一張圖，直接轉成股票與指數需要關注的風險。</p>
          <div class="notice">目前狀態：市場行情會呼叫線上 API 更新；全球事件層是內建示範資料，尚未接上即時新聞、災害或航運來源。</div>
        </div>
        <div class="hero-stats">
          <div class="stat"><span>綜合風險</span><strong id="riskScore">0</strong></div>
          <div class="stat"><span>符合事件</span><strong id="eventCount">0</strong></div>
          <div class="stat"><span>市場波動</span><strong id="pressure">0%</strong></div>
        </div>
      </div>
    </section>

    <section class="filters">
      <label class="search"><span>搜尋</span><input id="searchInput" placeholder="事件、地區、股票代號" /></label>
      <div class="filter-row" id="regions"></div>
    </section>

    <section class="panel">
      <div class="section-title">資料層</div>
      <div class="layers" id="layers"></div>
    </section>

    <section class="quote-grid" id="quotes"></section>

    <section class="workspace">
      <section class="panel">
        <div class="tabs">
          <button class="filter-btn active" data-view="map">地圖</button>
          <button class="filter-btn" data-view="wire">快訊</button>
          <button class="filter-btn" data-view="sources">資料</button>
        </div>

        <div id="mapView" class="map">
          <svg viewBox="0 0 1000 520" aria-hidden="true">
            <defs><linearGradient id="sea" x1="0" x2="1"><stop offset="0%" stop-color="#102323"/><stop offset="52%" stop-color="#111827"/><stop offset="100%" stop-color="#182013"/></linearGradient></defs>
            <rect width="1000" height="520" fill="url(#sea)"></rect>
            <path d="M140 176 L192 139 L274 147 L319 189 L292 236 L236 244 L210 294 L148 282 L105 224 Z" fill="#263b34" stroke="#6ee7b7" stroke-opacity=".28" stroke-width="2"></path>
            <path d="M247 299 L301 329 L330 389 L306 466 L262 488 L231 431 L196 379 L210 329 Z" fill="#2b4637" stroke="#6ee7b7" stroke-opacity=".24" stroke-width="2"></path>
            <path d="M440 144 L514 120 L604 135 L641 180 L620 220 L548 216 L508 248 L444 228 L403 181 Z" fill="#334137" stroke="#fcd34d" stroke-opacity=".28" stroke-width="2"></path>
            <path d="M516 250 L590 244 L641 288 L632 366 L586 433 L525 424 L488 362 L472 295 Z" fill="#343d32" stroke="#fcd34d" stroke-opacity=".22" stroke-width="2"></path>
            <path d="M624 156 L753 127 L882 169 L907 230 L847 279 L763 260 L721 314 L648 285 L622 222 Z" fill="#33414a" stroke="#93c5fd" stroke-opacity=".28" stroke-width="2"></path>
            <path d="M762 348 L849 350 L905 394 L889 448 L804 464 L746 426 Z" fill="#3d3d31" stroke="#bef264" stroke-opacity=".24" stroke-width="2"></path>
            ${Array.from({ length: 10 }).map((_, i) => `<path d="M0 ${50 + i * 48} H1000" stroke="rgba(148,163,184,.1)"/>`).join("")}
            ${Array.from({ length: 12 }).map((_, i) => `<path d="M${45 + i * 82} 0 V520" stroke="rgba(148,163,184,.08)"/>`).join("")}
            <path d="M120 420 C252 319 359 358 470 270 C604 164 748 176 908 105" fill="none" stroke="#38bdf8" stroke-opacity=".22" stroke-width="3" stroke-dasharray="8 12"></path>
            <path d="M186 124 C341 231 503 229 823 385" fill="none" stroke="#fbbf24" stroke-opacity=".18" stroke-width="3" stroke-dasharray="7 13"></path>
          </svg>
          <div class="map-label">MARKET-AWARE RISK MAP</div>
          <div id="markers"></div>
          <div class="map-foot">
            <span>事件點以信心分數標示</span>
            <span>股票代號對應市場影響</span>
            <span>來源與限制一併顯示</span>
          </div>
        </div>

        <div id="wireView" class="feed hidden"></div>
        <div id="sourcesView" class="sources hidden"></div>
      </section>

      <aside class="panel detail" id="detail"></aside>
    </section>
  </main>

  <script>
    const events = ${JSON.stringify(monitorEvents)};
    const layerMeta = ${JSON.stringify(layerMeta)};
    const regionMeta = ${JSON.stringify(regionMeta)};
    const fallbackQuotes = ${JSON.stringify(fallbackQuotes)};
    const sources = ${JSON.stringify(monitorSources)};
    const allLayers = Object.keys(layerMeta);
    const allRegions = Object.keys(regionMeta);
    const severityWeight = { critical: 95, high: 78, medium: 54, watch: 28 };
    const severityLabel = { critical: "極高", high: "高", medium: "中", watch: "觀察" };
    let region = "global";
    let activeLayers = [...allLayers];
    let selectedId = events[0].id;
    let currentView = "map";
    let quotes = [...fallbackQuotes];

    const $ = (id) => document.getElementById(id);
    const pct = (value) => (value >= 0 ? "+" : "") + Number(value).toFixed(2) + "%";
    const price = (value) => Number(value).toLocaleString("zh-TW", { maximumFractionDigits: Number(value) >= 100 ? 2 : 4 });
    const filtered = () => {
      const q = $("searchInput").value.trim().toLowerCase();
      return events.filter((event) => {
        const haystack = [event.title, event.location, event.marketImpact, event.stockFocus.join(" ")].join(" ").toLowerCase();
        return (region === "global" || event.region === region) && activeLayers.includes(event.layer) && (!q || haystack.includes(q));
      });
    };
    function renderRegions() {
      $("regions").innerHTML = allRegions.map((key) =>
        '<button class="filter-btn ' + (key === region ? "active" : "") + '" data-region="' + key + '">' + regionMeta[key].short + "</button>"
      ).join("");
      document.querySelectorAll("[data-region]").forEach((button) => button.onclick = () => { region = button.dataset.region; renderAll(); });
    }
    function renderLayers() {
      $("layers").innerHTML = allLayers.map((key) => {
        const color = layerMeta[key].label === "市場" ? "var(--cyan)" : layerMeta[key].label === "政策" ? "var(--violet)" : layerMeta[key].label === "供應鏈" ? "var(--amber)" : layerMeta[key].label === "衝突" ? "var(--rose)" : "var(--green)";
        return '<button class="filter-btn ' + (activeLayers.includes(key) ? "active" : "") + '" data-layer="' + key + '"><span class="layer-dot" style="background:' + color + '"></span>' + layerMeta[key].label + "</button>";
      }).join("");
      document.querySelectorAll("[data-layer]").forEach((button) => button.onclick = () => {
        const key = button.dataset.layer;
        activeLayers = activeLayers.includes(key) ? activeLayers.filter((item) => item !== key) : [...activeLayers, key];
        renderAll();
      });
    }
    function renderQuotes() {
      $("quotes").innerHTML = quotes.map((quote) =>
        '<article class="quote"><small>' + quote.label + '</small><div class="symbol">' + quote.symbol + '</div><strong>' + quote.price + '</strong><div class="' + (quote.changePct >= 0 ? "up" : "down") + '">' + pct(quote.changePct) + '</div><small>' + quote.source + "</small></article>"
      ).join("");
      const pressure = quotes.reduce((sum, quote) => sum + Math.abs(Number(quote.changePct || 0)), 0) / Math.max(1, quotes.length);
      $("pressure").textContent = pressure.toFixed(1) + "%";
    }
    function renderMarkers(rows) {
      $("markers").innerHTML = rows.map((event) =>
        '<button class="marker ' + event.severity + " " + (event.id === selectedId ? "selected" : "") + '" style="left:' + event.x + '%;top:' + event.y + '%" data-event="' + event.id + '" aria-label="' + event.title + '">' + event.confidence + "</button>"
      ).join("");
      document.querySelectorAll("[data-event]").forEach((button) => button.onclick = () => { selectedId = button.dataset.event; renderAll(false); });
    }
    function renderWire(rows) {
      $("wireView").innerHTML = rows.map((event) =>
        '<button class="feed-card ' + (event.id === selectedId ? "selected" : "") + '" data-feed="' + event.id + '"><span class="badge ' + event.severity + '">' + severityLabel[event.severity] + '</span> <span class="meta">' + layerMeta[event.layer].label + ' · ' + event.updatedAgo + '</span><h3>' + event.title + '</h3><p>' + event.marketImpact + "</p></button>"
      ).join("");
      document.querySelectorAll("[data-feed]").forEach((button) => button.onclick = () => { selectedId = button.dataset.feed; renderAll(false); });
    }
    function renderSources() {
      $("sourcesView").innerHTML = sources.map((source) =>
        '<article class="source-card"><div class="source-top"><div><strong>' + source.name + '</strong><p>' + source.coverage + '</p></div><div><span class="meta">' + source.status + '</span><strong style="display:block;text-align:right;color:var(--green);font-size:26px">' + source.reliability + '</strong></div></div><div class="meter"><i style="width:' + source.reliability + '%"></i></div></article>'
      ).join("");
    }
    function renderDetail(rows) {
      const event = rows.find((item) => item.id === selectedId) || rows[0] || events[0];
      selectedId = event.id;
      $("detail").innerHTML =
        '<div class="meta">' + event.location + '</div><h2>' + event.title + '</h2><span class="badge ' + event.severity + '">' + severityLabel[event.severity] + '</span>' +
        '<div class="detail-grid"><div class="mini"><span>信心分數</span><strong>' + event.confidence + '</strong></div><div class="mini"><span>更新</span><strong>' + event.updatedAgo + '</strong></div></div>' +
        '<div class="section-title">事件摘要</div><p>' + event.summary + '</p><div class="section-title">市場影響</div><p>' + event.marketImpact + '</p>' +
        '<div class="section-title">追蹤標的</div><div class="chips">' + event.stockFocus.map((item) => '<span class="chip">' + item + '</span>').join("") + '</div>' +
        '<div class="section-title">來源類型</div><div class="chips">' + event.sources.map((item) => '<span class="chip">' + item + '</span>').join("") + '</div>';
    }
    function renderStats(rows) {
      const score = rows.length ? Math.round(rows.reduce((sum, event) => sum + severityWeight[event.severity] * (event.confidence / 100), 0) / rows.length) : 0;
      $("riskScore").textContent = score;
      $("eventCount").textContent = rows.length;
    }
    function renderView() {
      for (const id of ["mapView", "wireView", "sourcesView"]) $(id).classList.add("hidden");
      $(currentView + "View").classList.remove("hidden");
      document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === currentView));
    }
    function renderAll(refreshLists = true) {
      const rows = filtered();
      if (refreshLists) {
        renderRegions();
        renderLayers();
      }
      renderStats(rows);
      renderMarkers(rows);
      renderWire(rows);
      renderSources();
      renderDetail(rows);
      renderQuotes();
      renderView();
    }
    document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { currentView = button.dataset.view; renderView(); });
    $("searchInput").addEventListener("input", () => renderAll(false));
    async function loadQuotes() {
      try {
        const response = await fetch("/api/market/overview", { cache: "no-store" });
        if (!response.ok) throw new Error("market api failed");
        const payload = await response.json();
        quotes = payload
          .filter((row) => ["^TWII", "^IXIC", "^SOX", "^VIX", "CL=F", "GC=F", "BTC-USD", "DX-Y.NYB"].includes(row.symbol))
          .slice(0, 8)
          .map((row) => ({ symbol: row.symbol, label: row.label, price: row.price > 0 ? price(row.price) : "-", changePct: Number(row.changePct || 0), source: row.source || "市場 API" }));
        $("marketStatus").textContent = "行情 API 已連線";
        $("marketStatus").className = "pill good";
      } catch {
        quotes = [...fallbackQuotes];
        $("marketStatus").textContent = "行情備援資料";
        $("marketStatus").className = "pill warn";
      }
      renderQuotes();
    }
    renderAll();
    loadQuotes();
  </script>
</body>
</html>`;

const worker = `const html = ${JSON.stringify(html)};
const marketApi = ${JSON.stringify(marketApi)};

function htmlResponse() {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60"
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/market/overview") {
      try {
        const response = await fetch(marketApi, { headers: { accept: "application/json" } });
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: {
            "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=30"
          }
        });
      } catch {
        return new Response(JSON.stringify({ error: "market feed unavailable" }), {
          status: 502,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }
    }
    if (url.pathname === "/" || url.pathname === "/global-monitor") return htmlResponse();
    return new Response("Not found", { status: 404 });
  }
};
`;

async function main() {
  const outDir = join(process.cwd(), "dist", "server");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.js"), worker, "utf8");
  console.log(join(outDir, "index.js"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
