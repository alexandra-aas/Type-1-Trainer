import { getLogs, getBgReadings } from './storage';

// Returns a plain-text summary of the last N days of food reactions
// suitable for injecting into the Claude prompt.
export function getFoodHistorySummary(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const logs = getLogs().filter((l) => new Date(l.date) >= cutoff);
  const readings = getBgReadings().filter((r) => new Date(r.ts) >= cutoff);

  if (!logs.length) return null;

  const lines = [];

  for (const log of logs) {
    for (const meal of log.meals) {
      if (!meal.foods?.length) continue;
      const foodStr = meal.foods.map((f) => `${f.name} (${f.carbsG}g carbs)`).join(', ');
      const bgInfo =
        meal.bgBefore != null && meal.bgAfter != null
          ? `BG ${meal.bgBefore}→${meal.bgAfter} mg/dL`
          : meal.bgBefore != null
          ? `BG before: ${meal.bgBefore} mg/dL`
          : '';
      lines.push(`${log.date} ${meal.label}: ${foodStr}${bgInfo ? ' | ' + bgInfo : ''}`);
    }
  }

  return lines.length ? lines.join('\n') : null;
}
