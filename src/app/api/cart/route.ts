import { NextResponse, type NextRequest } from "next/server";
import {
  addCartItem,
  getCartItems,
  parseQuantity,
  setCartItems,
  updateCartItem,
} from "@/lib/cart/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const action = stringValue(formData.get("action")) ?? "add";
  const productId = stringValue(formData.get("productId"));
  const quantity = parseQuantity(formData.get("quantity"));
  const returnTo = safeReturnPath(stringValue(formData.get("returnTo")));

  if (action === "clear") {
    await setCartItems([]);
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  if (!productId) {
    return NextResponse.redirect(new URL("/cart", request.url), 303);
  }

  if (quantity === null) {
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const currentItems = await getCartItems();
  const nextItems =
    action === "remove"
      ? currentItems.filter((item) => item.productId !== productId)
      : action === "update"
        ? updateCartItem(currentItems, productId, quantity)
        : addCartItem(currentItems, productId, quantity);

  await setCartItems(nextItems);

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
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
