import { EcommerceCategoryPageClient } from "@/components/ecommerce/EcommerceCategoryPageClient";
import { ECOMMERCE_PARENT_CATEGORY_LINKS } from "@/lib/ecommerce-radar";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return ECOMMERCE_PARENT_CATEGORY_LINKS.map((item) => ({ slug: item.slug }));
}

export default async function EcommerceCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EcommerceCategoryPageClient slug={slug} />;
}
