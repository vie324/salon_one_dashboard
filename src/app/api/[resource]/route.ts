import { type NextRequest, NextResponse } from "next/server";
import {
  getBudget,
  getCancellations,
  getCashflow,
  getCatalog,
  getCustomers,
  getFinancials,
  getFranchise,
  getFunding,
  getInventory,
  getLabor,
  getMarketing,
  getOverview,
  getReconciliation,
  getSales,
  getStores,
} from "@/lib/data";
import { parseFilters, type Filters } from "@/lib/filters";

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
