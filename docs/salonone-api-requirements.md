# Salon One API — 現状調査と追加エンドポイント要求仕様

**宛先**: Salon One 開発チーム
**目的**: 経営ダッシュボード（本リポジトリ）を実データで動かすために、現行APIで足りる部分・足りない部分を整理し、追加してほしいエンドポイントを具体的なレスポンス形で提示する。
**調査日**: 2026-07-04（本番 `https://salonone.net/api` に対する実測）

---

## 1. 現行APIの調査結果

### 1.1 認証

| 項目 | 内容 |
|---|---|
| ログイン | `POST /api/login`（`brand_code` / `login_id` / `password` / `remember`） |
| トークン | Sanctum Bearer。アクセストークン **約1時間**、リフレッシュトークン **約30日**（`POST /api/refresh-token` でローテーション） |
| 権限 | `account_permission_type: "root"` で全ブランド・全店舗横断 |

### 1.2 取得できるもの（実測済み）

| データ | エンドポイント | 備考 |
|---|---|---|
| ブランド一覧 | `GET /api/brands` | ドキュメント記載あり |
| 店舗一覧 | `GET /api/shops` | `scale`（施術台数）、住所等 |
| スタッフ一覧 | `GET /api/staffs` | 全店舗一括、`employment_type`・`hired_at` 等も保持 |
| メニュー / カテゴリ / 設備 / 営業時間 / 出勤パターン | `GET /api/menus` ほか | ドキュメント記載あり |
| 顧客一覧 | `GET /api/customers` | **未ドキュメント**。個人情報（氏名・電話）を含む |
| **日次カレンダー（予約・売上）** | `GET /api/appointments/calendar?shop_id=&date=` | 予約明細（`total_price`・`status`・`menu_name`・指名・`member_label` 新規/既存・`visit_source` 集客経路・決済ラベル）＋ **決済手段別日次売上** `daily_payment_summary` ＋ サブスク請求 |

### 1.3 足りないもの（ダッシュボード要件とのギャップ）

1. **集計エンドポイントが無い** — 月次・全店の数字は `calendar` を「店舗×日」で総当たりするしかない（14店舗×30日=420コール/月、12ヶ月分で約5,000コール）。
2. **期間指定の予約一覧が無い** — `POST /api/appointments` は予約**作成**用。読み取りは日単位の `calendar` のみ。
3. **コスト側のデータ源が無い** — 原価・人件費・家賃・水道光熱・減価償却など、PL/損益分岐に必要な費用データのエンドポイントが存在しない。
4. **決済代行の入金明細が無い** — 売上（手段別）は取れるが、入金予定・入金額・手数料・遅延が取れないため、資金繰り・突合（消込）画面を実データ化できない。
5. **広告費が無い** — `visit_source` で流入は取れるが、媒体別の広告費（CPA/ROAS算出に必須）が無い。
6. **前受金（役務）・回数券残高が無い** — 負債管理・消化スケジュールに必要。
7. **顧客一覧にページネーション・集計が無い**（実測ではフル配列が返る）— 件数が増えるとダッシュボード側の負荷が大きい。

---

## 2. 追加要求エンドポイント（優先度順）

> 返却形はすべて既存の `{ "success": true, "data": ... }` エンベロープを想定。
> ダッシュボード側の受け皿は `src/lib/types.ts` の `StoreMonth` 型（連携の契約）。

### P1 — 店舗×月次の実績集計（最優先）

これ1本でダッシュボードの主要画面（概要・売上分析・店舗比較・予実）が実データ化できる。

```
GET /api/reports/monthly-summary?from=2025-07&to=2026-06&shop_id=(省略可)
```

```jsonc
{
  "success": true,
  "data": [
    {
      "shop_id": 23,
      "brand_id": 11,
      "ym": "2026-06",
      "revenue_total": 1234567,        // 会計確定ベース
      "revenue_by_payment_method": [{ "payment_method_id": 17, "name": "現金", "amount": 280000 }],
      "customers": 312,                 // 来店客数（会計済み）
      "new_customers": 58,              // member_label "新規" ベース
      "reservations": 350,
      "cancellations": 21,
      "no_shows": 4,
      "nominated": 120,                 // 指名数
      "visit_sources": [{ "visit_source_id": 11, "name": "チラシ", "new_customers": 12 }],
      "menu_sales": [{ "menu_name": "整体60分", "amount": 480000, "count": 80 }]
    }
  ]
}
```

### P1' — 代替案（P1が難しい場合）: カレンダーの期間対応

既存 `GET /api/appointments/calendar` に `start_date` / `end_date`（最大31日等）を追加し、
`daily_payment_summary` を日付別配列で返す。ダッシュボード側で集計する。

### P2 — 期間指定の予約一覧（読み取り）

```
GET /api/appointments?shop_id=&from=2026-06-01&to=2026-06-30&per_page=200&page=1
```
`calendar` の予約オブジェクトと同形で、ページネーション付き。

### P2 — 顧客一覧のページネーション＋サマリ

```
GET /api/customers?per_page=100&page=2&updated_since=2026-06-01
GET /api/customers/summary   → { total, new_this_month, active_90d, dormant_180d }
```

### P3 — コスト入力（PL 実データ化の前提）

Salon One 側に費用データが無いなら、(a) 経費入力機能の追加、または (b) 会計ソフト（freee / マネーフォワード）連携のどちらかが必要。ダッシュボードが欲しい形:

```
GET /api/reports/monthly-costs?ym=2026-06&shop_id=
→ { labor, rent, utilities, advertising, payment_fees, depreciation, cogs, other }
```

### P3 — 決済代行入金明細（資金繰り・突合）

```
GET /api/settlements?from=&to=&shop_id=
→ [{ processor, method, gross, fee, net, scheduled_date, paid_date, status }]
```

### P3 — 前受金・回数券・サブスク残高

```
GET /api/prepaid/balance?ym=2026-06   → { sold, consumed, balance }
GET /api/subscriptions/summary?ym=   → { members, mrr, new, churned }
```

### P4 — 広告費（媒体別）

```
GET /api/marketing/spend?ym=&shop_id=
→ [{ visit_source_id, name, spend }]
```
※ Meta / TikTok のトークンは shop に保持済みのようなので、広告APIからの自動取得も選択肢。

---

## 3. 非機能要件（お願い）

- **読み取り専用スコープのAPIトークン**: ダッシュボードは読み取りのみ。root 資格情報ではなく、read-only のサービストークン（長期有効）が発行できると安全。
- **レート制限の明示**: 集計バックフィル時に日次で数百コールを行う可能性がある。上限と推奨間隔を教えてほしい。
- **個人情報の最小化**: `customers` は氏名・電話を含む。経営ダッシュボード用途には匿名化された集計（件数・セグメント）で十分。
- **Webhook（将来）**: 会計確定・予約確定・キャンセルのイベント通知があれば、ポーリングを減らせる。

---

## 4. ダッシュボード側の受け入れ準備（実装済み）

- `src/lib/salonone/` — 認証（自動リフレッシュ）付きAPIクライアント
- `src/lib/data/source.ts` — マスタ（ブランド/店舗/スタッフ）の実データ同期 + モックフォールバック
- `src/lib/types.ts` の `StoreMonth` が集計値の受け皿。P1 のレスポンスをこの型にマップするだけで全画面が実データ化される。
