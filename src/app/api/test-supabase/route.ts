import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl) return NextResponse.json({ error: 'No Supabase URL' });
  
  // Direct test fetch to Supabase REST
  let result: any = {};
  try {
    const params = new URLSearchParams();
    params.set('select', 'id,sku,name,price');
    params.set('active', 'eq.true');
    params.set('limit', '3');

    const url = `${supabaseUrl}/rest/v1/products?${params.toString()}`;
    
    const res = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
    });
    
    const text = await res.text();
    let data: any[] | string;
    try { data = JSON.parse(text); } catch { data = text; }
    
    result = { status: res.status, count: Array.isArray(data) ? data.length : 'error', sample: Array.isArray(data) ? data : null, raw_length: text.length };
  } catch (e: any) {
    result = { error: e.message, stack: e.stack };
  }

  return NextResponse.json({
    supabaseUrl,
    anonKeySet: !!anonKey,
    results: result,
  });
}
