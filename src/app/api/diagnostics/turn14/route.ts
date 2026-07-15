import { NextResponse } from "next/server";
import {
  getTurn14Diagnostics,
  testTurn14TokenRequest,
} from "@/lib/turn14/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics = getTurn14Diagnostics();
  const token = await testTurn14TokenRequest();

  return NextResponse.json({
    ...diagnostics,
    token,
  });
}
