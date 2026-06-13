"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function Splash() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("salonone-splash") === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    try {
      sessionStorage.setItem("salonone-splash", "1");
    } catch {
      /* ignore */
    }
    setPhase("in");
    const t1 = setTimeout(() => setPhase("out"), 1650);
    const t2 = setTimeout(() => setPhase("hidden"), 2250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-white via-white to-[#e9f4f1] transition-opacity duration-600",
        phase === "out" && "pointer-events-none opacity-0",
      )}
    >
      {/* soft brand glow */}
      <div
        aria-hidden
        className="absolute h-[460px] w-[460px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(15,118,110,0.14), transparent 70%)" }}
      />
      <div className="relative flex flex-col items-center px-6">
        <img
          src="/logo-splash.png"
          alt="Salon One"
          className="w-[260px] max-w-[68vw] animate-scale-in"
        />
        <div className="mt-9 h-[3px] w-44 overflow-hidden rounded-full bg-slate-200/70">
          <div
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-brand-500 to-gold-400"
            style={{ animation: "loadbar 1.5s cubic-bezier(.4,0,.2,1) forwards" }}
          />
        </div>
        <p
          className="mt-5 text-[11px] font-medium uppercase tracking-[0.32em] text-brand-700/70 animate-fade-in"
          style={{ animationDelay: ".4s" }}
        >
          経営ダッシュボード
        </p>
      </div>
    </div>
  );
}
