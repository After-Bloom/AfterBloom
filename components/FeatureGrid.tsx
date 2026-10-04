"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { navFor } from "@/lib/features";
import { useTr } from "@/lib/i18n";

export function FeatureGrid() {
  const { s } = useApp();
  const tr = useTr();
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {navFor(s.role).map((f) => (
        <Link key={f.href} href={f.href} className="card flex flex-col gap-2">
          <f.icon className="h-7 w-7 text-plum-600" />
          <div className="font-semibold leading-tight">{tr(f.title)}{f.tag && <span className="ml-1.5 rounded-full bg-plum-100 px-1.5 py-0.5 text-[10px] uppercase text-plum-700">{tr(f.tag)}</span>}</div>
          <div className="text-sm leading-snug text-plum-900/60">{tr(f.desc)}</div>
        </Link>
      ))}
    </div>
  );
}
