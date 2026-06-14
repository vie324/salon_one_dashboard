"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/lib/nav";

export type Density = "comfortable" | "compact";

interface UiPrefsCtx {
  role: Role;
  setRole: (r: Role) => void;
  density: Density;
  setDensity: (d: Density) => void;
}

const Ctx = createContext<UiPrefsCtx | null>(null);

export function UiPrefsProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("owner");
  const [density, setDensityState] = useState<Density>("comfortable");

  useEffect(() => {
    try {
      const r = localStorage.getItem("ui-role") as Role | null;
      const d = localStorage.getItem("ui-density") as Density | null;
      if (r) setRoleState(r);
      if (d) {
        setDensityState(d);
        document.documentElement.classList.toggle("compact", d === "compact");
      }
    } catch {
      /* ignore */
    }
  }, []);

  function setRole(r: Role) {
    setRoleState(r);
    try {
      localStorage.setItem("ui-role", r);
    } catch {
      /* ignore */
    }
  }
  function setDensity(d: Density) {
    setDensityState(d);
    document.documentElement.classList.toggle("compact", d === "compact");
    try {
      localStorage.setItem("ui-density", d);
    } catch {
      /* ignore */
    }
  }

  return <Ctx.Provider value={{ role, setRole, density, setDensity }}>{children}</Ctx.Provider>;
}

export function useUiPrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUiPrefs must be used within UiPrefsProvider");
  return c;
}
