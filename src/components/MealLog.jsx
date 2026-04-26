import { useState, useEffect } from 'react';
import { getTodayLog, updateMeal, getBgReadings, getSettings, getSchedule } from '../lib/storage';
import { getLast24h, getLatestReading, getTrend, formatBgSummary } from '../lib/bgAnalysis';
import { getFoodHistorySummary } from '../lib/foodHistory';
import { scoreMeal } from '../lib/claude';
import FoodSearch from './FoodSearch';
import FavoritesShelf from './FavoritesShelf';
import PhotoScan from './PhotoScan';
import Spinner from './Spinner';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'snack', label: 'Morning Snack', icon: '🍎' },
  { id: 'lunch', label: 'Lunch', icon: '🥗' },
  { id: 'afterschool', label: 'After-School', icon: '🎒' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
  { id: 'evening', label: 'Evening Snack', icon: '🌙' },
];
const QUICK_SNACK = { id: 'quicksnack', label: 'Quick Snack', icon: '🍪' };
const ALL_SLOTS = [...MEAL_SLOTS, QUICK_SNACK];
const TODAY_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

function fmt12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
}

function scoreColor(s) {
  if (s <= 3) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (s <= 6) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function minsApart(t1, t2) {
  const [h1, m1] = t1.split(':').map(Number);
  const [h2, m2] = t2.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

export default function MealLog({ showToast }) {
  const [todayLog, setTodayLog] = useState({ meals: [] });
  const [bgReadings, setBgReadings] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [addingToSlot, setAddingToSlot] = useState(null);
  const [entryMode, setEntryMode] = useState('search');
  const [slotScores, setSlotScores] = useState({});
  const [scoringSlot, setScoringSlot] = useState(null);

  function refresh() {
    setTodayLog(getTodayLog());
    setBgReadings(getBgReadings());
  }

  useEffect(() => { refresh(); }, []);

  const mealsBySlot = MEAL_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = todayLog.meals.filter((m) => m.label === slot.id);
    return acc;
  }, {});

  function markSlotEaten(slotId) {
    const now = new Date().toTimeString().slice(0, 5);
    (mealsBySlot[slotId] ?? []).forEach((m) => updateMeal(m.id, { eatenAt: now }));
    refresh();
  }

  // Auto-detect post-meal BG: look for readings 60–150 min after eating
  function getAutoPostMealBg(slotId) {
    const meals = mealsBySlot[slotId] ?? [];
    if (!meals.length) return null;
    const referenceTime = meals.find((m) => m.eatenAt)?.eatenAt ?? meals[0]?.time;
    if (!referenceTime) return null;
    const today = new Date().toISOString().slice(0, 10);
    const refMs = new Date(`${today}T${referenceTime}:00`).getTime();
    const windowStart = refMs + 60 * 60 * 1000;
    const windowEnd = refMs + 150 * 60 * 1000;
    const nowMs = Date.now();
    if (nowMs < windowStart) return { status: 'early', readyAt: new Date(windowStart) };
    const hits = bgReadings.filter((r) => {
      const ts = new Date(r.ts).getTime();
      return ts >= windowStart && ts <= windowEnd;
    });
    if (!hits.length) return { status: 'missing' };
    const peak = hits.reduce((best, r) => (r.value > best.value ? r : best));
    return { status: 'found', value: peak.value, unit: peak.unit ?? 'mg/dL' };
  }

  async function handleScore(slotId) {
    const meals = mealsBySlot[slotId] ?? [];
    if (!meals.length) return;
    setScoringSlot(slotId);
    try {
      const settings = getSettings();
      const last24 = getLast24h(bgReadings);
      const latest = getLatestReading(last24);
      const trend = getTrend(last24);
      const schedule = getSchedule();
      const activities = (schedule[TODAY_DAY] ?? [])
        .map((a) => (a.time ? `${a.name} at ${fmt12(a.time)}` : a.name))
        .join(', ');
      const result = await scoreMeal({
        foods: meals.flatMap((m) => m.foods ?? []),
        totalCarbsG: meals.reduce((s, m) => s + (m.totalCarbsG ?? 0), 0),
        currentBg: latest?.value ?? null,
        bgTrend: trend,
        schedule: activities || 'No activities',
        mealTime: meals[0]?.time,
        insulinType: settings.insulinType ?? 'lispro',
        recentHistory: getFoodHistorySummary(7),
      });
      setSlotScores((p) => ({ ...p, [slotId]: result }));
    } catch {
      showToast('Could not score meal — check Claude API key', 'error');
    } finally {
      setScoringSlot(null);
    }
  }

  function openAddSheet(slotId) { setAddingToSlot(slotId); setEntryMode('search'); }
  function closeAddSheet() { refresh(); setAddingToSlot(null); }

  const quickSnacks = todayLog.meals.filter((m) => m.label === 'quicksnack');
  const addingSlot = ALL_SLOTS.find((s) => s.id === addingToSlot);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Today's Log</h1>
      <p className="text-sm text-gray-400">
        {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {MEAL_SLOTS.map((slot) => {
        const meals = mealsBySlot[slot.id] ?? [];
        const totalCarbs = meals.reduce((s, m) => s + (m.totalCarbsG ?? 0), 0);
        const isOpen = activeSlot === slot.id;
        const score = slotScores[slot.id];

        // Slot-level timing
        const bolusedAt = meals.length ? meals.reduce((e, m) => m.time < e ? m.time : e, meals[0].time) : null;
        const eatenAt = meals.find((m) => m.eatenAt)?.eatenAt ?? null;
        const prebolusMin = bolusedAt && eatenAt ? minsApart(bolusedAt, eatenAt) : null;
        const postMealBg = meals.length ? getAutoPostMealBg(slot.id) : null;

        return (
          <div key={slot.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <button
              onClick={() => setActiveSlot(isOpen ? null : slot.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{slot.icon}</span>
                <span className="font-medium text-gray-800">{slot.label}</span>
                {meals.length > 0 && (
                  <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                    {totalCarbs}g carbs
                  </span>
                )}
                {score && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${scoreColor(score.glucoseImpactScore)}`}>
                    {score.glucoseImpactScore}/10
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 p-3 space-y-3 bg-gray-50">
                {meals.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">Nothing logged yet</p>
                )}

                {/* Clean food list */}
                {meals.length > 0 && (
                  <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-50">
                    {meals.flatMap((meal) =>
                      (meal.foods ?? []).map((f, i) => (
                        <div key={`${meal.id}-${i}`} className="flex justify-between text-sm px-3 py-2">
                          <span className="text-gray-700">{f.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium">{f.carbsG}g</span>
                            {meal.aiSuggested && i === 0 && (
                              <span className="text-xs text-purple-400">✨</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Slot-level timing + post-meal BG */}
                {meals.length > 0 && (
                  <div className="bg-white rounded-xl px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {bolusedAt && (
                        <span className="text-xs text-gray-500">⏱ Bolused {fmt12(bolusedAt)}</span>
                      )}
                      {eatenAt ? (
                        <>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-500">Ate {fmt12(eatenAt)}</span>
                          {prebolusMin != null && prebolusMin > 0 && (
                            <>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs font-semibold text-blue-600">{prebolusMin}min pre-bolus</span>
                            </>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => markSlotEaten(slot.id)}
                          className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full"
                        >
                          Mark as eaten
                        </button>
                      )}
                    </div>

                    {/* Auto post-meal BG */}
                    {postMealBg?.status === 'found' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">📈 Post-meal BG:</span>
                        <span className="text-xs font-bold text-gray-800">{postMealBg.value} {postMealBg.unit}</span>
                        <span className="text-xs text-gray-400">(auto)</span>
                      </div>
                    )}
                    {postMealBg?.status === 'early' && (
                      <p className="text-xs text-gray-400">
                        📈 Post-meal BG available after {postMealBg.readyAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                    {postMealBg?.status === 'missing' && eatenAt && (
                      <p className="text-xs text-gray-400">📈 No BG reading found 1–2.5h after eating — add one manually</p>
                    )}
                  </div>
                )}

                {/* Score card */}
                {score && (
                  <div className={`rounded-xl p-3 border space-y-1.5 ${scoreColor(score.glucoseImpactScore)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Glucose impact: {score.glucoseImpactScore}/10</span>
                      <span className="text-xs opacity-70 capitalize">{score.macroBalance?.replace('-', ' ')}</span>
                    </div>
                    {score.prebolusMinutes > 0 && (
                      <p className="text-xs">⏱ Pre-bolus {score.prebolusMinutes} min before eating</p>
                    )}
                    {score.peakRiskTime && (
                      <p className="text-xs">📈 BG peak expected around {score.peakRiskTime}</p>
                    )}
                    {score.tip && <p className="text-xs font-medium">{score.tip}</p>}
                    {score.activityNote && (
                      <p className="text-xs opacity-80">🏃 {score.activityNote}</p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openAddSheet(slot.id)}
                    className="flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-red-700 transition-colors"
                  >
                    + Add food
                  </button>
                  {meals.length > 0 && (
                    <button
                      onClick={() => handleScore(slot.id)}
                      disabled={scoringSlot === slot.id}
                      className="flex-1 border border-gray-200 bg-white text-sm font-medium py-2 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {scoringSlot === slot.id ? <><Spinner size="sm" /> Scoring…</> : '✨ Score meal'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Quick snacks */}
      <div className="border border-dashed border-gray-200 rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">🍪 Quick Snacks</span>
          <button
            onClick={() => openAddSheet('quicksnack')}
            className="text-xs bg-red-600 text-white font-medium px-3 py-1 rounded-full hover:bg-red-700"
          >
            + Add snack
          </button>
        </div>
        {quickSnacks.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-1">
            Tap "+ Add snack" to log an unplanned snack with a timestamp.
          </p>
        )}
        {quickSnacks.map((meal) => (
          <div key={meal.id} className="bg-white rounded-xl px-3 py-2 flex items-start justify-between gap-2">
            <div className="space-y-0.5 flex-1">
              {meal.foods?.map((f, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{f.name}</span>
                  <span className="text-gray-500 font-medium">{f.carbsG}g</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400 shrink-0 mt-0.5">{fmt12(meal.time)}</span>
          </div>
        ))}
      </div>

      {/* Food entry overlay */}
      {addingToSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-40" onClick={closeAddSheet}>
          <div
            className="bg-white w-full max-w-lg mx-auto rounded-t-2xl flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {addingSlot?.icon} Add to {addingSlot?.label}
                </h2>
                {(() => {
                  const entries = addingToSlot === 'quicksnack' ? quickSnacks : (mealsBySlot[addingToSlot] ?? []);
                  const total = entries.reduce((s, m) => s + (m.totalCarbsG ?? 0), 0);
                  return total > 0 ? (
                    <p className="text-xs text-gray-400 mt-0.5">{total}g carbs logged so far</p>
                  ) : null;
                })()}
              </div>
              <button
                onClick={closeAddSheet}
                className="bg-gray-100 text-gray-600 font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-gray-200"
              >
                Done
              </button>
            </div>

            <div className="flex gap-1 mx-5 bg-gray-100 rounded-xl p-1 mb-3">
              {[
                { id: 'search', label: 'USDA Search' },
                { id: 'favorites', label: 'Favorites' },
                { id: 'scan', label: '📷 Scan' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setEntryMode(mode.id)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                    entryMode === mode.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {entryMode === 'search' && (
                <FoodSearch mealLabel={addingToSlot} onLogged={refresh} showToast={showToast} />
              )}
              {entryMode === 'favorites' && (
                <FavoritesShelf mealLabel={addingToSlot} onLogged={refresh} showToast={showToast} />
              )}
              {entryMode === 'scan' && (
                <PhotoScan
                  initialMealLabel={addingToSlot}
                  showToast={showToast}
                  onDone={() => { refresh(); setEntryMode('search'); }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
