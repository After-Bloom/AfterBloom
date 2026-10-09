"use client";
import { FlaskConical } from "lucide-react";
import { useTr } from "@/lib/i18n";

/** The priority rules, time windows and the playbook are drafts until a clinician signs them off. The professional screens say so. */
export function DraftBadge() {
  const tr = useTr();
  return (
    <div className="mx-auto mb-3 flex max-w-5xl justify-end">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-3 py-1 text-xs font-bold text-warn"><FlaskConical className="h-3.5 w-3.5" aria-hidden />{tr("Draft clinical rules, awaiting clinician sign-off")}</span>
    </div>
  );
}
