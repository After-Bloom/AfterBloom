"use client";
import { Moon, Sun } from "lucide-react";
import { FeatureGrid } from "@/components/FeatureGrid";
import { PageHead } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTr } from "@/lib/i18n";

export default function More() {
  const tr = useTr();
  const { dark, toggle } = useTheme();
  return (
    <>
      <PageHead title="Everything in AfterBloom" />
      {/* phones have no room for this in the header */}
      <div className="card mb-5 flex flex-wrap items-center gap-3 md:hidden">
        <button onClick={toggle} aria-pressed={dark} className="btn-soft">{dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}{dark ? tr("Switch to light mode") : tr("Switch to dark mode")}</button>
      </div>
      <FeatureGrid />
    </>
  );
}
