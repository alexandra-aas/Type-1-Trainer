import { useState, useRef } from 'react';
import { scanPhoto } from '../lib/claude';
import { resizeImageToBase64 } from '../lib/imageResize';
import { saveMeal } from '../lib/storage';
import Spinner from './Spinner';

export default function PhotoScan({ showToast, onDone, initialMealLabel }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [mealLabel, setMealLabel] = useState(initialMealLabel ?? 'snack');
  const [foodName, setFoodName] = useState('');
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setResult(null);

    setLoading(true);
    try {
      const { base64, mimeType } = await resizeImageToBase64(file);
      const data = await scanPhoto({ imageBase64: base64, mimeType });
      setResult(data);
      setFoodName('');
    } catch (err) {
      showToast('Photo scan failed — check Claude API key', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleLog() {
    if (!result) return;
    const carbs = result.totalCarbsG ?? 0;
    const name = foodName.trim() || 'Scanned food';
    saveMeal({
      label: mealLabel,
      time: new Date().toTimeString().slice(0, 5),
      foods: [{ name, carbsG: carbs, servingG: result.servingG }],
      totalCarbsG: carbs,
    });
    showToast(`${name} logged (${carbs}g carbs)`);
    onDone?.();
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setFoodName('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const inline = !!initialMealLabel;

  return (
    <div className={inline ? 'space-y-3' : 'p-4 space-y-4'}>
      {!inline && (
        <>
          <h1 className="text-xl font-bold text-gray-900">Scan Nutrition Label</h1>
          <p className="text-sm text-gray-400">
            Take a photo or upload an image of a nutrition facts label — Claude will extract the carb info.
          </p>
        </>
      )}

      {!preview && (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-12 flex flex-col items-center gap-3 text-gray-400 hover:border-green-400 hover:text-green-600 transition-colors"
        >
          <span className="text-5xl">📷</span>
          <span className="text-sm font-medium">Tap to take photo or upload</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Nutrition label"
            className="w-full rounded-2xl object-contain max-h-64 border border-gray-100"
          />
          <button
            onClick={reset}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Reading label with Claude Vision…</p>
        </div>
      )}

      {result && !loading && (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-gray-800">Scan Results</h2>

          <div className="grid grid-cols-2 gap-2">
            <ResultRow label="Serving size" value={result.servingSize ?? '—'} />
            <ResultRow label="Serving (g)" value={result.servingG != null ? `${result.servingG}g` : '—'} />
            <ResultRow
              label="Total carbs"
              value={result.totalCarbsG != null ? `${result.totalCarbsG}g` : '—'}
              highlight
            />
            <ResultRow label="Sugars" value={result.sugarsG != null ? `${result.sugarsG}g` : '—'} />
          </div>

          {result.confidence != null && result.confidence < 0.7 && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
              ⚠️ Low confidence ({Math.round(result.confidence * 100)}%) — double-check the values above.
            </p>
          )}

          <div className="space-y-2 pt-1">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Food name (optional)</label>
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Nature Valley Bar"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {!inline && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Log as</label>
                <select
                  value={mealLabel}
                  onChange={(e) => setMealLabel(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="snack">Morning Snack</option>
                  <option value="lunch">Lunch</option>
                  <option value="afterschool">After-School</option>
                  <option value="dinner">Dinner</option>
                  <option value="evening">Evening Snack</option>
                </select>
              </div>
            )}

            <button
              onClick={handleLog}
              className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl"
            >
              Log {result.totalCarbsG != null ? `(${result.totalCarbsG}g carbs)` : 'meal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div className="bg-white rounded-xl p-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-sm font-bold ${highlight ? 'text-green-700' : 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  );
}
