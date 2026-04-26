import { useState, useEffect, useRef } from 'react';
import { getFavorites, removeFavorite, saveFavorite, saveMeal } from '../lib/storage';
import { carbsForServing } from '../lib/usda';
import { scanPhoto } from '../lib/claude';
import { resizeImageToBase64 } from '../lib/imageResize';
import Spinner from './Spinner';

const MEAL_OPTIONS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'snack', label: 'Morning Snack' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'afterschool', label: 'After-School' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'evening', label: 'Evening Snack' },
  { id: 'quicksnack', label: 'Quick Snack' },
];

export default function FavoritesShelf({ mealLabel, onLogged, showToast, standalone }) {
  const [favorites, setFavorites] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(mealLabel ?? 'snack');
  const [showAdd, setShowAdd] = useState(false);

  function refresh() { setFavorites(getFavorites()); }
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

  function handleSaveCustom(food) {
    saveFavorite(food);
    refresh();
    setShowAdd(false);
    showToast(`${food.name} saved to favorites`);
  }

  const empty = (
    <div className="text-center py-12 text-gray-400">
      <p className="text-4xl mb-3">⭐</p>
      <p className="text-sm font-medium text-gray-500">No favorites yet</p>
      <p className="text-xs mt-1">Search USDA foods, or tap "+ Add custom" to create one.</p>
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
              {food.brand && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{food.brand}</p>
              )}
              {carbs != null && (
                <p className="text-xs text-red-700 font-bold mt-0.5">
                  {carbs}g carbs / {food.servingG ?? 100}g
                </p>
              )}
              {food.source === 'custom' && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                  custom
                </span>
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Favorites</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-full"
        >
          + Add custom
        </button>
      </div>

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

      {showAdd && (
        <AddCustomFood
          onSave={handleSaveCustom}
          onClose={() => setShowAdd(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function AddCustomFood({ onSave, onClose, showToast }) {
  const [mode, setMode] = useState(null); // null | 'manual'
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [form, setForm] = useState({ name: '', brand: '', carbsG: '', servingG: '100' });
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const { base64, mimeType } = await resizeImageToBase64(file);
      const data = await scanPhoto({ imageBase64: base64, mimeType });
      setScanResult(data);
      setForm((f) => ({
        ...f,
        carbsG: data.totalCarbsG != null ? String(data.totalCarbsG) : f.carbsG,
        servingG: data.servingG != null ? String(data.servingG) : f.servingG,
      }));
      setMode('manual');
    } catch {
      showToast('Scan failed — enter carbs manually', 'error');
      setMode('manual');
    } finally {
      setScanning(false);
    }
  }

  function handleSave() {
    const name = form.name.trim();
    if (!name) { showToast('Enter a food name', 'error'); return; }
    const carbsG = parseFloat(form.carbsG);
    if (isNaN(carbsG)) { showToast('Enter carbs amount', 'error'); return; }
    const servingG = parseFloat(form.servingG) || 100;
    onSave({
      name,
      brand: form.brand.trim() || null,
      carbsG,
      servingG,
      carbsPer100g: Math.round((carbsG / servingG) * 1000) / 10,
      source: 'custom',
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Add custom food</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        {mode === null && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-8 text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {scanning ? <Spinner size="md" /> : <span className="text-3xl">📷</span>}
              <span className="text-sm font-medium">{scanning ? 'Scanning…' : 'Scan label'}</span>
              <span className="text-xs text-gray-400">auto-fills carbs</span>
            </button>
            <button
              onClick={() => setMode('manual')}
              className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-8 text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors"
            >
              <span className="text-3xl">✏️</span>
              <span className="text-sm font-medium">Enter manually</span>
              <span className="text-xs text-gray-400">name + carbs</span>
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {mode === 'manual' && (
          <div className="space-y-3">
            {scanResult && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600">
                Scan found: <strong>{scanResult.totalCarbsG}g carbs</strong>
                {scanResult.servingG != null && ` / ${scanResult.servingG}g serving`}
                {scanResult.confidence != null && scanResult.confidence < 0.7 && (
                  <span className="text-amber-600 ml-1">— low confidence, double-check</span>
                )}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Food name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Nature Valley Bar"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Brand (optional)</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="e.g. Nature Valley"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Carbs per serving (g) *</label>
                <input
                  type="number"
                  value={form.carbsG}
                  onChange={(e) => setForm((f) => ({ ...f, carbsG: e.target.value }))}
                  placeholder="45"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Serving size (g)</label>
                <input
                  type="number"
                  value={form.servingG}
                  onChange={(e) => setForm((f) => ({ ...f, servingG: e.target.value }))}
                  placeholder="100"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {scanResult === null && (
                <button
                  onClick={() => setMode(null)}
                  className="border border-gray-200 text-gray-500 text-sm py-2.5 px-4 rounded-xl"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleSave}
                className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-xl"
              >
                Save to favorites
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
