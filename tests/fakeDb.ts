// A tiny in-memory stand-in for the Supabase client, just big enough for recordSignal(): select / insert / update with eq, gte, lte,
// order, limit, single and maybeSingle, plus the unique index on signals (origin_table, origin_id, code) and the one-open-case index on cases.
type Row = Record<string, any>;
type Filter = (r: Row) => boolean;

export function fakeDb(seed: Record<string, Row[]> = {}, opts: { failTables?: string[] } = {}) {
  const tables: Record<string, Row[]> = { signals: [], ...seed };
  let n = 0;
  const from = (name: string) => {
    let filters: Filter[] = [], op: "select" | "insert" | "update" | "upsert" = "select", payload: Row = {}, order: { col: string; asc: boolean } | null = null, max = Infinity, mode: "many" | "single" | "maybe" = "many";
    const q: any = {
      select: () => q,
      insert: (row: Row) => { op = "insert"; payload = row; return q; },
      update: (row: Row) => { op = "update"; payload = row; return q; },
      upsert: (row: Row) => { op = "upsert"; payload = row; return q; },
      eq: (c: string, v: any) => { filters.push((r) => r[c] === v); return q; },
      gte: (c: string, v: any) => { filters.push((r) => r[c] >= v); return q; },
      lte: (c: string, v: any) => { filters.push((r) => r[c] <= v); return q; },
      lt: (c: string, v: any) => { filters.push((r) => r[c] < v); return q; },
      neq: (c: string, v: any) => { filters.push((r) => r[c] !== v); return q; },
      in: (c: string, v: any[]) => { filters.push((r) => v.includes(r[c])); return q; },
      is: (c: string, v: any) => { filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return q; },
      order: (c: string, o?: { ascending?: boolean }) => { order = { col: c, asc: o?.ascending !== false }; return q; },
      limit: (x: number) => { max = x; return q; },
      single: () => { mode = "single"; return q; },
      maybeSingle: () => { mode = "maybe"; return q; },
      then: (ok: any, bad: any) => Promise.resolve(run()).then(ok, bad),
    };
    const run = () => {
      if (opts.failTables?.includes(name)) return { data: null, error: { message: `relation "${name}" does not exist`, code: "42P01" } };
      const rows = (tables[name] ??= []);
      let out: Row[];
      if (op === "insert") {
        if (name === "signals" && rows.some((r) => r.origin_table === payload.origin_table && r.origin_id === payload.origin_id && r.code === payload.code))
          return { data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" } };
        if (name === "consent_requests" && rows.some((r) => r.case_id === payload.case_id && r.family_member_id === payload.family_member_id))
          return { data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" } };
        if (name === "cases" && payload.status !== "resolved" && rows.some((r) => r.status !== "resolved" && r.mother_id === payload.mother_id && r.subject === payload.subject && r.concern === payload.concern))
          return { data: null, error: { message: "duplicate key value violates unique constraint one_open_case", code: "23505" } };
        const row = { id: payload.id ?? `row${++n}`, created_at: new Date().toISOString(), case_id: null, reopened_count: 0, ...payload };
        rows.push(row);
        out = [row];
      } else if (op === "upsert") {
        const hit = rows.find((r) => (payload.id && r.id === payload.id) || (payload.pro_id && r.pro_id === payload.pro_id && r.mother_id === payload.mother_id) || (payload.case_id && payload.pro_id === undefined && r.case_id === payload.case_id && r.mother_id === payload.mother_id));
        if (hit) Object.assign(hit, payload); else rows.push({ id: payload.id ?? `row${++n}`, ...payload });
        out = [hit ?? rows[rows.length - 1]];
      } else if (op === "update") {
        out = rows.filter((r) => filters.every((f) => f(r)));
        out.forEach((r) => Object.assign(r, payload));
      } else out = rows.filter((r) => filters.every((f) => f(r)));
      if (order) out = [...out].sort((a, b) => (a[order!.col] < b[order!.col] ? -1 : a[order!.col] > b[order!.col] ? 1 : 0) * (order!.asc ? 1 : -1));
      out = out.slice(0, max).map((r) => ({ ...r }));
      if (mode === "many") return { data: out, error: null };
      if (mode === "single") return out.length ? { data: out[0], error: null } : { data: null, error: { message: "no rows", code: "PGRST116" } };
      return { data: out[0] ?? null, error: null };
    };
    return q;
  };
  return { client: { from } as any, tables };
}
