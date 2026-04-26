import { useState, useEffect } from 'react';
import { getTodayLog, updateMeal } from '../lib/storage';
import FoodSearch from './FoodSearch';
import FavoritesShelf from './FavoritesShelf';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'snack', label: 'Morning Snack', icon: '🍎' },
  { id: 'lunch', label: 'Lunch', icon: '🥗' },
  { id: 'afterschool', label: 'After-School', icon: '🎒' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
];

export default function MealLog({ showToast }) {
  const [todayLog, setTodayLog] = useState({ meals: [] });
  const [activeSlot, setActiveSlot] = useState(null);
  const [entryMode, setEntryMode] = useState('search'); // search | favorites
  const [bgAfterInput, setBgAfterInput] = useState({});

  function refresh() {
    setTodayLog(getTodayLog());
  }

  useEffect(() => {
    refresh();
  }, []);

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

        return (
          <div key={slot.id} className="border border-gray-100 rounded-2xl overflow-hidden">
            <button
              onClick={() => setActiveSlot(isOpen ? null : slot.id)}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{slot.icon}</span>
                <span className="font-medium text-gray-800">{slot.label}</span>
                {meals.length > 0 && (
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                    {totalCarbs}g carbs
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 p-3 space-y-3 bg-gray-50">
                {/* Logged meals */}
                {meals.map((meal) => (
                  <div key={meal.id} className="bg-white rounded-xl p-3 space-y-1">
                    {meal.foods?.map((f, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{f.name}</span>
                        <span className="text-gray-500 font-medium">{f.carbsG}g</span>
                      </div>
                    ))}
                    {meal.aiSuggested && (
                      <span className="text-xs text-purple-500">✨ AI suggested</span>
                    )}
                    {/* Post-meal BG */}
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

                {/* Entry mode toggle */}
                <div className="flex gap-2 bg-white rounded-xl p-1">
                  <button
                    onClick={() => setEntryMode('search')}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                      entryMode === 'search' ? 'bg-green-600 text-white' : 'text-gray-500'
                    }`}
                  >
                    USDA Search
                  </button>
                  <button
                    onClick={() => setEntryMode('favorites')}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                      entryMode === 'favorites' ? 'bg-green-600 text-white' : 'text-gray-500'
                    }`}
                  >
                    Favorites
                  </button>
                </div>

                {entryMode === 'search' && (
                  <FoodSearch
                    mealLabel={slot.id}
                    onLogged={refresh}
                    showToast={showToast}
                  />
                )}
                {entryMode === 'favorites' && (
                  <FavoritesShelf
                    mealLabel={slot.id}
                    onLogged={refresh}
                    showToast={showToast}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
