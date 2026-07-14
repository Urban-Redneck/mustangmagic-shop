import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const env = {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  if (!supabase) {
    return NextResponse.json({ env, error: "Supabase client is not configured." }, { status: 500 });
  }

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  const { data: sample, error: sampleError } = await supabase
    .from("products")
    .select("part_number, name, active, storefront_visible")
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(3);

  return NextResponse.json({
    env,
    activeProductCount: count,
    error: error?.message ?? null,
    sampleError: sampleError?.message ?? null,
    sample,
  });
}
