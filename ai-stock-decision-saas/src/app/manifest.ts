import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "台股 AI 決策雷達",
    short_name: "台股雷達",
    description: "自動掃描台股、推薦候選股並提供到價與風險提醒；不含自動下單。",
    start_url: "/recommendations",
    display: "standalone",
    background_color: "#07111f",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    categories: ["finance", "business"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
