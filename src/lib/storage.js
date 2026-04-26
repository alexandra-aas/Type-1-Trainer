const KEYS = {
  bg: 'mgc_bg_v1',
  logs: 'mgc_logs_v1',
  favorites: 'mgc_favorites_v1',
  schedule: 'mgc_schedule_v1',
  settings: 'mgc_settings_v1',
};

function get(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// BG readings
export function getBgReadings() {
  return get(KEYS.bg) ?? [];
}
export function saveBgReading(reading) {
  const readings = getBgReadings();
  readings.push({ id: crypto.randomUUID(), ...reading });
  set(KEYS.bg, readings);
}
export function saveBgReadings(readings) {
  const existing = getBgReadings();
  const merged = [...existing, ...readings];
  merged.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  set(KEYS.bg, merged);
}

// Meal logs
export function getLogs() {
  return get(KEYS.logs) ?? [];
}
export function getTodayLog() {
  const today = new Date().toISOString().slice(0, 10);
  return getLogs().find((l) => l.date === today) ?? { date: today, meals: [] };
}
export function saveMeal(meal) {
  const today = new Date().toISOString().slice(0, 10);
  const logs = getLogs();
  const idx = logs.findIndex((l) => l.date === today);
  const entry = { id: crypto.randomUUID(), ...meal };
  if (idx >= 0) {
    logs[idx].meals.push(entry);
  } else {
    logs.push({ date: today, meals: [entry] });
  }
  set(KEYS.logs, logs);
  return entry;
}
export function updateMeal(mealId, updates) {
  const logs = getLogs();
  for (const log of logs) {
    const idx = log.meals.findIndex((m) => m.id === mealId);
    if (idx >= 0) {
      log.meals[idx] = { ...log.meals[idx], ...updates };
      break;
    }
  }
  set(KEYS.logs, logs);
}

// Favorites
const MAX_FAVORITES = 50;
export function getFavorites() {
  return get(KEYS.favorites) ?? [];
}
export function saveFavorite(food) {
  let favs = getFavorites();
  const exists = favs.find((f) => f.fdcId && f.fdcId === food.fdcId);
  if (exists) return;
  favs.unshift({ id: crypto.randomUUID(), savedAt: new Date().toISOString(), ...food });
  if (favs.length > MAX_FAVORITES) favs = favs.slice(0, MAX_FAVORITES);
  set(KEYS.favorites, favs);
}
export function removeFavorite(id) {
  set(KEYS.favorites, getFavorites().filter((f) => f.id !== id));
}

// Weekly schedule
export function getSchedule() {
  return (
    get(KEYS.schedule) ?? {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    }
  );
}
export function saveSchedule(schedule) {
  set(KEYS.schedule, schedule);
}

// Settings
export function getSettings() {
  return get(KEYS.settings) ?? { childName: '', usdaApiKey: '', unitSystem: 'mg/dL', targetRange: [70, 180] };
}
export function saveSettings(settings) {
  set(KEYS.settings, settings);
}
