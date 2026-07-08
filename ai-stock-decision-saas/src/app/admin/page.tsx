import { MetricCard } from "@/components/MetricCard";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Admin</p>
        <h1 className="text-3xl font-black text-white">管理員後台</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="使用者數" value="待接 DB" sub="正式資料庫尚未啟用" />
        <MetricCard label="資料同步狀態" value="OK" sub="TWSE/TPEX/Yahoo provider ready" tone="bull" />
        <MetricCard label="API 狀態" value="99.9%" sub="Redis cache ready" />
        <MetricCard label="系統錯誤" value="0" sub="最近 24h" />
      </div>
      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-black text-white">分析紀錄與 API Logs</h2>
        <p className="mt-2 text-slate-300">正式版會連接 PostgreSQL 的 analysis_results、api_logs、system_logs。</p>
      </div>
    </div>
  );
}
