import type { FoodProduct } from "@prisma/client";

export const BARCODE_MIN_LENGTH = 6;
export const BARCODE_MAX_LENGTH = 18;

const BARCODE_PATTERN = new RegExp(`^\\d{${BARCODE_MIN_LENGTH},${BARCODE_MAX_LENGTH}}$`);

export type FoodProductSource = "open_food_facts" | "user";

export type FoodProductSummary = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  servingSize: string | null;
  servingQuantity: number | null;
  servingUnit: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  source: string;
};

export type NormalizedFoodProduct = Omit<FoodProductSummary, "id"> & {
  source: FoodProductSource;
  sourceProductUrl: string | null;
  rawSource: {
    code: string;
    product_name: string | null;
    brands: string | null;
    serving_size: string | null;
    serving_quantity: number | null;
    serving_quantity_unit: string | null;
    nutriments: {
      "energy-kcal_100g": number | null;
      energy_100g: number | null;
      proteins_100g: number | null;
      carbohydrates_100g: number | null;
      fat_100g: number | null;
    };
    url: string | null;
  } | null;
};

export function normalizeBarcode(value: string) {
  return value.trim();
}

export function isValidBarcode(value: string) {
  return BARCODE_PATTERN.test(normalizeBarcode(value));
}

export function toFoodProductSummary(
  product: Pick<
    FoodProduct,
    | "id"
    | "barcode"
    | "name"
    | "brand"
    | "servingSize"
    | "servingQuantity"
    | "servingUnit"
    | "caloriesPer100g"
    | "proteinPer100g"
    | "carbsPer100g"
    | "fatPer100g"
    | "source"
  >
): FoodProductSummary {
  return {
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    servingSize: product.servingSize,
    servingQuantity: product.servingQuantity,
    servingUnit: product.servingUnit,
    caloriesPer100g: product.caloriesPer100g,
    proteinPer100g: product.proteinPer100g,
    carbsPer100g: product.carbsPer100g,
    fatPer100g: product.fatPer100g,
    source: product.source,
  };
}
