import { AppShell } from "@/components/layout/AppShell";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { brands, stores } = getCatalog();
  return (
    <AppShell
      brands={brands.map((b) => ({ id: b.id, name: b.name }))}
      stores={stores.map((s) => ({ id: s.id, name: s.name, brandId: s.brandId }))}
    >
      {children}
    </AppShell>
  );
}
