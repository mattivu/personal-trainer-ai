import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  isValidBarcode,
  normalizeBarcode,
  toFoodProductSummary,
} from "@/lib/nutrition/barcode";
import {
  lookupOpenFoodFactsProductByBarcode,
  OpenFoodFactsLookupError,
} from "@/lib/nutrition/open-food-facts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ barcode: string }> }
) {
  const { barcode: rawBarcode } = await context.params;
  const barcode = normalizeBarcode(rawBarcode);

  if (!isValidBarcode(barcode)) {
    return NextResponse.json({ status: "invalid_barcode" }, { status: 400 });
  }

  try {
    const localProduct = await prisma.foodProduct.findUnique({
      where: {
        barcode,
      },
    });

    if (localProduct) {
      return NextResponse.json({
        status: "found",
        source: "local",
        product: toFoodProductSummary(localProduct),
      });
    }

    const openFoodFactsProduct = await lookupOpenFoodFactsProductByBarcode(barcode);

    if (!openFoodFactsProduct) {
      return NextResponse.json({
        status: "not_found",
        barcode,
      });
    }

    const savedProduct = await prisma.foodProduct.upsert({
      where: {
        barcode,
      },
      update: {
        name: openFoodFactsProduct.name,
        brand: openFoodFactsProduct.brand,
        servingSize: openFoodFactsProduct.servingSize,
        servingQuantity: openFoodFactsProduct.servingQuantity,
        servingUnit: openFoodFactsProduct.servingUnit,
        caloriesPer100g: openFoodFactsProduct.caloriesPer100g,
        proteinPer100g: openFoodFactsProduct.proteinPer100g,
        carbsPer100g: openFoodFactsProduct.carbsPer100g,
        fatPer100g: openFoodFactsProduct.fatPer100g,
        source: openFoodFactsProduct.source,
        sourceProductUrl: openFoodFactsProduct.sourceProductUrl,
        rawSource:
          openFoodFactsProduct.rawSource === null
            ? Prisma.JsonNull
            : (openFoodFactsProduct.rawSource as Prisma.InputJsonValue),
      },
      create: {
        barcode: openFoodFactsProduct.barcode,
        name: openFoodFactsProduct.name,
        brand: openFoodFactsProduct.brand,
        servingSize: openFoodFactsProduct.servingSize,
        servingQuantity: openFoodFactsProduct.servingQuantity,
        servingUnit: openFoodFactsProduct.servingUnit,
        caloriesPer100g: openFoodFactsProduct.caloriesPer100g,
        proteinPer100g: openFoodFactsProduct.proteinPer100g,
        carbsPer100g: openFoodFactsProduct.carbsPer100g,
        fatPer100g: openFoodFactsProduct.fatPer100g,
        source: openFoodFactsProduct.source,
        sourceProductUrl: openFoodFactsProduct.sourceProductUrl,
        rawSource:
          openFoodFactsProduct.rawSource === null
            ? Prisma.JsonNull
            : (openFoodFactsProduct.rawSource as Prisma.InputJsonValue),
      },
    });

    return NextResponse.json({
      status: "found",
      source: "open_food_facts",
      product: toFoodProductSummary(savedProduct),
    });
  } catch (error) {
    if (error instanceof OpenFoodFactsLookupError) {
      console.error("Barcode lookup external error", {
        barcode,
        statusCode: error.statusCode,
      });

      return NextResponse.json(
        { status: "external_error" },
        { status: error.statusCode }
      );
    }

    console.error("Barcode lookup GET error", {
      barcode,
      error,
    });

    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
