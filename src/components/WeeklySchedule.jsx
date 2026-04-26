import { useState, useEffect } from 'react';
import { getSchedule, saveSchedule } from '../lib/storage';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const EMPTY_INPUT = { name: '', time: '' };

function fmt12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`;
}

export default function WeeklySchedule({ onClose, showToast }) {
  const [schedule, setSchedule] = useState({});
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(DAYS.map((d) => [d, { ...EMPTY_INPUT }]))
  );

  useEffect(() => {
    setSchedule(getSchedule());
  }, []);

  function setInput(day, field, value) {
    setInputs((p) => ({ ...p, [day]: { ...p[day], [field]: value } }));
  }

  function addActivity(day) {
    const { name, time } = inputs[day];
    if (!name.trim()) return;
    setSchedule((p) => ({ ...p, [day]: [...(p[day] ?? []), { name: name.trim(), time }] }));
    setInputs((p) => ({ ...p, [day]: { ...EMPTY_INPUT } }));
  }

  function removeActivity(day, idx) {
    setSchedule((p) => ({ ...p, [day]: p[day].filter((_, i) => i !== idx) }));
  }

  function handleSave() {
    saveSchedule(schedule);
    showToast('Schedule saved');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Weekly Schedule</h2>
          <button onClick={handleSave} className="text-green-600 font-semibold text-sm">Save</button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {DAYS.map((day) => (
            <div key={day}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">{DAY_LABELS[day]}</h3>

              <div className="flex flex-wrap gap-1 mb-1">
                {(schedule[day] ?? []).map((act, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full"
                  >
                    {act.name}
                    {act.time && (
                      <span className="text-green-500 font-medium">{fmt12(act.time)}</span>
                    )}
                    <button
                      onClick={() => removeActivity(day, i)}
                      className="text-green-400 hover:text-red-500 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputs[day].name}
                  onChange={(e) => setInput(day, 'name', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addActivity(day)}
                  placeholder="Activity…"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="time"
                  value={inputs[day].time}
                  onChange={(e) => setInput(day, 'time', e.target.value)}
                  className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={() => addActivity(day)}
                  className="text-sm bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
