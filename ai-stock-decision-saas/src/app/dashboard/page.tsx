import { Suspense } from "react";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="glass rounded-3xl p-8 text-slate-300">載入分析 Dashboard...</div>}>
      <DashboardClient />
    </Suspense>
  );
}
