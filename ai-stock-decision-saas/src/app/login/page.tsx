import { Mail, Lock, Chrome } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="glass rounded-3xl p-6">
        <h1 className="text-3xl font-black text-white">登入</h1>
        <p className="mt-2 text-slate-300">Email/password 可接 NextAuth Credentials，Google OAuth 已預留。</p>
        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm text-slate-400">Email</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3">
              <Mail className="h-4 w-4 text-slate-500" />
              <input className="h-12 flex-1 bg-transparent text-white outline-none" placeholder="you@example.com" />
            </div>
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">Password</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3">
              <Lock className="h-4 w-4 text-slate-500" />
              <input type="password" className="h-12 flex-1 bg-transparent text-white outline-none" placeholder="••••••••" />
            </div>
          </label>
          <button className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500">登入</button>
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 font-bold text-white hover:bg-slate-800">
            <Chrome className="h-4 w-4" /> 使用 Google 繼續（預留）
          </button>
        </div>
      </div>
    </div>
  );
}
