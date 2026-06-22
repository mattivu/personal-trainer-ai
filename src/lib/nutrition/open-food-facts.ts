import { isValidBarcode, normalizeBarcode, type NormalizedFoodProduct } from "@/lib/nutrition/barcode";

const OPEN_FOOD_FACTS_BASE_URL = "https://world.openfoodfacts.org/api/v2/product";
const OPEN_FOOD_FACTS_TIMEOUT_MS = 8000;
const OPEN_FOOD_FACTS_USER_AGENT = "PersonalTrainerAI/0.1 (contact: sitiamo.it)";
const OPEN_FOOD_FACTS_FIELDS = [
  "code",
  "product_name",
  "brands",
  "serving_size",
  "serving_quantity",
  "serving_quantity_unit",
  "nutriments",
  "url",
] as const;

type OpenFoodFactsApiResponse = {
  status?: number;
  product?: {
    code?: unknown;
    product_name?: unknown;
    brands?: unknown;
    serving_size?: unknown;
    serving_quantity?: unknown;
    serving_quantity_unit?: unknown;
    nutriments?: Record<string, unknown> | null;
    url?: unknown;
  };
};

export class OpenFoodFactsLookupError extends Error {
  statusCode: 502 | 503;

  constructor(message: string, statusCode: 502 | 503) {
    super(message);
    this.name = "OpenFoodFactsLookupError";
    this.statusCode = statusCode;
  }
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parseOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNutrition(product: NonNullable<OpenFoodFactsApiResponse["product"]>) {
  const nutriments = product.nutriments ?? {};
  const directCalories = parseOptionalNumber(nutriments["energy-kcal_100g"]);
  const energyKilojoules = parseOptionalNumber(nutriments.energy_100g);

  return {
    caloriesPer100g:
      directCalories ?? (typeof energyKilojoules === "number" ? energyKilojoules / 4.184 : null),
    proteinPer100g: parseOptionalNumber(nutriments.proteins_100g),
    carbsPer100g: parseOptionalNumber(nutriments.carbohydrates_100g),
    fatPer100g: parseOptionalNumber(nutriments.fat_100g),
    rawNutriments: {
      "energy-kcal_100g": directCalories,
      energy_100g: energyKilojoules,
      proteins_100g: parseOptionalNumber(nutriments.proteins_100g),
      carbohydrates_100g: parseOptionalNumber(nutriments.carbohydrates_100g),
      fat_100g: parseOptionalNumber(nutriments.fat_100g),
    },
  };
}

function normalizeOpenFoodFactsProduct(
  barcode: string,
  product: NonNullable<OpenFoodFactsApiResponse["product"]>
): NormalizedFoodProduct {
  const nutrition = normalizeNutrition(product);

  return {
    barcode,
    name: parseOptionalString(product.product_name) ?? "Prodotto senza nome",
    brand: parseOptionalString(product.brands),
    servingSize: parseOptionalString(product.serving_size),
    servingQuantity: parseOptionalNumber(product.serving_quantity),
    servingUnit: parseOptionalString(product.serving_quantity_unit),
    caloriesPer100g: nutrition.caloriesPer100g,
    proteinPer100g: nutrition.proteinPer100g,
    carbsPer100g: nutrition.carbsPer100g,
    fatPer100g: nutrition.fatPer100g,
    source: "open_food_facts",
    sourceProductUrl: parseOptionalString(product.url),
    rawSource: {
      code: parseOptionalString(product.code) ?? barcode,
      product_name: parseOptionalString(product.product_name),
      brands: parseOptionalString(product.brands),
      serving_size: parseOptionalString(product.serving_size),
      serving_quantity: parseOptionalNumber(product.serving_quantity),
      serving_quantity_unit: parseOptionalString(product.serving_quantity_unit),
      nutriments: nutrition.rawNutriments,
      url: parseOptionalString(product.url),
    },
  };
}

export async function lookupOpenFoodFactsProductByBarcode(barcode: string) {
  const normalizedBarcode = normalizeBarcode(barcode);

  if (!isValidBarcode(normalizedBarcode)) {
    throw new TypeError("Invalid barcode.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPEN_FOOD_FACTS_TIMEOUT_MS);
  const url = new URL(`${OPEN_FOOD_FACTS_BASE_URL}/${normalizedBarcode}`);
  url.searchParams.set("fields", OPEN_FOOD_FACTS_FIELDS.join(","));

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": OPEN_FOOD_FACTS_USER_AGENT,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new OpenFoodFactsLookupError("Open Food Facts request timed out.", 503);
    }

    throw new OpenFoodFactsLookupError("Open Food Facts request failed.", 503);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new OpenFoodFactsLookupError("Open Food Facts returned an invalid response.", 502);
  }

  let payload: OpenFoodFactsApiResponse;

  try {
    payload = (await response.json()) as OpenFoodFactsApiResponse;
  } catch {
    throw new OpenFoodFactsLookupError("Open Food Facts response was not valid JSON.", 502);
  }

  if (payload.status === 0 || !payload.product) {
    return null;
  }

  return normalizeOpenFoodFactsProduct(normalizedBarcode, payload.product);
}
