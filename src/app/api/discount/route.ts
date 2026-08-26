import { NextResponse, type NextRequest } from "next/server";
import {
  clearAppliedDiscount,
  setAppliedDiscount,
} from "@/lib/discounts/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const action = stringValue(formData.get("action")) ?? "apply";
  const returnTo = safeReturnPath(stringValue(formData.get("returnTo")));

  if (action === "clear") {
    await clearAppliedDiscount();
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const code = stringValue(formData.get("discountCode"));
  const discount = await setAppliedDiscount(code ?? "");
  const url = new URL(returnTo, request.url);
  url.searchParams.set(
    discount ? "discount" : "discountError",
    discount ? "applied" : "invalid",
  );

  return NextResponse.redirect(url, 303);
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : null;
}

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/cart";
  }

  return value;
}
