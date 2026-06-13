"use client";

import { Calendar, GitCompareArrows, Store as StoreIcon, Tag } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  COMPARE_OPTIONS,
  PERIOD_OPTIONS,
  buildQuery,
  parseFilters,
  type Filters,
} from "@/lib/filters";

export interface FilterBrand {
  id: string;
  name: string;
}
export interface FilterStore {
  id: string;
  name: string;
  brandId: string;
}

export function FilterBar({
  brands,
  stores,
}: {
  brands: FilterBrand[];
  stores: FilterStore[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const filters = parseFilters(Object.fromEntries(sp.entries()));

  function update(patch: Partial<Filters>) {
    const next: Filters = { ...filters, ...patch };
    // brand change invalidates a store selection outside that brand
    if (patch.brandId && patch.brandId !== filters.brandId) {
      const ok = patch.brandId === "all" || stores.some((s) => s.id === filters.storeId && s.brandId === patch.brandId);
      if (!ok) next.storeId = "all";
    }
    router.push(pathname + buildQuery(next), { scroll: false });
  }

  const storeOptions = stores.filter((s) => filters.brandId === "all" || s.brandId === filters.brandId);

  return (
    <div className="flex items-center gap-2">
      <Field icon={<Calendar className="h-3.5 w-3.5" />}>
        <select className="select h-9" value={filters.period} onChange={(e) => update({ period: e.target.value as Filters["period"] })}>
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field icon={<Tag className="h-3.5 w-3.5" />}>
        <select className="select h-9" value={filters.brandId} onChange={(e) => update({ brandId: e.target.value })}>
          <option value="all">全ブランド</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </Field>

      <Field icon={<StoreIcon className="h-3.5 w-3.5" />}>
        <select className="select h-9" value={filters.storeId} onChange={(e) => update({ storeId: e.target.value })}>
          <option value="all">全店舗</option>
          {storeOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>

      <Field icon={<GitCompareArrows className="h-3.5 w-3.5" />} hideOnMd>
        <select className="select h-9" value={filters.compare} onChange={(e) => update({ compare: e.target.value as Filters["compare"] })}>
          {COMPARE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function Field({
  icon,
  children,
  hideOnMd,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  hideOnMd?: boolean;
}) {
  return (
    <div className={`relative flex items-center ${hideOnMd ? "hidden md:flex" : ""}`}>
      <span className="pointer-events-none absolute left-2.5 text-slate-400">{icon}</span>
      <div className="[&_select]:pl-8">{children}</div>
    </div>
  );
}
