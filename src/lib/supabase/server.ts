import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabaseServerClient() {
  if (client !== undefined) {
    return client;
  }

  const url = getSupabaseProjectUrl();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    client = null;
    return client;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });

  return client;
}

export function getSupabaseProjectUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (url.hostname.endsWith(".supabase.co")) {
      return url.origin;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export function getSupabaseUrlDiagnostics() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const normalizedUrl = getSupabaseProjectUrl();

  return {
    raw: describeUrl(rawUrl),
    normalized: describeUrl(normalizedUrl),
  };
}

function describeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return {
      hostname: url.hostname,
      pathname: url.pathname,
      looksLikeProjectUrl: url.hostname.endsWith(".supabase.co") && url.pathname === "/",
      looksLikeDashboardUrl: url.hostname === "supabase.com" || url.hostname === "app.supabase.com",
    };
  } catch {
    return {
      hostname: null,
      pathname: null,
      looksLikeProjectUrl: false,
      looksLikeDashboardUrl: false,
    };
  }
}
