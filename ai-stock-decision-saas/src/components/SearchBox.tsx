"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBox({ initialSymbol = "2330.TW" }: { initialSymbol?: string }) {
  const [value, setValue] = useState(initialSymbol);
  const router = useRouter();

  function submit() {
    const query = value.trim();
    if (query) router.push(`/dashboard?symbol=${encodeURIComponent(query)}`);
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4 md:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="輸入股票代號或名稱，例如 2330.TW、台積電"
          className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 text-white outline-none focus:border-blue-500"
        />
      </div>
      <button onClick={submit} className="h-12 rounded-xl bg-blue-600 px-6 font-bold text-white hover:bg-blue-500">
        一鍵分析
      </button>
    </div>
  );
}
