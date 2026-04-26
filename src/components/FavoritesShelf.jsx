import { useState, useEffect } from 'react';
import { getFavorites, removeFavorite, saveMeal } from '../lib/storage';
import { carbsForServing } from '../lib/usda';

export default function FavoritesShelf({ mealLabel, onLogged, showToast }) {
  const [favorites, setFavorites] = useState([]);

  function refresh() {
    setFavorites(getFavorites());
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleLog(food) {
    const carbsG = carbsForServing(food, food.servingG ?? 100) ?? 0;
    saveMeal({
      label: mealLabel ?? 'snack',
      time: new Date().toTimeString().slice(0, 5),
      foods: [{ name: food.name, carbsG, servingG: food.servingG }],
      totalCarbsG: carbsG,
    });
    showToast(`${food.name} logged`);
    onLogged?.();
  }

  function handleRemove(id) {
    removeFavorite(id);
    refresh();
  }

  if (!favorites.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-3xl mb-2">⭐</p>
        <p className="text-sm">No favorites yet.</p>
        <p className="text-xs mt-1">Search USDA foods and tap "Favorite" to save them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {favorites.map((food) => {
        const carbs = carbsForServing(food, food.servingG ?? 100);
        return (
          <div
            key={food.id}
            className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-2"
          >
            <div>
              <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">{food.name}</p>
              {carbs != null && (
                <p className="text-xs text-green-700 font-bold mt-0.5">
                  {carbs}g carbs / {food.servingG ?? 100}g
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleLog(food)}
                className="flex-1 bg-green-600 text-white text-xs font-medium py-1.5 rounded-lg"
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
}
