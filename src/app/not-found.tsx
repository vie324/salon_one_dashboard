import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="ja">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", color: "#0f172a" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, letterSpacing: "0.2em", color: "#0f766e", fontWeight: 600 }}>SALON ONE</p>
            <h1 style={{ fontSize: 56, fontWeight: 800, margin: "8px 0" }}>404</h1>
            <p style={{ color: "#64748b", marginBottom: 20 }}>ページが見つかりませんでした。</p>
            <Link href="/" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 10, background: "#0f766e", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
              ダッシュボードへ戻る
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
