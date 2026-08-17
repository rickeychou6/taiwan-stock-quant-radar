import Link from "next/link";
import { BarChart3, Bot, Briefcase, Building2, Gauge, Globe2, Home, ListChecks, Radar, ShieldAlert, ShoppingBag, Sparkles, UserCircle } from "lucide-react";
import { RiskNotice } from "@/components/RiskNotice";
import { GlobalSignalAlerts } from "@/components/GlobalSignalAlerts";

const navItems = [
  { href: "/", label: "首頁", mobileLabel: "首頁", icon: Home },
  { href: "/dashboard", label: "分析 Dashboard", mobileLabel: "分析", icon: Gauge },
  { href: "/recommendations", label: "個股推薦", mobileLabel: "推薦", icon: Sparkles },
  { href: "/ecommerce-radar", label: "電商雷達", mobileLabel: "電商", icon: ShoppingBag },
  { href: "/architecture-regulation", label: "建築法規", mobileLabel: "建築", icon: Building2 },
  { href: "/auto-trader", label: "AI 模擬交易", mobileLabel: "AI 交易", icon: Bot },
  { href: "/radars", label: "多功能雷達", mobileLabel: "雷達", icon: Radar },
  { href: "/watchlist", label: "自選股", mobileLabel: "自選", icon: ListChecks },
  { href: "/portfolio", label: "持股管理", mobileLabel: "持股", icon: Briefcase },
  { href: "/market", label: "市場總覽", mobileLabel: "市場", icon: BarChart3 },
  { href: "/global-monitor", label: "全球事件雷達", mobileLabel: "全球", icon: Globe2 },
  { href: "/admin", label: "管理後台", mobileLabel: "後台", icon: ShieldAlert },
  { href: "/login", label: "登入", mobileLabel: "登入", icon: UserCircle }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 font-black text-white shadow-glow">
                AI
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 sm:text-sm">Stock Decision SaaS</p>
                <h1 className="truncate text-base font-bold text-white sm:text-lg">AI 股票全方位決策系統</h1>
              </div>
            </Link>
            <nav className="hidden items-center gap-1 xl:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <nav className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 xl:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-700/70 bg-slate-900/70 px-2 py-2 text-xs font-bold text-slate-200 transition active:scale-[0.98] active:bg-blue-600/30"
                >
                  <Icon className="h-4 w-4" />
                  <span className="leading-tight">{item.mobileLabel}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <RiskNotice />
        {children}
      </main>
      <GlobalSignalAlerts />
    </div>
  );
}
