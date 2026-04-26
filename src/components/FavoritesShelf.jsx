import { useState, useEffect } from 'react';
import { getFavorites, removeFavorite, saveMeal } from '../lib/storage';
import { carbsForServing } from '../lib/usda';

const MEAL_OPTIONS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'snack', label: 'Morning Snack' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'afterschool', label: 'After-School' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'evening', label: 'Evening Snack' },
  { id: 'quicksnack', label: 'Quick Snack' },
];

export default function FavoritesShelf({ mealLabel, onLogged, showToast, standalone, onNavigateLog }) {
  const [favorites, setFavorites] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(mealLabel ?? 'snack');

  function refresh() {
    setFavorites(getFavorites());
  }

  useEffect(() => { refresh(); }, []);

  const logTarget = mealLabel ?? selectedMeal;

  function handleLog(food) {
    const carbsG = carbsForServing(food, food.servingG ?? 100) ?? 0;
    saveMeal({
      label: logTarget,
      time: new Date().toTimeString().slice(0, 5),
      foods: [{ name: food.name, carbsG, servingG: food.servingG }],
      totalCarbsG: carbsG,
    });
    showToast(`${food.name} logged to ${MEAL_OPTIONS.find((m) => m.id === logTarget)?.label ?? logTarget}`);
    onLogged?.();
  }

  function handleRemove(id) {
    removeFavorite(id);
    refresh();
  }

  const empty = (
    <div className="text-center py-12 text-gray-400">
      <p className="text-4xl mb-3">⭐</p>
      <p className="text-sm font-medium text-gray-500">No favorites yet</p>
      <p className="text-xs mt-1">Search USDA foods and tap "Favorite" to save them here.</p>
    </div>
  );

  const grid = (
    <div className="grid grid-cols-2 gap-2">
      {favorites.map((food) => {
        const carbs = carbsForServing(food, food.servingG ?? 100);
        return (
          <div
            key={food.id}
            className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">{food.name}</p>
              {carbs != null && (
                <p className="text-xs text-red-700 font-bold mt-0.5">
                  {carbs}g carbs / {food.servingG ?? 100}g
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleLog(food)}
                className="flex-1 bg-red-600 text-white text-xs font-medium py-1.5 rounded-lg"
              >
                Log
              </button>
              <button
                onClick={() => handleRemove(food.id)}
                className="w-8 border border-gray-200 text-gray-400 text-xs py-1.5 rounded-lg hover:text-red-500"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!standalone) {
    return favorites.length ? grid : empty;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Favorites</h1>

      {/* Meal picker */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Log to</label>
        <div className="flex gap-1 flex-wrap">
          {MEAL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedMeal(opt.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                selectedMeal === opt.id
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {favorites.length ? grid : empty}
    </div>
  );
}
