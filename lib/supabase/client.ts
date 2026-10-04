"use client";
import { createBrowserClient } from "@supabase/ssr";

// One browser client for the whole app. The publishable key is safe in the browser: Row Level Security guards the data.
let client: ReturnType<typeof createBrowserClient> | null = null;
export const supabase = () =>
  (client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!));
