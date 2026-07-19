// ============================================================
// Sample-data switch (single knob).
// ------------------------------------------------------------
// The console ships with a fabricated demo dataset. A handful of *sample
// line-item* records read like manually-entered test data, so they are
// cleared by default to present a clean slate:
//   ・借入 / 補助金（資金調達）    getFunding
//   ・FC・のれん分け 加盟店        getFranchise
//   ・キャンセル常習者            getCancellations
//   ・コース契約 明細（役務）      getCourses
//   ・療養費 請求明細             getInsurance
//   ・口コミ・評価               getMarketing
//
// Aggregate metrics (売上・利益・客数・稼働率 …) are derived from the core
// dataset and are NOT affected by this switch.
//
// To restore the full demo dataset, either:
//   1. change the default below (`: false` → `: true`), or
//   2. run the server with the env var `SHOW_SAMPLE_DATA=true` (read live,
//      server-side, so no rebuild is required).
// The data-access layer is server-only, so this is not exposed to the client.
// ============================================================
export const SHOW_SAMPLE_DATA: boolean =
  process.env.SHOW_SAMPLE_DATA === "true"
    ? true
    : process.env.SHOW_SAMPLE_DATA === "false"
      ? false
      : false;
