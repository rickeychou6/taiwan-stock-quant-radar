import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "AI 股票全方位分析決策網站",
  description: "高勝率、可回測、可解釋、可控風險的股票決策輔助 SaaS"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
