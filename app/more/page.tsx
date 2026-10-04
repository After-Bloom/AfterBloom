"use client";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { FeatureGrid } from "@/components/FeatureGrid";
import { PageHead } from "@/components/ui";
import { useApp, Role } from "@/lib/store";
import { HOME_BY_ROLE } from "@/lib/features";
import { useTheme } from "@/lib/theme";
import { useTr } from "@/lib/i18n";

export default function More() {
  const { s, set } = useApp();
  const router = useRouter();
  const tr = useTr();
  const { dark, toggle } = useTheme();
  const switchRole = (r: Role) => { set((p) => ({ ...p, role: r })); router.push(HOME_BY_ROLE[r]); };
  return (
    <>
      <PageHead title="Everything in AfterBloom" />
      {/* phones have no room for these in the header */}
      <div className="card mb-5 flex flex-wrap items-center gap-3 sm:hidden">
        <button onClick={toggle} aria-pressed={dark} className="btn-soft">{dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}{dark ? tr("Switch to light mode") : tr("Switch to dark mode")}</button>
        <select aria-label={tr("View as")} value={s.role} onChange={(e) => switchRole(e.target.value as Role)} className="input !w-auto">
          <option value="mother">{tr("View: Mother")}</option><option value="family">{tr("View: Family")}</option><option value="pro">{tr("View: Professional")}</option>
        </select>
      </div>
      <FeatureGrid />
    </>
  );
}
