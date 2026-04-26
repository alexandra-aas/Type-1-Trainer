import { useState } from 'react';
import { searchFoods, carbsForServing } from '../lib/usda';
import { saveFavorite, saveMeal } from '../lib/storage';
import Spinner from './Spinner';

export default function FoodSearch({ mealLabel, onLogged, showToast }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [servings, setServings] = useState({});

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchFoods(query);
      setResults(data);
      if (!data.length) showToast('No results found', 'warning');
    } catch {
      showToast('USDA search failed — check your API key in Settings', 'error');
    } finally {
      setLoading(false);
    }
  }

  function getServing(food) {
    return parseFloat(servings[food.fdcId] ?? food.servingG ?? 100);
  }

  function handleLog(food) {
    const servingG = getServing(food);
    const carbsG = carbsForServing(food, servingG) ?? 0;
    saveMeal({
      label: mealLabel ?? 'snack',
      time: new Date().toTimeString().slice(0, 5),
      foods: [{ name: food.description, carbsG, servingG }],
      totalCarbsG: carbsG,
    });
    showToast(`${food.description} logged`);
    onLogged?.();
  }

  function handleFavorite(food) {
    saveFavorite({
      name: food.description,
      carbsPer100g: food.carbsPer100g,
      servingG: food.servingG ?? 100,
      source: 'usda',
      fdcId: food.fdcId,
    });
    showToast('Saved to favorites');
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods…"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:bg-green-300"
        >
          {loading ? <Spinner size="sm" /> : 'Search'}
        </button>
      </form>

      {results.map((food) => {
        const servingG = getServing(food);
        const carbs = carbsForServing(food, servingG);
        return (
          <div key={food.fdcId} className="border border-gray-100 rounded-xl p-3 space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-800 leading-tight">{food.description}</p>
              {food.brand && <p className="text-xs text-gray-400">{food.brand}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={servings[food.fdcId] ?? food.servingG ?? 100}
                onChange={(e) => setServings((p) => ({ ...p, [food.fdcId]: e.target.value }))}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none"
              />
              <span className="text-xs text-gray-400">g</span>
              {carbs != null && (
                <span className="text-sm font-bold text-green-700 ml-auto">{carbs}g carbs</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleLog(food)}
                className="flex-1 bg-green-600 text-white text-xs font-medium py-1.5 rounded-lg"
              >
                Log
              </button>
              <button
                onClick={() => handleFavorite(food)}
                className="flex-1 border border-gray-200 text-gray-600 text-xs font-medium py-1.5 rounded-lg hover:bg-gray-50"
              >
                ★ Favorite
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
