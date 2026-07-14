import Link from "next/link";
import { BarChart3, Briefcase, Gauge, Home, ListChecks, ShieldAlert, Sparkles, UserCircle } from "lucide-react";
import { RiskNotice } from "@/components/RiskNotice";

const navItems = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/dashboard", label: "分析 Dashboard", icon: Gauge },
  { href: "/recommendations", label: "個股推薦", icon: Sparkles },
  { href: "/watchlist", label: "自選股", icon: ListChecks },
  { href: "/portfolio", label: "持股管理", icon: Briefcase },
  { href: "/market", label: "市場總覽", icon: BarChart3 },
  { href: "/admin", label: "管理後台", icon: ShieldAlert },
  { href: "/login", label: "登入", icon: UserCircle }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 font-black text-white shadow-glow">
              AI
            </div>
            <div>
              <p className="text-sm text-slate-400">Stock Decision SaaS</p>
              <h1 className="text-lg font-bold text-white">AI 股票全方位決策系統</h1>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
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
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <RiskNotice />
        {children}
      </main>
    </div>
  );
}
