import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '(unset)',
    anonKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleSet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    turn14ClientIdSet: !!process.env.TURN14_CLIENT_ID,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '(unset)',
    freeShippingThreshold: process.env.FREE_SHIPPING_THRESHOLD || '(unset)',
  });
}
