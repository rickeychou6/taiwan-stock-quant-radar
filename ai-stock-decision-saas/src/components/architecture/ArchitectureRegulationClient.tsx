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
  address: string;
  parcel: string;
  height: string;
  city: string;
  useType: string;
};

const initialForm: FormState = {
  address: "",
  parcel: "",
  height: "",
  city: "",
  useType: "住宅/商業待確認"
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

  const verdict = result?.verdict;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950 shadow-2xl">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-200">
                <Building2 className="h-4 w-4" />
                建築法規雷達 V0.1
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
                建築基地風險查核
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                先把地址、地號、預估高度丟進來，系統會即時連線官方法規與圖資來源，檢查地籍授權、飛航限高、法規版本與下一步缺口。
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
                本工具只做研究與送件前檢核，不取代建築師簽證、地政資料謄本、都市計畫證明或主管機關審查。
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
            {(result?.riskMatrix || []).map((item) => {
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
