# Salon One 経営ダッシュボード — AI 再構築用プロンプト集

本リポジトリと同等のダッシュボードを、**別のサーバー／別のリポジトリで VS Code + Claude を使ってゼロから構築する**ためのプロンプト集です。

## 使い方

1. 新しい空のフォルダを VS Code で開き、Claude（Claude Code 拡張など）を起動する。
2. 最初に **STEP 0（マスタープロンプト）** を丸ごと貼り付ける。これがプロジェクト全体の「仕様書 兼 ルール」になります。
3. その後、**フェーズ 1 → 6 のプロンプトを 1 つずつ順番に**実行する。22 画面あるため、一度に全部作らせず、フェーズごとに `npm run build` が通ることを確認してから次へ進めてください。
4. 途中でセッションが変わった（コンテキストが消えた）場合は、STEP 0 を再度貼り付けてから続きのフェーズを指示すると精度が保てます。
5. 最後に「検収チェックリスト」で仕上がりを確認する。

> **補足**: 移行先から GitHub にアクセスできるなら `git clone https://github.com/vie324/salon_one_dashboard.git` でコードをそのまま持ち込むのが最速・最確実です。本プロンプト集は、コードを持ち込めない場合や、別実装として作り直したい場合のためのものです。
>
> **ヒント**: STEP 0 の内容を移行先リポジトリの `CLAUDE.md` に保存しておくと、Claude Code が毎セッション自動で読み込むため、貼り付け直しが不要になります。

---

## STEP 0 — マスタープロンプト（最初に必ず貼る）

```text
あなたはシニアフロントエンドエンジニアです。これから複数回の指示に分けて、
サロン経営者向けの経営ダッシュボード「Salon One 経営ダッシュボード」を構築します。
このメッセージはプロジェクト全体の仕様とルールです。以後のすべての作業でこれに従ってください。

■ プロジェクト概要
複数ブランド・多店舗のサロン経営（ヘア／ネイル／アイラッシュ／リラク／エステ／整体の6業態）を
統合管理する経営者向けダッシュボードのプロトタイプ。
現場システム「Salon One」からのデータ連携を将来想定し、現在は決定論的なモックデータで動作させる。
UI 文言はすべて日本語。通貨は日本円。

■ 技術スタック（固定）
- Next.js 14（App Router、Server Components 中心）+ TypeScript（strict: true）
- Tailwind CSS 3（カスタムデザインシステム、darkMode: "class"）
- グラフ: Recharts 2 / アイコン: lucide-react
- ユーティリティ: clsx + tailwind-merge（cn() ヘルパー）
- Node.js 20.x（.nvmrc と package.json の engines で固定）
- 外部 API・DB・認証・有償サービスへの依存は一切なし。フォントは OS の日本語システムフォント。

■ 絶対に守るアーキテクチャ原則
1. データ取得は src/lib/data/（データアクセス層）に集約する。
   ここが将来の Salon One API 連携の「唯一の差し込み口」。
   - src/lib/data/index.ts …… セレクター群（getOverview, getSales, getCustomers, getMarketing,
     getCashflow, getReconciliation, getFinancials, getFunding, getBudget, getStores,
     getStoreDetail, getInventory, getCancellations, getLabor, getCourses, getInsurance,
     getStylists, getMembership, getRelax, getFranchise, getAlerts, getCatalog）
   - src/lib/data/catalog.ts …… ブランド／店舗／決済代行／媒体／業態プロファイルのマスタ
   - src/lib/data/generate.ts …… モックデータ生成（唯一の生成元）
   - src/lib/data/random.ts …… シード付き決定論的乱数（mulberry32 等）。Math.random() は使用禁止。
     SSR とクライアントで値が一致し、リロードしても同じ数値になること。
2. 画面（src/app/**）と API（src/app/api/[resource]/route.ts）は同じセレクターを呼ぶ。
   API ルートは resource 名（overview, sales, customers, …）でセレクターを呼び出して JSON を返す。
3. ページはサーバーコンポーネントとし、searchParams からグローバルフィルタを読み取って
   サーバー側で集計する。インタラクティブな部品（テーマ切替・グラフ等）のみ "use client"。
4. ドメイン型は src/lib/types.ts に集約（連携の契約書）。any は使わない。
5. 各セレクターの戻り値の型を保ったまま実装を API 呼び出しに差し替えれば
   全画面がそのまま動く、という構造を崩さない。

■ ディレクトリ構成
src/
├─ app/
│  ├─ layout.tsx              ルート（メタ・テーマ初期化。ダーク初期化はちらつき防止のインラインスクリプト）
│  ├─ globals.css             デザインシステム（@layer components でカード/ボタン/バッジ/テーブル等を定義）
│  ├─ manifest.ts / not-found.tsx
│  ├─ (app)/                  認証相当の共通シェル（サイドバー＋トップバー）
│  │  ├─ layout.tsx / loading.tsx / error.tsx
│  │  └─ 各ページ（下の「画面一覧」参照）
│  └─ api/[resource]/route.ts
├─ components/
│  ├─ layout/  AppShell, Sidebar, Topbar, FilterBar, Logo, ThemeToggle,
│  │           CommandPalette, NotificationCenter, Splash
│  ├─ providers/ UiPrefs（テーマ・サイドバー開閉・コンパクト密度を localStorage 保持）
│  ├─ charts/  Recharts ラッパー（TrendChart/BarsChart/DonutChart/Sparkline）と Heatmap
│  ├─ budget/  BudgetBoard
│  └─ ui/      Card, StatCard, ChartCard, PageHeader, PrintButton, ExportCsvButton,
│              SortableTable, AnimatedNumber, HelpHint, primitives（Badge/Progress等）
└─ lib/
   ├─ data/（前述） ├─ types.ts ├─ filters.ts ├─ budget.ts
   ├─ format.ts（¥1.2億/3,450万 のような日本式圧縮表記・%・日付）
   ├─ csv.ts ├─ colors.ts ├─ cn.ts └─ nav.ts（ナビ定義とロール別アクセス制御）

■ デザインシステム
- 基調色 brand はティール（Tailwind拡張: 500=#1b9587, 600=#0f766e, 700=#0d5d57 を中心に 50〜950）。
  アクセントにシャンパンゴールド gold（500=#c0a060）を控えめに使用。
- 金融セマンティクス: 増加・良化=emerald、減少・悪化=rose、警告=amber、情報=sky。
- ライト/ダーク両対応（class 切替）。背景 slate-50/slate-950、カードは白/slate-900、
  角丸16px（rounded-card）、ソフトシャドウ、余白広め、上質・モダンな金融ダッシュボードの趣。
- 数値テーブルは tabular-nums（.tnum クラス）で桁を揃える。
- カードのフェードアップの stagger アニメーション、prefers-reduced-motion 対応、
  細身スクロールバー、スケルトンの shimmer。
- @media print 対応: サイドバー・トップバー・フィルタ・ボタンを隠し、
  各ページ右上の「PDF出力」ボタン（window.print）で資料として印刷できる。

■ グローバルフィルタ（src/lib/filters.ts）
- 期間: 今月／先月／直近3・6・12ヶ月／今期(4月〜)／任意期間(from/to, YYYY-MM)
- ブランド・店舗・比較基準（前年同期比／前期間比）
- URL クエリ（?period=&brand=&store=&compare=&from=&to=）で保持し、ページ遷移でも維持。
  サーバーコンポーネントが searchParams から parseFilters() で読む。
- 基準日 TODAY = "2026-06-13"（当月=2026-06）、データ下限 = "2024-06"。
- periodMonths()/comparisonMonths() で対象月配列と比較月配列を返すヘルパーを用意。

■ マスタデータ（架空のデモ企業「Salon One Holdings」・4月開始の会計年度）
ブランド6つ（id/業態/チャートカラー）:
- lumiere「Lumière」hair #0f766e ／ mods「MOD's Nail」nail #be185d
- lashe「Lashé」eyelash #7c3aed ／ karada「Karada Lab」osteopathy #2563eb
- reposer「Reposer」relax #0891b2 ／ blanc「Esthé Blanc」esthetic #b45309
店舗16店（例: Lumière 表参道/渋谷/横浜/大阪梅田/名古屋栄、MOD's 銀座/新宿/福岡天神(開店準備中)、
Lashé 渋谷/大宮、Karada 新宿/横浜(改装中)、Reposer 銀座/心斎橋、Blanc 表参道/神戸三宮）。
各店舗は id・店名・エリア・都道府県・開業年・スタッフ数・席数・status(open/renovation/opening)・店長名を持つ。
決済代行8種: 現金(手数料0/即時)、Square(3.25%/翌営業日)、Stripe(3.6%/週次)、PayPay(1.98%/月次)、
楽天ペイ(3.24%/月2回)、交通系IC・iD・QUICPay(2.95%/月次)、サブスク口座振替(2.9%/毎月10日)、
前受金消化(0%/役務提供時計上)。
集客媒体: ホットペッパービューティー・minimo(paid)、Instagram・LINE公式・自社サイト(owned)、
Google MEO(organic)、ご紹介(referral)。
業態別プロファイル（モック生成のパラメータ）: 客単価（hair 7,200/nail 8,600/eyelash 6,600/
relax 6,100/osteopathy 5,600/esthetic 22,000 円）、月間客数/店、店販比率、サブスク比率、
リピート率、キャンセル率、原価率、人件費率、家賃率、広告費率、決済手段構成比、
主要メニュー群（hair: カット/カラー/パーマ/トリートメント/ヘッドスパ/店販 等）。

■ 主要ドメイン型（src/lib/types.ts の骨子）
- StoreMonth（店舗×月の基本ファクト）: 技術/店販/サブスク/その他売上、客数、新規客数、予約数、
  キャンセル数、無断キャンセル数、原価、費用内訳{人件費/家賃/水道光熱/広告/決済手数料/減価償却/その他}
- Settlement（入金予定）: 決済代行・総額・手数料・純額・入金日・status(scheduled/paid/delayed)
- ReconItem（突合）: 売上記録額 vs 実入金額・status(matched/investigating/unmatched)・メモ
- Kpi: { key, label, value, delta（対比較期間の増減率）, format("yen"|"yenCompact"|"number"|"percent"|"decimal"), spark?, hint? }

■ 品質基準（毎フェーズ共通）
- npm run build がエラー・警告なしで通ること。TypeScript strict でエラーゼロ。
- ライト/ダーク両テーマで崩れないこと。モバイル（スマホはドロワーナビ）〜PCのレスポンシブ。
- SSR とクライアントでモック数値が一致（ハイドレーションエラーなし）。
- ハードコードの見た目数値ではなく、必ず src/lib/data のセレクター経由で描画する。

各フェーズ完了時には、変更したファイル一覧と npm run build の結果を報告してください。
理解したら「準備OK」とだけ返答してください。まだコードは書かないでください。
```

---

## 画面一覧（全 22 ルート）

フェーズプロンプト内で参照する画面仕様の一覧です。サイドバーは以下の 6 グループ構成。

| グループ | ルート | 画面 | 内容 |
|---|---|---|---|
| 経営概況 | `/` | ダッシュボード | 全社KPI 8枚（売上/営業利益/客数/客単価/リピート率/稼働率/キャンセル率/新規）＋スパークライン、売上推移（単月選択時は日次＋着地見込みの点線）、要対応アラート（異常自動検知）、ブランド別構成ドーナツ、決済手段別、本日の状況、店舗ランキング |
| 経営概況 | `/budget` | 予実・目標 | 業態別・店舗別の予算設定と実績進捗、達成率、着地見込（`lib/budget.ts`＋`BudgetBoard`） |
| 分析 | `/sales` | 売上・実績 | ブランド／メニュー／スタッフ別売上、新規/リピート推移、予約ヒートマップ（曜日×時間帯）、指名率・再来率 |
| 分析 | `/customers` | 顧客分析 | アクティブ顧客・LTV・解約率・RFMセグメント（マトリクス）、サブスク会員/MRR、前受金（役務）残高 |
| 分析 | `/marketing` | マーケティング | 媒体別広告費・新規獲得・CPA・ROAS、集客推移、LINE公式/CRM 配信効果（配信数・開封・予約転換） |
| 財務・資金 | `/cashflow` | 資金繰り | 現金の動き、決済代行別入金スケジュール（入金済/予定/遅延）、手数料比較、前受金残高、サブスクMRR |
| 財務・資金 | `/reconciliation` | 入金・突合 | 売上記録と実入金の差異検出、一致/確認中/未解決のステータス管理、決済手段別突合サマリ |
| 財務・資金 | `/financials` | 財務・PL | 月次損益計算書（構成比・前年比付き）、損益分岐点分析、費用構成、ブランド/店舗別損益 |
| 財務・資金 | `/funding` | 資金調達・税務 | 借入一覧・返済予定表、補助金・助成金、消費税（簡易試算）の見込み |
| 運営 | `/inventory` | 在庫・発注 | 在庫金額、発注点アラート、原価率、棚卸差異/ロス管理 |
| 運営 | `/cancellations` | キャンセル料 | 無断/直前キャンセルの請求・回収率、常習者リスト、機会損失額 |
| 運営 | `/labor` | 人時生産性・シフト | 人時生産性、需要予測×適正人員シミュレーション、歩合の状況 |
| 業態別 | `/courses` | 役務・コース（エステ） | 前受金残高・消化スケジュール、中途解約・クーリングオフ、信販（立替払い）管理 |
| 業態別 | `/insurance` | 保険診療・療養費（整体） | 保険/自費の売上区分、療養費請求・返戻、入金遅延（レセプト） |
| 業態別 | `/stylists` | スタイリスト・歩合（ヘア） | 指名売上・ランク別歩合、面貸し/業務委託の管理 |
| 業態別 | `/membership` | 定額制・回転（ネイル/アイラッシュ） | 通い放題プラン損益、回転率、リペア率 |
| 業態別 | `/relax` | 施術・委託（リラク） | 資格区分（あん摩マッサージ等）、分単位の施術売上、委託分配 |
| 店舗・レポート | `/stores` | 店舗管理 | 16店舗の横並び比較（売上/利益率/成長率/人時生産性）、ソート可能テーブル |
| 店舗・レポート | `/stores/[id]` | 店舗詳細 | 店舗単体のKPI・推移・費用構成・出店投資ROI（回収期間） |
| 店舗・レポート | `/franchise` | FC・のれん分け | 加盟店別PL、ロイヤリティ計算・入金状況 |
| 店舗・レポート | `/reports` | レポート出力 | 月次経営レポート自動生成（印刷=PDF出力）、役員会/税理士提出資料テンプレート |
| 店舗・レポート | `/settings` | 設定・連携 | Salon One 連携方式の説明（REST/Webhook/CSV/共有DB）、データ連携マッピング表、ロール別権限（経営者/エリアマネージャー/経理財務/税理士閲覧） |

---

## フェーズ 1 — プロジェクト基盤（土台）

```text
フェーズ1として、プロジェクトの土台を作ってください。まだ個別ページは作りません。

1. Next.js 14 + TypeScript(strict) + Tailwind のプロジェクトを手動で scaffold
   （package.json / tsconfig.json / next.config.mjs / postcss.config.mjs /
    tailwind.config.ts / .nvmrc(20) / .gitignore）。
   依存: next@^14.2, react@^18.3, recharts@^2.13, lucide-react, clsx, tailwind-merge。
2. tailwind.config.ts にマスタープロンプトの brand/gold カラー、rounded-card(16px)、
   shadow(soft/card/pop/focus)、fade-in/fade-up/scale-in/shimmer アニメーションを定義。
3. src/app/globals.css にデザインシステムを実装
   （.card/.panel/.btn 系/.badge 系/.input/.select/.nav-link/.th/.td/.row-hover/
    .skeleton/.tnum/.stagger、印刷スタイル、reduced-motion 対応）。
4. src/lib に cn.ts / types.ts / filters.ts / format.ts / colors.ts / nav.ts / csv.ts を実装。
   - format.ts: 円の日本式圧縮表記（1.2億円・3,450万円）、%表記、前月比の符号付き表記、YYYY年M月。
   - nav.ts: 画面一覧どおりの6グループのナビ定義と、ロール別アクセス（owner=全部,
     area=分析・運営・店舗系, finance=財務・レポート系, viewer=財務・レポート閲覧のみ）。
5. src/lib/data に random.ts（シード付き決定論的乱数）、catalog.ts（マスタ）、
   generate.ts（店舗×月の StoreMonth を 2024-06〜2026-06 分生成。業態プロファイル×季節性×
   成長トレンド×店舗個体差で現実的な数値にする）、index.ts（まず getCatalog / getOverview /
   getAlerts の3つだけ実装）を作成。
6. src/components/layout に AppShell / Sidebar（グループ見出し付き・折りたたみ可・
   アクティブ強調・スマホはドロワー）/ Topbar（ページタイトル・テーマ切替・通知ベル・
   ロール切替のUI）/ FilterBar（期間/ブランド/店舗/比較を URL クエリに反映。
   ブランドを変えると店舗の選択肢が絞り込まれる）/ Logo / ThemeToggle を実装。
   providers/UiPrefs でテーマ等を localStorage 保持し、app/layout.tsx に
   ダークモードちらつき防止のインラインスクリプトを入れる。
7. src/components/ui に Card / StatCard（値・増減バッジ・スパークライン）/ ChartCard /
   PageHeader / PrintButton / primitives を、components/charts に Recharts の
   TrendChart（エリア）/ BarsChart / DonutChart / Sparkline のラッパー（"use client"）を実装。
   グラフのツールチップ・軸はダークモードでも読めるようにテーマ対応する。
8. src/app/(app)/layout.tsx で AppShell を適用し、(app)/page.tsx は仮のプレースホルダでよい。
   loading.tsx / error.tsx / not-found.tsx も用意。

完了条件: npm run build が通り、http://localhost:3000 でサイドバー・トップバー・
フィルタバーが表示され、ライト/ダーク切替が機能すること。
```

## フェーズ 2 — ダッシュボード本体と API

```text
フェーズ2として、トップのダッシュボードと API を実装してください。

1. src/lib/data/index.ts の getOverview(filters) を本実装:
   KPI 8枚（総売上・営業利益・客数・客単価・リピート率・稼働率・キャンセル率・新規客数。
   各 delta は比較期間比、spark は直近12ヶ月）、売上推移（複数月期間=月次、単月=日次で
   実績＋残日数の着地見込み）、ブランド別売上構成、決済手段別構成、本日の状況
   （予約数・来店・売上速報）、店舗ランキング（売上/成長率）。
2. getAlerts(): 異常自動検知のアラート配列
   （売上急減店舗、営業赤字店舗、突合未解決、入金遅延、在庫発注点割れ、キャンセル率上昇など、
   severity: danger/warning/info と対象リンク付き）。
3. (app)/page.tsx をサーバーコンポーネントで実装。レイアウトは
   KPIグリッド（2×4）→ 売上推移（大）＋要対応アラート（右列）→
   ブランド構成ドーナツ・決済手段・本日の状況 → 店舗ランキングテーブル。
   ページ右上に期間ラベルと PDF出力ボタン。
4. src/app/api/[resource]/route.ts を実装。resource（overview/alerts/catalog）を
   セレクターにディスパッチして JSON を返す。未知の resource は 404。
   クエリパラメータは parseFilters で解釈（画面と同一のフィルタ仕様）。

完了条件: ダッシュボードが全ウィジェット表示され、フィルタ変更（期間・ブランド・店舗・比較）で
全数値・グラフが連動して変わること。/api/overview が JSON を返すこと。
```

## フェーズ 3 — 分析系ページ（sales / customers / marketing）

```text
フェーズ3として、分析系3ページとセレクターを実装してください。
API ルートの resource（sales/customers/marketing）も対応させます。

1. /sales（getSales）: 売上KPI、ブランド別・店舗別売上バー、メニュー群別構成
   （業態フィルタに応じてマスタの MENU_GROUPS を使用）、スタッフ別売上ランキング
   （指名率・再来率付き）、新規/リピート推移の積み上げ、予約ヒートマップ
   （曜日×営業時間帯 10:00-20:00、components/charts/Heatmap.tsx を新規作成）。
2. /customers（getCustomers）: アクティブ顧客数・平均LTV・解約率・来店頻度のKPI、
   RFM セグメントのマトリクス（Recency×Frequency の3×3、優良/安定/離反リスク等の
   セグメント名とアクション提案）、サブスク会員数と MRR 推移、前受金（役務）残高推移、
   新規顧客の獲得チャネル内訳。
3. /marketing（getMarketing）: 広告費合計・新規獲得数・平均CPA・ROAS のKPI、
   媒体別テーブル（費用/新規数/CPA/ROAS/前期比）、集客推移（媒体別積み上げ）、
   LINE公式・CRM 配信効果（配信数・開封率・クリック・予約転換・配信経由売上）。

3ページとも: サーバーコンポーネント、グローバルフィルタ連動、StatCard/ChartCard/
SortableTable（ソート可能テーブルを components/ui に新規実装）を再利用、PDF出力対応。
完了条件: npm run build が通り、3ページがフィルタ連動で動くこと。
```

## フェーズ 4 — 財務・資金系ページ（cashflow / reconciliation / financials / funding / budget）

```text
フェーズ4として、財務・資金系5ページを実装してください。API の resource も追随させます。

1. /cashflow（getCashflow）: 現金残高の推移と月内の入出金、決済代行別の入金スケジュール
   テーブル（入金日・総額・手数料・純額・status: 入金済/予定/遅延バッジ）、
   決済代行別の手数料率比較、前受金残高、サブスク MRR。
2. /reconciliation（getReconciliation）: 突合サマリKPI（一致率・差異総額・未解決件数）、
   差異明細テーブル（日付/店舗/決済手段/売上記録額/実入金額/差額/status/メモ）、
   決済手段別の突合状況、status フィルタ（一致/確認中/未解決）。
3. /financials（getFinancials）: 月次損益計算書（売上高〜売上総利益〜販管費内訳〜営業利益。
   金額・構成比・前年比の3列、.tnum で桁揃え）、損益分岐点分析（固定費/変動費率/
   損益分岐点売上高と現在売上の位置をビジュアル表示）、費用構成ドーナツ、
   ブランド別・店舗別の営業利益率比較。
4. /funding（getFunding）: 借入一覧（借入先/残高/金利/毎月返済/完済予定）、
   月次返済予定表、補助金・助成金のステータス管理、消費税の簡易試算
   （課税売上×税率−仕入税額の概算、納付予定）。
5. /budget（getBudget + src/lib/budget.ts + components/budget/BudgetBoard.tsx）:
   全社・業態別・店舗別の予算 vs 実績（達成率プログレスバー、着地見込み、残り営業日）、
   未達アラート、来月の推奨目標。

完了条件: npm run build が通り、5ページすべてフィルタ連動・ダークモード対応で表示されること。
```

## フェーズ 5 — 運営・店舗系ページ（inventory / cancellations / labor / stores / stores/[id] / franchise）

```text
フェーズ5として、運営系と店舗系の6ルートを実装してください。

1. /inventory（getInventory)）: 在庫金額KPI（材料/店販別）、発注点割れアラート付き
   在庫テーブル（品目/カテゴリ/在庫数/発注点/在庫金額/状態バッジ）、原価率推移、
   棚卸差異・ロス管理（廃棄/紛失/期限切れ）。
2. /cancellations（getCancellations）: キャンセル率・無断キャンセル・機会損失額・
   キャンセル料回収率のKPI、請求/回収状況テーブル、常習者リスト（回数・累計損失・対応状況）、
   曜日×時間帯のキャンセル傾向。
3. /labor（getLabor）: 人時生産性（売上÷総労働時間）の店舗比較、需要予測×適正人員の
   シミュレーション（曜日別の必要人数 vs 配置人数、過不足表示）、人件費率推移、歩合支給の状況。
4. /stores（getStores）: 16店舗の横並び比較テーブル（売上/前年比/営業利益率/客数/
   客単価/人時生産性/稼働率、SortableTable使用、行クリックで詳細へ）、
   ブランド別サマリカード、状態バッジ（開店準備中/改装中）。
5. /stores/[id]（getStoreDetail）: 店舗単体のKPI・売上/利益推移・費用構成・スタッフ生産性、
   出店投資ROI（初期投資額・累計回収・回収期間）。存在しない id は notFound()。
6. /franchise（getFranchise）: 直営/FC/のれん分けの区分、加盟店別PL（売上・ロイヤリティ・
   本部粗利）、ロイヤリティ請求・入金状況、加盟店ランキング。

完了条件: npm run build が通り、/stores の行クリックから店舗詳細に遷移できること。
```

## フェーズ 6 — 業態別ページ＋レポート＋設定＋仕上げ

```text
フェーズ6（最終）として、業態別5ページと reports / settings、全体の仕上げを行ってください。

1. /courses（getCourses・エステ向け）: 前受金（役務）残高KPIと月次推移、コース契約テーブル
   （契約額/消化率/残回数/失効見込）、中途解約・クーリングオフの返金管理、
   信販（立替払い）の入金予定。
2. /insurance（getInsurance・整体向け）: 保険診療/自費の売上構成、療養費の請求→入金
   サイクル（請求月/入金予定/遅延）、返戻（レセプト差し戻し）率と理由内訳、患者単価。
3. /stylists（getStylists・ヘア向け）: スタイリスト別の指名売上・指名率・ランク（歩合率）、
   歩合支給シミュレーション、面貸し/業務委託の管理（席数・利用料・稼働）。
4. /membership（getMembership・ネイル/アイラッシュ向け）: 定額制（通い放題）プランの
   会員数・MRR・利用回数分布と損益、席の回転率、リペア率・保証対応。
5. /relax（getRelax・リラク向け）: 資格区分別（有資格/無資格）の施術売上、
   分単価・稼働率、業務委託セラピストへの分配管理。
6. /reports: 月次経営レポートの自動生成プレビュー（当月サマリ・KPI・PL・店舗ランキング・
   アラートを1枚に集約した印刷向けレイアウト）と、役員会用/税理士提出用のテンプレート切替。
   PDF出力=window.print で、印刷時はレポート本文のみが出るようにする。
7. /settings: Salon One 連携方式の比較（REST API 推奨/Webhook/CSV バッチ/共有DB）、
   ダッシュボード項目↔Salon One 機能のデータ連携マッピング表、
   ロール別権限マトリクス（nav.ts の ACCESS と一致させる）、環境変数の説明
   （SALONONE_API_BASE_URL / SALONONE_API_TOKEN）。
8. 仕上げ:
   - CommandPalette（Cmd/Ctrl+K で全ページ検索・ジャンプ）と NotificationCenter
     （getAlerts をベル通知で表示）を Topbar に組み込む。
   - ExportCsvButton（主要テーブルを CSV ダウンロード）、AnimatedNumber、HelpHint
     （指標の定義をツールチップ表示）を主要ページに適用。
   - README.md を作成（概要・クイックスタート・技術スタック・画面一覧・
     連携の差し込み口の説明・Vercel デプロイ手順）。
   - 全ページを巡回して npm run build・ライト/ダーク・スマホ幅・印刷の最終確認。

完了条件: 全22ルートが動作し、npm run build がエラーゼロで完走すること。
```

---

## 検収チェックリスト

- [ ] `npm install && npm run build` がエラー・型エラーなしで完走する
- [ ] 全 22 ルートが表示される（404・ハイドレーションエラーなし）
- [ ] リロードしても数値が変わらない（決定論的モック）
- [ ] フィルタ（期間/ブランド/店舗/比較）が URL クエリに反映され、ページ遷移後も維持される
- [ ] ブランド選択で店舗プルダウンが絞り込まれる
- [ ] ライト/ダーク切替が全ページで崩れない（初回ロードのちらつきなし）
- [ ] スマホ幅でサイドバーがドロワーになる
- [ ] 各ページの「PDF出力」で管理 UI 抜きの資料が印刷プレビューされる
- [ ] `/api/overview` 等がページと同じ数値の JSON を返す
- [ ] データ取得がすべて `src/lib/data` のセレクター経由（ページ内で直接モックを作っていない）

## 移行先での Salon One 本連携

再構築後に実データへ切り替える際は、`src/lib/data/index.ts` の各セレクター内部だけを
Salon One API 呼び出し（`SALONONE_API_BASE_URL` / `SALONONE_API_TOKEN`）に差し替えてください。
戻り値の型（`src/lib/types.ts`）を保てば、画面・グラフ・レポートは無変更で動作します。
