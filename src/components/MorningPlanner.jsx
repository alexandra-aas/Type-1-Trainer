import { useState, useEffect } from 'react';
import { getMealPlan } from '../lib/claude';
import { formatBgSummary } from '../lib/bgAnalysis';
import { getFoodHistorySummary } from '../lib/foodHistory';
import { getSchedule, saveMeal } from '../lib/storage';
import Spinner from './Spinner';

const TODAY_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

function fmt12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
}
const MEAL_LABELS = { breakfast: 'Breakfast', snack: 'Snack', lunch: 'Lunch' };

export default function MorningPlanner({ readings, settings, onClose, showToast }) {
  const [specialNotes, setSpecialNotes] = useState('');
  const [scheduleToday, setScheduleToday] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('context'); // context | plan

  useEffect(() => {
    const schedule = getSchedule();
    const activities = schedule[TODAY_DAY] ?? [];
    const formatted = activities
      .map((a) => (a.time ? `${a.name} at ${fmt12(a.time)}` : a.name))
      .join(', ');
    setScheduleToday(formatted || 'No scheduled activities');
  }, []);

  async function handleGenerate() {
    setLoading(true);
    try {
      const bgSummary = formatBgSummary(readings, settings.targetRange ?? [70, 180]);
      const foodHistory = getFoodHistorySummary(7);
      const result = await getMealPlan({
        bgSummary,
        schedule: scheduleToday,
        specialNotes,
        foodHistory,
      });
      setPlan(result);
      setStep('plan');
    } catch (err) {
      showToast('Could not get meal plan — check your API key', 'error');
    } finally {
      setLoading(false);
    }
  }

  function logMeal(label, suggestion) {
    saveMeal({
      label,
      time: new Date().toTimeString().slice(0, 5),
      foods: [{ name: suggestion.name, carbsG: suggestion.carbsG }],
      totalCarbsG: suggestion.carbsG,
      aiSuggested: true,
    });
    showToast(`${suggestion.name} logged as ${MEAL_LABELS[label]}`);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'context' ? 'Plan today\'s meals' : 'Meal suggestions'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4">
          {step === 'context' && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
                  Today's schedule
                </label>
                <input
                  type="text"
                  value={scheduleToday}
                  onChange={(e) => setScheduleToday(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. School, Soccer 4pm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
                  Anything special today?
                </label>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="e.g. Birthday party at 4pm, he'll probably have cake"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Getting suggestions…
                  </>
                ) : (
                  '✨ Get meal suggestions'
                )}
              </button>
            </>
          )}

          {step === 'plan' && plan && (
            <>
              {Object.entries(MEAL_LABELS).map(([key, label]) => {
                const meal = plan[key];
                if (!meal) return null;
                return (
                  <div key={key} className="border border-gray-100 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">{label}</h3>
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        {meal.carbRangeG?.[0]}–{meal.carbRangeG?.[1]}g carbs
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 italic">{meal.reasoning}</p>
                    <div className="space-y-1">
                      {(meal.suggestions ?? []).map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2"
                        >
                          <span className="text-sm text-gray-700">{s.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">{s.carbsG}g</span>
                            <button
                              onClick={() => logMeal(key, s)}
                              className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full"
                            >
                              Log
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setStep('context')}
                className="w-full border border-gray-200 text-gray-600 font-medium py-2 rounded-xl text-sm hover:bg-gray-50"
              >
                ← Regenerate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
