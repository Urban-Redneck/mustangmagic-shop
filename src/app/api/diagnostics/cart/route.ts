import { NextResponse } from "next/server";
import { getCartItems } from "@/lib/cart/server";
import { getCheckoutProductsByIds } from "@/lib/checkout/products";

export const dynamic = "force-dynamic";

export async function GET() {
  const cartItems = await getCartItems();
  const products = await getCheckoutProductsByIds(
    cartItems.map((item) => item.productId),
  );
  const productById = new Map(products.map((product) => [product.id, product]));

  const rows = cartItems.map((item) => {
    const product = productById.get(item.productId) ?? null;
    return {
      productId: item.productId,
      quantity: item.quantity,
      product: product
        ? {
            partNumber: product.partNumber,
            name: product.name,
            price: product.price,
            purchaseCost: product.purchaseCost,
            inventoryStatus: product.inventoryStatus,
            canPurchase: product.canPurchase,
            hasTurn14Id: Boolean(product.turn14Id),
          }
        : null,
    };
  });

  return NextResponse.json({
    cartItemCount: rows.length,
    canCheckout:
      rows.length > 0 && rows.every((row) => row.product?.canPurchase === true),
    rows,
  });
}
