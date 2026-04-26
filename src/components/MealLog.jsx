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
];

const TODAY_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

function fmt12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
}

function scoreColor(s) {
  if (s <= 3) return 'text-green-700 bg-green-50 border-green-200';
  if (s <= 6) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

export default function MealLog({ showToast }) {
  const [todayLog, setTodayLog] = useState({ meals: [] });
  const [activeSlot, setActiveSlot] = useState(null);
  const [addingToSlot, setAddingToSlot] = useState(null);
  const [entryMode, setEntryMode] = useState('search');
  const [bgAfterInput, setBgAfterInput] = useState({});
  const [slotScores, setSlotScores] = useState({});
  const [scoringSlot, setScoringSlot] = useState(null);

  function refresh() {
    setTodayLog(getTodayLog());
  }

  useEffect(() => { refresh(); }, []);

  const mealsBySlot = MEAL_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = todayLog.meals.filter((m) => m.label === slot.id);
    return acc;
  }, {});

  function handleBgAfter(mealId, value) {
    const num = parseInt(value, 10);
    if (!num || num < 20 || num > 600) return;
    updateMeal(mealId, { bgAfter: num });
    refresh();
    showToast('Post-meal BG saved');
    setBgAfterInput((p) => ({ ...p, [mealId]: '' }));
  }

  async function handleScore(slotId) {
    const meals = mealsBySlot[slotId] ?? [];
    if (!meals.length) return;
    setScoringSlot(slotId);
    try {
      const readings = getBgReadings();
      const settings = getSettings();
      const last24 = getLast24h(readings);
      const latest = getLatestReading(last24);
      const trend = getTrend(last24);
      const schedule = getSchedule();
      const activities = (schedule[TODAY_DAY] ?? [])
        .map((a) => (a.time ? `${a.name} at ${fmt12(a.time)}` : a.name))
        .join(', ');
      const allFoods = meals.flatMap((m) => m.foods ?? []);
      const totalCarbsG = meals.reduce((s, m) => s + (m.totalCarbsG ?? 0), 0);
      const mealTime = meals[0]?.time;
      const recentHistory = getFoodHistorySummary(7);

      const result = await scoreMeal({
        foods: allFoods,
        totalCarbsG,
        currentBg: latest?.value ?? null,
        bgTrend: trend,
        schedule: activities || 'No activities',
        mealTime,
        insulinType: settings.insulinType ?? 'lispro',
        recentHistory,
      });
      setSlotScores((p) => ({ ...p, [slotId]: result }));
    } catch {
      showToast('Could not score meal — check Claude API key', 'error');
    } finally {
      setScoringSlot(null);
    }
  }

  function openAddSheet(slotId) {
    setAddingToSlot(slotId);
    setEntryMode('search');
  }

  function closeAddSheet() {
    refresh();
    setAddingToSlot(null);
  }

  const addingSlot = MEAL_SLOTS.find((s) => s.id === addingToSlot);

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

        return (
          <div key={slot.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            {/* Slot header */}
            <button
              onClick={() => setActiveSlot(isOpen ? null : slot.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{slot.icon}</span>
                <span className="font-medium text-gray-800">{slot.label}</span>
                {meals.length > 0 && (
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
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
                {/* Logged food entries */}
                {meals.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">Nothing logged yet</p>
                )}
                {meals.map((meal) => (
                  <div key={meal.id} className="bg-white rounded-xl p-3 space-y-1.5">
                    {meal.foods?.map((f, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{f.name}</span>
                        <span className="text-gray-500 font-medium">{f.carbsG}g</span>
                      </div>
                    ))}
                    {meal.aiSuggested && (
                      <span className="text-xs text-purple-500">✨ AI suggested</span>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-gray-400">Post-meal BG:</span>
                      {meal.bgAfter ? (
                        <span className="text-xs font-bold text-gray-700">{meal.bgAfter} mg/dL</span>
                      ) : (
                        <div className="flex gap-1">
                          <input
                            type="number"
                            value={bgAfterInput[meal.id] ?? ''}
                            onChange={(e) => setBgAfterInput((p) => ({ ...p, [meal.id]: e.target.value }))}
                            placeholder="e.g. 154"
                            className="w-20 border border-gray-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                          />
                          <button
                            onClick={() => handleBgAfter(meal.id, bgAfterInput[meal.id])}
                            className="text-xs text-green-600 font-medium"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

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
                    className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-green-700 transition-colors"
                  >
                    + Add food
                  </button>
                  {meals.length > 0 && (
                    <button
                      onClick={() => handleScore(slot.id)}
                      disabled={scoringSlot === slot.id}
                      className="flex-1 border border-gray-200 bg-white text-sm font-medium py-2 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {scoringSlot === slot.id ? (
                        <><Spinner size="sm" /> Scoring…</>
                      ) : (
                        '✨ Score meal'
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Food entry overlay */}
      {addingToSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-40" onClick={closeAddSheet}>
          <div
            className="bg-white w-full max-w-lg mx-auto rounded-t-2xl flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {addingSlot?.icon} Add to {addingSlot?.label}
                </h2>
                {(() => {
                  const total = (mealsBySlot[addingToSlot] ?? []).reduce((s, m) => s + (m.totalCarbsG ?? 0), 0);
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

            {/* Mode tabs */}
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

            {/* Mode content */}
            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {entryMode === 'search' && (
                <FoodSearch
                  mealLabel={addingToSlot}
                  onLogged={refresh}
                  showToast={showToast}
                />
              )}
              {entryMode === 'favorites' && (
                <FavoritesShelf
                  mealLabel={addingToSlot}
                  onLogged={refresh}
                  showToast={showToast}
                />
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
