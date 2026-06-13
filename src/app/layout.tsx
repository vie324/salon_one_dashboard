import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Salon One 経営ダッシュボード",
    template: "%s | Salon One 経営ダッシュボード",
  },
  description:
    "複数ブランド・多店舗サロンの経営判断のための統合ダッシュボード。売上/実績、資金繰り、入金突合、PL、レポート自動作成。",
  applicationName: "Salon One 経営ダッシュボード",
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

// Avoid theme flash: apply the saved/system theme before first paint.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
