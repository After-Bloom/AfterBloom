import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Match a mother with the psychologist or counsellor who has the fewest patients, so an elevated result always reaches a human. */
export async function assignPro(admin: SupabaseClient, motherId: string) {
  const { data: existing } = await admin.from("pro_patients").select("pro_id").eq("mother_id", motherId).limit(1);
  if (existing?.length) return existing[0].pro_id as string;
  const { data: pros } = await admin.from("pros").select("id, title").eq("accepting", true).in("title", ["Clinical psychologist", "Counsellor"]);
  if (!pros?.length) return null;
  const { data: counts } = await admin.from("pro_patients").select("pro_id");
  const load = new Map<string, number>();
  counts?.forEach((r) => load.set(r.pro_id, (load.get(r.pro_id) ?? 0) + 1));
  const pick = pros.sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))[0];
  await admin.from("pro_patients").upsert({ pro_id: pick.id, mother_id: motherId });
  return pick.id as string;
}

/** Put her in a small circle (about 15 to 20 mothers) born in the same month, same language, same city where possible. */
export async function assignCircle(admin: SupabaseClient, motherId: string, birthDate: string, city: string | null, lang: string, alias: string) {
  const cohort = birthDate.slice(0, 7) + "-01";
  const { data: circles } = await admin.from("circles").select("id, city, lang, circle_members(count)").eq("cohort_month", cohort).eq("lang", lang);
  const open = (circles ?? []).filter((c: any) => (c.circle_members?.[0]?.count ?? 0) < 20);
  let circle: any = open.find((c: any) => city && c.city === city) ?? open[0];
  if (!circle) {
    const label = new Date(cohort).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const { data } = await admin.from("circles").insert({ name: `Bloom Circle · ${label}`, city, lang, cohort_month: cohort }).select("id, city, lang").single();
    circle = data;
  }
  await admin.from("circle_members").upsert({ circle_id: circle.id, user_id: motherId, alias: alias.slice(0, 30) || "Mother" });
  await admin.from("mothers").update({ circle_id: circle.id }).eq("id", motherId);
  return circle.id as string;
}
