"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Chrome } from "lucide-react";

const DEMO_EMAIL = "demo@stock-ai.local";
const DEMO_PASSWORD = "Demo1234!";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      localStorage.setItem("ai-stock-demo-user", JSON.stringify({ email: DEMO_EMAIL, name: "Demo User" }));
      router.push("/dashboard");
      return;
    }
    setError("帳號或密碼錯誤，請使用頁面上的展示帳密。");
  }

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={handleSubmit} className="glass rounded-3xl p-6">
        <h1 className="text-3xl font-black text-white">登入</h1>
        <p className="mt-2 text-slate-300">目前是 MVP 展示登入，正式版可接 NextAuth、Google OAuth 與 PostgreSQL 使用者資料表。</p>

        <div className="mt-5 rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4 text-sm text-blue-100">
          <p className="font-bold text-white">展示帳密</p>
          <p className="mt-2">帳號：{DEMO_EMAIL}</p>
          <p>密碼：{DEMO_PASSWORD}</p>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm text-slate-400">Email</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                className="h-12 flex-1 bg-transparent text-white outline-none"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">Password</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                className="h-12 flex-1 bg-transparent text-white outline-none"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
          </label>

          {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

          <button className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500">登入</button>
          <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 font-bold text-white hover:bg-slate-800">
            <Chrome className="h-4 w-4" /> 使用 Google 登入（預留）
          </button>
        </div>
      </form>
    </div>
  );
}
