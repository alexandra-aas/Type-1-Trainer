import { useState, useEffect } from 'react';
import { getSettings, saveSettings, getFavorites, removeFavorite } from '../lib/storage';
import WeeklySchedule from './WeeklySchedule';

export default function Settings({ showToast }) {
  const [form, setForm] = useState({
    childName: '',
    usdaApiKey: '',
    unitSystem: 'mg/dL',
    targetRange: [70, 180],
  });
  const [favCount, setFavCount] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setForm(s);
    setFavCount(getFavorites().length);
  }, []);

  function handleChange(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function handleRangeChange(idx, value) {
    const range = [...form.targetRange];
    range[idx] = parseInt(value, 10) || range[idx];
    handleChange('targetRange', range);
  }

  function handleSave(e) {
    e.preventDefault();
    saveSettings(form);
    showToast('Settings saved');
  }

  function handleClearFavorites() {
    getFavorites().forEach((f) => removeFavorite(f.id));
    setFavCount(0);
    showToast('Favorites cleared');
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <Section title="Child Profile">
          <Field label="Child's name">
            <input
              type="text"
              value={form.childName}
              onChange={(e) => handleChange('childName', e.target.value)}
              placeholder="e.g. Sam"
              className={inputClass}
            />
          </Field>
          <Field label="BG unit">
            <select
              value={form.unitSystem}
              onChange={(e) => handleChange('unitSystem', e.target.value)}
              className={inputClass}
            >
              <option value="mg/dL">mg/dL</option>
              <option value="mmol/L">mmol/L</option>
            </select>
          </Field>
          <Field label={`Target range (${form.unitSystem})`}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.targetRange[0]}
                onChange={(e) => handleRangeChange(0, e.target.value)}
                className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-gray-400">–</span>
              <input
                type="number"
                value={form.targetRange[1]}
                onChange={(e) => handleRangeChange(1, e.target.value)}
                className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </Field>
        </Section>

        <Section title="API Keys">
          <Field
            label="USDA API Key"
            hint="Free at fdc.nal.usda.gov — required for food search"
          >
            <input
              type="text"
              value={form.usdaApiKey}
              onChange={(e) => handleChange('usdaApiKey', e.target.value)}
              placeholder="Paste your USDA key"
              className={inputClass}
              autoComplete="off"
            />
          </Field>
          <p className="text-xs text-gray-400">
            The Claude (Anthropic) API key is set server-side in Vercel — you don't enter it here.
          </p>
        </Section>

        <button
          type="submit"
          className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl"
        >
          Save settings
        </button>
      </form>

      <Section title="Schedule">
        <button
          onClick={() => setShowSchedule(true)}
          className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          Edit weekly activity schedule →
        </button>
      </Section>

      <Section title="Data">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-gray-700">Favorites</p>
            <p className="text-xs text-gray-400">{favCount} saved food{favCount !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={handleClearFavorites}
            disabled={!favCount}
            className="text-xs text-red-500 font-medium disabled:text-gray-300"
          >
            Clear all
          </button>
        </div>
        <p className="text-xs text-gray-400">
          All data is stored locally in your browser. No account required.
        </p>
      </Section>

      {showSchedule && (
        <WeeklySchedule
          onClose={() => setShowSchedule(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
