"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  KeyRound,
  Loader2,
  MapPinned,
  Plane,
  RefreshCw,
  ShieldAlert
} from "lucide-react";
import type { ArchitectureRadarResult, RiskItem, SourceStatus } from "@/lib/architecture-regulation";

type FormState = {
  mode: "personal" | "api";
  address: string;
  parcel: string;
  height: string;
  city: string;
  useType: string;
  manualHeightLimit: string;
  manualParcelConfirmed: boolean;
  manualMapChecked: boolean;
  manualZoningChecked: boolean;
  manualAviationChecked: boolean;
  manualSourceNote: string;
};

const initialForm: FormState = {
  mode: "personal",
  address: "",
  parcel: "",
  height: "",
  city: "",
  useType: "住宅/商業待確認",
  manualHeightLimit: "",
  manualParcelConfirmed: false,
  manualMapChecked: false,
  manualZoningChecked: false,
  manualAviationChecked: false,
  manualSourceNote: ""
};

function toneClass(tone: string) {
  if (tone === "ok") return "border-emerald-400/30 bg-emerald-400/12 text-emerald-100";
  if (tone === "warning") return "border-amber-400/35 bg-amber-400/12 text-amber-100";
  if (tone === "danger" || tone === "blocked") return "border-rose-400/35 bg-rose-500/12 text-rose-100";
  return "border-sky-400/25 bg-sky-400/10 text-sky-100";
}

function riskIcon(level: RiskItem["level"]) {
  if (level === "ok") return CheckCircle2;
  if (level === "blocked" || level === "danger") return ShieldAlert;
  if (level === "warning") return AlertTriangle;
  return FileSearch;
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${
        ok ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
      }`}
    >
      {ok ? "已連線" : "需檢查"}
    </span>
  );
}

function SourceCard({ source }: { source: SourceStatus }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group rounded-2xl border border-slate-700/80 bg-slate-950/50 p-4 transition hover:border-blue-400/60 hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{source.agency}</p>
          <h3 className="mt-1 font-black text-white">{source.name}</h3>
        </div>
        <StatusPill ok={source.ok} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{source.message}</p>
      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-300">
        開啟官方來源
        <ExternalLink className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </a>
  );
}

function ActionBox({ title, body, icon: Icon }: { title: string; body: string; icon: typeof AlertTriangle }) {
  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-950/50 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-blue-300" />
        <p className="font-black text-white">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPersonalRiskMatrix(form: FormState): RiskItem[] {
  const hasAddress = form.address.trim().length > 0;
  const hasParcel = form.parcel.trim().length > 0;
  const plannedHeight = parseNumber(form.height);
  const manualHeightLimit = parseNumber(form.manualHeightLimit);
  const overManualLimit =
    plannedHeight !== null && manualHeightLimit !== null && plannedHeight > manualHeightLimit;

  return [
    {
      id: "personal-parcel",
      title: "人工地號確認",
      level: hasParcel && form.manualParcelConfirmed ? "ok" : hasParcel || hasAddress ? "warning" : "blocked",
      status: hasParcel && form.manualParcelConfirmed ? "已人工確認" : "需要人工確認",
      detail: hasParcel
        ? "個人驗證模式會使用你輸入的地號，但不會把它當成官方 API 回傳結果。"
        : "請先用官方圖台或地籍資料人工取得地號，再填回系統。",
      nextAction: "用 NLSC 圖台或地籍謄本確認地號後勾選。"
    },
    {
      id: "personal-cadastral-map",
      title: "人工地籍圖確認",
      level: form.manualMapChecked ? "ok" : hasParcel ? "warning" : "blocked",
      status: form.manualMapChecked ? "已人工確認" : "尚未確認基地邊界",
      detail: "未取得 API 前，地籍圖與基地邊界必須由你人工在官方圖台或正式文件確認。",
      nextAction: "確認基地邊界、臨路、鄰地與地號是否一致。"
    },
    {
      id: "personal-zoning",
      title: "使用分區與土地管制",
      level: form.manualZoningChecked ? "ok" : "warning",
      status: form.manualZoningChecked ? "已人工查核" : "需查都市計畫/土地使用",
      detail: "建蔽率、容積率、使用分區、公共設施保留地與非都市土地編定，都會影響可建性。",
      nextAction: "查都市計畫、土地使用分區或向主管機關確認。"
    },
    {
      id: "personal-aviation",
      title: "飛航限高人工比對",
      level: overManualLimit ? "danger" : form.manualAviationChecked && plannedHeight !== null ? "ok" : plannedHeight !== null ? "warning" : "blocked",
      status: overManualLimit ? "預估高度超過人工限高" : form.manualAviationChecked ? "已人工比對" : "尚未比對限高",
      detail:
        plannedHeight === null
          ? "請輸入預估高度，才能和人工查得的限高做初步比對。"
          : manualHeightLimit !== null
            ? `預估高度 ${plannedHeight} 公尺，人工查得限高 ${manualHeightLimit} 公尺。`
            : `預估高度 ${plannedHeight} 公尺，但尚未填入人工查得的限高。`,
      nextAction: overManualLimit
        ? "先視為高風險，請建築師或主管機關確認是否需降高或不能興建。"
        : "用飛航限高條文、公告附圖或主管機關資料比對後勾選。"
    },
    {
      id: "personal-source-note",
      title: "人工來源註記",
      level: form.manualSourceNote.trim().length > 0 ? "info" : "warning",
      status: form.manualSourceNote.trim().length > 0 ? "已有註記" : "建議補上來源",
      detail: form.manualSourceNote.trim() || "請記錄你查的是哪個官方圖台、哪份謄本、哪個主管機關或哪個公告附圖。",
      nextAction: "把來源寫清楚，之後才方便比對與追蹤版本。"
    }
  ];
}

function buildPersonalVerdict(riskMatrix: RiskItem[]) {
  const blockers = riskMatrix.filter((item) => item.level === "blocked");
  const dangers = riskMatrix.filter((item) => item.level === "danger");
  const warnings = riskMatrix.filter((item) => item.level === "warning");

  if (dangers.length > 0) {
    return {
      label: "人工查核出現高風險",
      tone: "danger" as const,
      summary: "人工輸入的條件已出現衝突，例如預估高度超過人工查得限高。先不要判定可建。",
      blockers: dangers.map((item) => item.title),
      nextActions: ["先視為不可直接投資或送件。", "請建築師、地政士或主管機關複核。", "必要時修正高度、用途或基地條件。"]
    };
  }

  if (blockers.length > 0) {
    return {
      label: "個人驗證待補資料",
      tone: "warning" as const,
      summary: "目前可用個人模式先查，但地址、地號、地籍圖或高度資料仍不足，不能判斷安全可建。",
      blockers: blockers.map((item) => item.title),
      nextActions: ["先補完整地址、地號與預估高度。", "用官方圖台或正式文件人工確認。", "保留來源註記，避免之後查不到依據。"]
    };
  }

  if (warnings.length > 0) {
    return {
      label: "個人驗證進行中",
      tone: "warning" as const,
      summary: "資料已能做初步人工查核，但仍有項目未勾選或來源未註記。這不是安全可建結論。",
      blockers: warnings.map((item) => item.title),
      nextActions: ["補齊未確認項目。", "把官方查核來源寫進註記。", "完成後交由專業人員複核。"]
    };
  }

  return {
    label: "人工驗證可進下一步",
    tone: "ok" as const,
    summary: "人工檢核資料看起來完整，可進入建築師或主管機關複核；仍不代表已取得正式許可。",
    blockers: [],
    nextActions: ["輸出或保存人工查核紀錄。", "交由建築師確認建蔽率、容積、限高與法規適用。", "正式送件前再確認最新公告。"]
  };
}

function ManualCheck({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/50 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-slate-600 bg-slate-900 accent-blue-500"
      />
      <span className="text-sm font-bold leading-6 text-slate-200">{label}</span>
    </label>
  );
}

export function ArchitectureRegulationClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<ArchitectureRadarResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("address", form.address);
    params.set("parcel", form.parcel);
    params.set("height", form.height);
    params.set("city", form.city);
    params.set("useType", form.useType);
    return params.toString();
  }, [form]);

  async function runRadar() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/architecture-regulation/radar?${queryString}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`查詢失敗：${response.status}`);
      const data = (await response.json()) as ArchitectureRadarResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "查詢失敗，請稍後重試。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runRadar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const personalRiskMatrix = useMemo(() => buildPersonalRiskMatrix(form), [form]);
  const personalVerdict = useMemo(() => buildPersonalVerdict(personalRiskMatrix), [personalRiskMatrix]);
  const displayRiskMatrix = form.mode === "personal" ? personalRiskMatrix : result?.riskMatrix || [];
  const verdict = form.mode === "personal" ? personalVerdict : result?.verdict;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950 shadow-2xl">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-200">
                <Building2 className="h-4 w-4" />
                建築法規雷達 V0.2
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
                建築基地風險查核
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                先把地址、地號、預估高度丟進來，系統會即時連線官方法規與圖資來源；驗證階段可用個人模式先做人工查核。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ActionBox title="不造假地號" body="沒有官方地籍授權，就顯示尚未排除風險。" icon={MapPinned} />
              <ActionBox title="飛航限高優先" body="基地坐標與公告附圖不足時，不判斷可建。" icon={Plane} />
              <ActionBox title="法規來源可追" body="法規與圖資都保留官方連結，方便人工複核。" icon={FileSearch} />
            </div>
          </div>

          <div className={`rounded-3xl border p-5 ${toneClass(verdict?.tone || "info")}`}>
            <p className="text-sm font-black opacity-75">目前總判斷</p>
            <p className="mt-3 text-4xl font-black tracking-tight">{verdict?.label || "連線檢查中"}</p>
            <p className="mt-3 leading-7 opacity-90">
              {verdict?.summary || "正在確認法規與圖資來源，請稍候。"}
            </p>
            <div className="mt-5 rounded-2xl border border-current/20 bg-black/10 p-4">
              <p className="text-xs font-black opacity-70">必要提醒</p>
              <p className="mt-2 text-sm leading-6">
                目前模式：{form.mode === "personal" ? "個人驗證模式" : "API 自動模式"}。本工具只做研究與送件前檢核，不取代建築師簽證、地政資料謄本、都市計畫證明或主管機關審查。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Input</p>
              <h2 className="text-xl font-black text-white">基地條件</h2>
            </div>
            <button
              onClick={runRadar}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-glow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              重新查核
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 rounded-3xl border border-blue-400/25 bg-blue-400/10 p-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, mode: "personal" }))}
                className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                  form.mode === "personal" ? "bg-blue-500 text-white shadow-glow" : "bg-slate-950/60 text-slate-300 hover:bg-slate-900"
                }`}
              >
                個人驗證模式
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, mode: "api" }))}
                className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                  form.mode === "api" ? "bg-blue-500 text-white shadow-glow" : "bg-slate-950/60 text-slate-300 hover:bg-slate-900"
                }`}
              >
                API 自動模式
              </button>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-300">地址</span>
              <input
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="例如：台北市松山區..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">地號</span>
                <input
                  value={form.parcel}
                  onChange={(event) => setForm((prev) => ({ ...prev, parcel: event.target.value }))}
                  placeholder="例如：某段 0000-0000"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">預估高度 M</span>
                <input
                  inputMode="decimal"
                  value={form.height}
                  onChange={(event) => setForm((prev) => ({ ...prev, height: event.target.value }))}
                  placeholder="例如：49.5"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">縣市</span>
                <input
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="例如：台北市"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-300">用途</span>
                <select
                  value={form.useType}
                  onChange={(event) => setForm((prev) => ({ ...prev, useType: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400"
                >
                  <option>住宅/商業待確認</option>
                  <option>住宅</option>
                  <option>商業</option>
                  <option>工業</option>
                  <option>辦公</option>
                  <option>倉儲</option>
                  <option>農地/非都市土地</option>
                </select>
              </label>
            </div>

            {form.mode === "personal" ? (
              <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="font-black text-white">個人驗證清單</p>
                    <p className="mt-1 text-sm leading-6 text-emerald-100/85">
                      沒有 API 授權時，先用官方圖台、謄本或主管機關資料人工確認，再把結果勾回系統。
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  <ManualCheck
                    checked={form.manualParcelConfirmed}
                    label="我已人工確認地號與地址相符"
                    onChange={(checked) => setForm((prev) => ({ ...prev, manualParcelConfirmed: checked }))}
                  />
                  <ManualCheck
                    checked={form.manualMapChecked}
                    label="我已人工查看地籍圖與基地邊界"
                    onChange={(checked) => setForm((prev) => ({ ...prev, manualMapChecked: checked }))}
                  />
                  <ManualCheck
                    checked={form.manualZoningChecked}
                    label="我已人工確認都市計畫或土地使用分區"
                    onChange={(checked) => setForm((prev) => ({ ...prev, manualZoningChecked: checked }))}
                  />
                  <ManualCheck
                    checked={form.manualAviationChecked}
                    label="我已人工比對飛航限高或禁限建公告"
                    onChange={(checked) => setForm((prev) => ({ ...prev, manualAviationChecked: checked }))}
                  />
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-300">人工查得限高 M</span>
                    <input
                      inputMode="decimal"
                      value={form.manualHeightLimit}
                      onChange={(event) => setForm((prev) => ({ ...prev, manualHeightLimit: event.target.value }))}
                      placeholder="例如：60，沒有就先留空"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-300">人工來源註記</span>
                    <textarea
                      value={form.manualSourceNote}
                      onChange={(event) => setForm((prev) => ({ ...prev, manualSourceNote: event.target.value }))}
                      placeholder="例如：NLSC 圖台查詢日期、地籍謄本日期、主管機關公告圖名..."
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="glass rounded-3xl p-5">
          <div>
            <p className="text-sm text-slate-400">Decision Flow</p>
            <h2 className="text-xl font-black text-white">風險矩陣</h2>
          </div>

          <div className="mt-5 grid gap-3">
            {displayRiskMatrix.map((item) => {
              const Icon = riskIcon(item.level);
              return (
                <div key={item.id} className={`rounded-2xl border p-4 ${toneClass(item.level)}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-black">{item.title}</p>
                        <p className="mt-1 text-sm font-bold opacity-80">{item.status}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-black">
                      {item.level === "blocked" ? "卡關" : item.level === "warning" ? "需複核" : item.level === "ok" ? "通過" : "資訊"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 opacity-90">{item.detail}</p>
                  <p className="mt-3 rounded-xl border border-current/15 bg-black/10 p-3 text-sm font-bold">
                    下一步：{item.nextAction}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-slate-400">Official Connections</p>
            <h2 className="text-xl font-black text-white">官方網站連線狀態</h2>
          </div>
          <p className="text-sm text-slate-400">
            {result?.updatedAt ? `更新：${new Date(result.updatedAt).toLocaleString("zh-TW")}` : "連線中"}
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(result?.sourceStatuses || []).map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-1 h-6 w-6 text-amber-300" />
            <div>
              <p className="text-sm text-slate-400">Authorization Gap</p>
              <h2 className="text-xl font-black text-white">地籍 API 授權缺口</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {(result?.requiredApiChecks || []).map((item) => (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 transition hover:border-amber-300/60"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-amber-200">{item.code}</p>
                    <h3 className="mt-1 font-black text-white">{item.name}</h3>
                  </div>
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-200">
                    {item.status === "connected" ? "已設定" : "需申請"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.purpose}</p>
                <p className="mt-2 text-xs leading-5 text-amber-100/80">{item.note}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <div>
            <p className="text-sm text-slate-400">Law Radar</p>
            <h2 className="text-xl font-black text-white">相關法規入口</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {(result?.lawLinks || []).map((law) => (
              <a
                key={law.id}
                href={law.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl border border-slate-700/80 bg-slate-950/50 p-4 transition hover:border-blue-400/60 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500">{law.agency} · {law.category}</p>
                    <h3 className="mt-1 font-black text-white">{law.title}</h3>
                  </div>
                  <ExternalLink className="h-4 w-4 text-blue-300 transition group-hover:translate-x-0.5" />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{law.reason}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="risk-note rounded-3xl p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black opacity-80">正式使用前還要補上的關鍵資料</p>
            <h2 className="mt-1 text-2xl font-black">申請 NLSC 地籍 API 後，才能做真正的地址到地號與地籍圖疊合</h2>
          </div>
          <ShieldAlert className="h-9 w-9 shrink-0" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(result?.verdict.nextActions || []).map((action) => (
            <div key={action} className="rounded-2xl border border-current/20 bg-black/10 p-4 text-sm font-bold leading-6">
              {action}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
