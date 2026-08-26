export const MINIMUM_MARGIN_PERCENT = 10;

export function hasMinimumMargin(
  sellPrice: number | null,
  purchaseCost: number | null,
) {
  if (sellPrice === null || sellPrice <= 0 || purchaseCost === null) {
    return false;
  }

  return marginPercent(sellPrice, purchaseCost) >= MINIMUM_MARGIN_PERCENT;
}

export function marginPercent(sellPrice: number, purchaseCost: number) {
  return ((sellPrice - purchaseCost) / sellPrice) * 100;
}

export function minimumSellPriceCents(purchaseCostCents: number | null) {
  if (purchaseCostCents === null) {
    return null;
  }

  return Math.ceil(purchaseCostCents / (1 - MINIMUM_MARGIN_PERCENT / 100));
}
