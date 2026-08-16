import { ArchitectureRegulationClient } from "@/components/architecture/ArchitectureRegulationClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "建築法規雷達 | AI 股票全方位決策系統",
  description: "地址、地號、飛航限高、地籍圖與官方法規來源查核。"
};

export default function ArchitectureRegulationPage() {
  return <ArchitectureRegulationClient />;
}
