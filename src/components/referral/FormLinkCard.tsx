"use client";

// 公開フォームの URL を表示・コピーするカード。
// 配布先（紹介者さま）に共有する URL はここからコピーできます。

import { Check, Copy, ExternalLink, Link2, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/primitives";

export function FormLinkCard({ path, className }: { path: string; className?: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  // 実際に配信されているドメイン（Vercel の本番/プレビュー、localhost）を反映します。
  useEffect(() => setOrigin(window.location.origin), []);

  const url = origin ? `${origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* クリップボードが使えない環境では手動でコピーしてください */
    }
  }

  return (
    <Card className={className}>
      <CardHeader
        title="お客様用フォームのURL"
        subtitle="紹介者さまにこのURLを共有してください"
        icon={<Link2 className="h-[18px] w-[18px]" />}
        actions={
          <a href={path} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm print:hidden">
            <ExternalLink className="h-3.5 w-3.5" />
            開く
          </a>
        }
      />
      <div className="px-5 pb-5 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="input w-full font-mono text-[13px]"
            aria-label="フォームのURL"
          />
          <button onClick={copy} className="btn btn-primary btn-md shrink-0 print:hidden">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "コピーしました" : "URLをコピー"}
          </button>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-slate-400">
          <QrCode className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          このページはログイン不要で開けます。名刺・LINE・DM・店頭POP（QRコード）などに掲載してご利用ください。
        </p>
      </div>
    </Card>
  );
}
