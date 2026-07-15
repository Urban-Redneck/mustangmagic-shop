import { NextResponse, type NextRequest } from "next/server";
import { syncTurn14Tracking } from "@/lib/orders/tracking";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const result = await syncTurn14Tracking({
    startDate: stringValue(searchParams.get("start_date")),
    endDate: stringValue(searchParams.get("end_date")),
  });

  return NextResponse.json(result, {
    status: result.status === "failed" ? 502 : 200,
  });
}

function stringValue(value: string | null) {
  return value && value.trim() ? value.trim() : undefined;
}
