import { type NextRequest, NextResponse } from "next/server";
import {
  getBudget,
  getCancellations,
  getCashflow,
  getCatalog,
  getCourses,
  getCustomers,
  getFinancials,
  getFranchise,
  getFunding,
  getInsurance,
  getInventory,
  getLabor,
  getMarketing,
  getMembership,
  getRelax,
  getStylists,
  getOverview,
  getReconciliation,
  getReferral,
  getSales,
  getStores,
} from "@/lib/data";
import { parseFilters, type Filters } from "@/lib/filters";
import { maskLead } from "@/lib/referral";

export const dynamic = "force-dynamic";

// The integration seam over HTTP. Each resource maps to a data-access selector.
// To go live, reimplement the selectors in src/lib/data against Salon One —
// these routes and every screen keep working unchanged.
const RESOURCES: Record<string, (f: Filters) => unknown> = {
  overview: getOverview,
  sales: getSales,
  cashflow: getCashflow,
  reconciliation: getReconciliation,
  financials: getFinancials,
  stores: getStores,
  customers: getCustomers,
  marketing: getMarketing,
  budget: getBudget,
  inventory: getInventory,
  cancellations: getCancellations,
  labor: getLabor,
  funding: getFunding,
  franchise: getFranchise,
  courses: getCourses,
  insurance: getInsurance,
  stylists: getStylists,
  membership: getMembership,
  relax: getRelax,
  // 申込の連絡先は公開HTTPからは伏せて返します（画面はサーバ側で完全な値を参照）。
  referral: (f: Filters) => {
    const d = getReferral(f);
    return { ...d, leads: d.leads.map(maskLead) };
  },
};

export function GET(
  req: NextRequest,
  { params }: { params: { resource: string } },
) {
  const { resource } = params;

  if (resource === "catalog") {
    return NextResponse.json(getCatalog());
  }

  const selector = RESOURCES[resource];
  if (!selector) {
    return NextResponse.json(
      { error: `unknown resource: ${resource}`, available: [...Object.keys(RESOURCES), "catalog"] },
      { status: 404 },
    );
  }

  const filters = parseFilters(Object.fromEntries(req.nextUrl.searchParams.entries()));
  return NextResponse.json({ resource, filters, data: selector(filters) });
}
