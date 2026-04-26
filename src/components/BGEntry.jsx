import { useState, useRef } from 'react';
import { saveBgReading, saveBgReadings } from '../lib/storage';

export default function BGEntry({ onClose, showToast }) {
  const [value, setValue] = useState('');
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const fileRef = useRef();

  function handleManual(e) {
    e.preventDefault();
    const num = parseInt(value, 10);
    if (!num || num < 20 || num > 600) {
      showToast('Enter a valid BG value (20–600)', 'error');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    saveBgReading({ ts: `${today}T${time}:00`, value: num, unit: 'mg/dL', source: 'manual' });
    showToast('BG reading saved');
    onClose();
  }

  function handleCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const parsed = parseDexcomCSV(text);
      if (!parsed.length) {
        showToast('No readings found in CSV', 'error');
        return;
      }
      saveBgReadings(parsed);
      showToast(`Imported ${parsed.length} readings`);
      onClose();
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">Add BG Reading</h2>

        <form onSubmit={handleManual} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Value (mg/dL)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 142"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-500 mb-1 block">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl"
          >
            Save reading
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-gray-400">or import</span>
          </div>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          📁 Import Dexcom CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />

        <p className="text-xs text-gray-400 text-center">
          Export from Dexcom Clarity → "Export data" → Upload here
        </p>
      </div>
    </div>
  );
}

function parseDexcomCSV(text) {
  const lines = text.split('\n').filter(Boolean);
  const readings = [];

  for (const line of lines) {
    const cols = line.split(',');
    // Dexcom Clarity CSV: Timestamp (YYYY-MM-DD HH:MM:SS), Event Type, Glucose Value (mg/dL)
    const tsRaw = cols[1]?.trim().replace(' ', 'T');
    const eventType = cols[2]?.trim();
    const glucoseStr = cols[3]?.trim() ?? cols[7]?.trim();

    if (eventType !== 'EGV' && !glucoseStr) continue;
    const value = parseInt(glucoseStr, 10);
    if (!tsRaw || !value || value < 20) continue;

    readings.push({ ts: tsRaw, value, unit: 'mg/dL', source: 'csv' });
  }

  return readings;
}
