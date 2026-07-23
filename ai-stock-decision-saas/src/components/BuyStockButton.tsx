"use client";

import Link from "next/link";
import { ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { addClientPortfolioItem } from "@/lib/client-portfolio";

type Props = {
  symbol: string;
  name: string;
  price: number;
  stopLossPrice: number;
};

export function BuyStockButton({ symbol, name, price, stopLossPrice }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10000");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  function save() {
    const buyAmount = Number(amount);
    const shares = Math.floor(buyAmount / price);
    if (!Number.isFinite(buyAmount) || buyAmount <= 0 || shares < 1) {
      setMessage(`投入金額至少需要 ${price.toFixed(2)} 元`);
      return;
    }
    addClientPortfolioItem({
      symbol,
      name,
      shares,
      cost: price,
      buyAmount,
      stopLossPrice,
      boughtAt: new Date().toISOString()
    });
    setSaved(true);
    setMessage(`已記錄 ${shares.toLocaleString()} 股，買入金額 ${buyAmount.toLocaleString()} 元，持股追蹤已啟動。`);
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMessage(""); setSaved(false); }} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400">
        <ShoppingCart className="h-4 w-4" />同意買進並監看
      </button>
      {open ? <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/85 p-4" role="dialog" aria-modal="true" aria-labelledby={`buy-${symbol}`}>
        <section className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-emerald-300">同意買進後加入持股管理</p><h2 id={`buy-${symbol}`} className="mt-1 text-2xl font-black text-white">{name} {symbol}</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-600 p-2 text-slate-200" aria-label="取消買入"><X className="h-5 w-5" /></button></div>
          <div className="mt-5 rounded-2xl bg-slate-800 p-4 text-sm text-slate-200"><p>目前買入價：<strong className="text-white">{price.toFixed(2)} 元</strong></p><p className="mt-1">固定停損點：<strong className="text-rose-300">{stopLossPrice.toFixed(2)} 元</strong></p></div>
          <label className="mt-5 block text-sm font-bold text-slate-200">買入投入金額（元）<input autoFocus value={amount} onChange={(event) => { setAmount(event.target.value); setMessage(""); }} onKeyDown={(event) => { if (event.key === "Enter") save(); }} inputMode="numeric" className="mt-2 w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-lg text-white outline-none focus:border-emerald-400" /></label>
          <p className="mt-2 text-sm text-slate-400">依現價推算 {Math.max(0, Math.floor(Number(amount || 0) / price)).toLocaleString()} 股。</p>
          {message ? <p className="mt-3 rounded-xl bg-blue-500/10 p-3 text-sm font-bold text-blue-200">{message}</p> : null}
          {saved ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href="/portfolio" onClick={() => setOpen(false)} className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white hover:bg-blue-500">查看持股管理</Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-600 px-4 py-3 font-black text-slate-100 hover:bg-slate-800">完成</button>
            </div>
          ) : (
            <button type="button" onClick={save} className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 hover:bg-emerald-400">確認買入並開始監看</button>
          )}
        </section>
      </div> : null}
    </>
  );
}
