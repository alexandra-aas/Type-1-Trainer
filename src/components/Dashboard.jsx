import { useState, useEffect } from 'react';
import { getBgReadings, getTodayLog, getSettings } from '../lib/storage';
import { getLast24h, getLatestReading, getAverage, getTrend, getTimeInRange, bgColor } from '../lib/bgAnalysis';
import BGEntry from './BGEntry';
import MorningPlanner from './MorningPlanner';

export default function Dashboard({ onNavigate, showToast }) {
  const [readings, setReadings] = useState([]);
  const [todayLog, setTodayLog] = useState({ meals: [] });
  const [settings, setSettings] = useState({});
  const [showBGEntry, setShowBGEntry] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);

  function refresh() {
    setReadings(getBgReadings());
    setTodayLog(getTodayLog());
    setSettings(getSettings());
  }

  useEffect(() => {
    refresh();
  }, []);

  const last24 = getLast24h(readings);
  const latest = getLatestReading(last24);
  const avg = getAverage(last24);
  const trend = getTrend(last24);
  const tir = getTimeInRange(last24, ...(settings.targetRange ?? [70, 180]));

  const trendArrow = trend === 'rising' ? '↑' : trend === 'falling' ? '↓' : '→';
  const totalCarbsToday = todayLog.meals.reduce((s, m) => s + (m.totalCarbsG ?? 0), 0);
  const mealCount = new Set(todayLog.meals.map((m) => m.label)).size;
  const itemCount = todayLog.meals.length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {settings.childName ? `${settings.childName}'s Day` : 'Type‑1 Trainer'}
        </h1>
        <span className="text-sm text-gray-400">
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* BG Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Blood Glucose</span>
          <button
            onClick={() => setShowBGEntry(true)}
            className="text-xs text-red-600 font-medium"
          >
            + Add reading
          </button>
        </div>

        {latest ? (
          <div className="flex items-end gap-3">
            <span className={`text-5xl font-bold tabular-nums ${bgColor(latest.value, ...(settings.targetRange ?? [70, 180]))}`}>
              {latest.value}
            </span>
            <div className="pb-1">
              <div className="text-lg">{trendArrow}</div>
              <div className="text-xs text-gray-400">{settings.unitSystem ?? 'mg/dL'}</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No readings yet — add one to get started.</p>
        )}

        {last24.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Stat label="24h avg" value={avg} unit={settings.unitSystem ?? 'mg/dL'} />
            <Stat label="Time in range" value={tir != null ? `${tir}%` : '—'} />
            <Stat label="Readings" value={last24.length} />
          </div>
        )}
      </div>

      {/* Today's meals summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Today's Meals</span>
          <button onClick={() => onNavigate('log')} className="text-xs text-red-600 font-medium">
            View all
          </button>
        </div>
        {mealCount > 0 ? (
          <div className="flex items-center gap-4">
            <div>
              <span className="text-3xl font-bold text-gray-900">{totalCarbsToday}g</span>
              <span className="text-sm text-gray-400 ml-1">carbs</span>
            </div>
            <span className="text-sm text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''} across {mealCount} meal{mealCount !== 1 ? 's' : ''}</span>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No meals logged yet today.</p>
        )}
      </div>

      {/* Plan the day CTA */}
      <button
        onClick={() => setShowPlanner(true)}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-2xl text-base shadow transition-colors"
      >
        Plan today's meals ✨
      </button>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('log')}
          className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-left"
        >
          <div className="text-2xl mb-1">📋</div>
          <div className="text-sm font-medium text-gray-700">Log a meal</div>
          <div className="text-xs text-gray-400">USDA search or favorites</div>
        </button>
        <button
          onClick={() => onNavigate('favorites')}
          className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-left"
        >
          <div className="text-2xl mb-1">⭐</div>
          <div className="text-sm font-medium text-gray-700">Favorites</div>
          <div className="text-xs text-gray-400">One-tap from saved foods</div>
        </button>
      </div>

      {showBGEntry && (
        <BGEntry
          onClose={() => { setShowBGEntry(false); refresh(); }}
          showToast={showToast}
        />
      )}

      {showPlanner && (
        <MorningPlanner
          readings={readings}
          settings={settings}
          onClose={() => { setShowPlanner(false); refresh(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2 text-center">
      <div className="text-lg font-bold text-gray-800">{value ?? '—'}</div>
      {unit && <div className="text-xs text-gray-400">{unit}</div>}
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
