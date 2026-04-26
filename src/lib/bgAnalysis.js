export function getLast24h(readings) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return readings.filter((r) => new Date(r.ts).getTime() >= cutoff);
}

export function getLatestReading(readings) {
  if (!readings.length) return null;
  return readings.reduce((a, b) => (new Date(a.ts) > new Date(b.ts) ? a : b));
}

export function getAverage(readings) {
  if (!readings.length) return null;
  return Math.round(readings.reduce((sum, r) => sum + r.value, 0) / readings.length);
}

export function getTrend(readings) {
  if (readings.length < 2) return 'stable';
  const sorted = [...readings].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const recent = sorted.slice(-4);
  const first = recent[0].value;
  const last = recent[recent.length - 1].value;
  const diff = last - first;
  if (diff > 15) return 'rising';
  if (diff < -15) return 'falling';
  return 'stable';
}

export function getTimeInRange(readings, low = 70, high = 180) {
  if (!readings.length) return null;
  const inRange = readings.filter((r) => r.value >= low && r.value <= high).length;
  return Math.round((inRange / readings.length) * 100);
}

export function formatBgSummary(readings, targetRange = [70, 180]) {
  const last24 = getLast24h(readings);
  if (!last24.length) return 'No BG data for the last 24 hours';
  const avg = getAverage(last24);
  const trend = getTrend(last24);
  const tir = getTimeInRange(last24, ...targetRange);
  const latest = getLatestReading(last24);
  return `Average ${avg} mg/dL, trending ${trend}, ${tir}% time-in-range (${targetRange[0]}–${targetRange[1]}). Last reading: ${latest.value} mg/dL at ${new Date(latest.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
}

export function bgColor(value, low = 70, high = 180) {
  if (value < low) return 'text-red-600';
  if (value > high) return 'text-amber-500';
  return 'text-green-600';
}
