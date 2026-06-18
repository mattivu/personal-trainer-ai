const NUTRITION_TIME_ZONE = "Europe/Rome";

function getDateFormatter() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NUTRITION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPartsDateKey(date: Date) {
  const parts = getDateFormatter().formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDate() {
  return formatPartsDateKey(new Date());
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return formatPartsDateKey(new Date(`${value}T12:00:00Z`)) === value;
}

export function isFutureDateKey(value: string) {
  return value > getTodayLocalDate();
}

export function getSafeNutritionDate(value: string | null | undefined) {
  if (!value || !isValidDateKey(value) || isFutureDateKey(value)) {
    return null;
  }

  return value;
}

export function parseNutritionDateQuery(
  value: string | string[] | null | undefined
) {
  const today = getTodayLocalDate();

  if (value === undefined || value === null) {
    return {
      dateKey: today,
      isToday: true,
      message: null as string | null,
    };
  }

  const rawValue = Array.isArray(value) ? value[0] : value;
  const safeDate = getSafeNutritionDate(rawValue);

  if (safeDate) {
    return {
      dateKey: safeDate,
      isToday: safeDate === today,
      message: null as string | null,
    };
  }

  const message = !isValidDateKey(rawValue)
    ? "Data non valida. Mostro il diario di oggi."
    : "Non puoi selezionare una data futura. Mostro il diario di oggi.";

  return {
    dateKey: today,
    isToday: true,
    message,
  };
}

export function formatNutritionDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "full",
    timeZone: NUTRITION_TIME_ZONE,
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function shiftNutritionDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatPartsDateKey(date);
}

export function getNutritionTimeZone() {
  return NUTRITION_TIME_ZONE;
}
