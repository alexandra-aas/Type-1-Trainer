import { useState, useRef } from 'react';
import { saveBgReading, saveBgReadings } from '../lib/storage';
import { scanDexcom } from '../lib/claude';
import { resizeImageToBase64 } from '../lib/imageResize';
import Spinner from './Spinner';

const TREND_LABEL = {
  rising_fast: '↑↑ Rising fast',
  rising: '↑ Rising',
  stable: '→ Stable',
  falling: '↓ Falling',
  falling_fast: '↓↓ Falling fast',
};

export default function BGEntry({ onClose, showToast }) {
  const [value, setValue] = useState('');
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
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

  async function handleScreenshot(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanResult(null);
    try {
      const { base64, mimeType } = await resizeImageToBase64(file);
      const data = await scanDexcom({ imageBase64: base64, mimeType });
      setScanResult(data);
      if (data.currentBg) setValue(String(data.currentBg));
    } catch {
      showToast('Could not read screenshot — check Claude API key', 'error');
    } finally {
      setScanning(false);
    }
  }

  function handleSaveScan() {
    if (!scanResult?.currentBg) return;
    const today = new Date().toISOString().slice(0, 10);
    const readings = [];

    readings.push({
      ts: `${today}T${time}:00`,
      value: scanResult.currentBg,
      unit: scanResult.unit ?? 'mg/dL',
      source: 'dexcom_scan',
      trend: scanResult.trendArrow,
    });

    if (scanResult.visibleReadings?.length) {
      scanResult.visibleReadings.forEach((v, i) => {
        if (v && v !== scanResult.currentBg) {
          const minBack = (i + 1) * 5;
          const ts = new Date(Date.now() - minBack * 60000).toISOString();
          readings.push({ ts, value: v, unit: scanResult.unit ?? 'mg/dL', source: 'dexcom_scan' });
        }
      });
    }

    saveBgReadings(readings);
    showToast(`Saved ${readings.length} reading${readings.length !== 1 ? 's' : ''} from screenshot`);
    onClose();
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-500 mb-1 block">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl">
            Save reading
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-gray-400">or scan</span>
          </div>
        </div>

        {/* Dexcom screenshot scan */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {scanning ? <><Spinner size="sm" /> Reading screenshot…</> : '📱 Scan Dexcom Follow screenshot'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />

        {/* Scan result preview */}
        {scanResult && (
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-4xl font-bold text-gray-900">{scanResult.currentBg ?? '—'}</span>
                <span className="text-sm text-gray-400 ml-1">{scanResult.unit ?? 'mg/dL'}</span>
              </div>
              {scanResult.trendArrow && (
                <span className="text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3 py-1 rounded-full">
                  {TREND_LABEL[scanResult.trendArrow] ?? scanResult.trendArrow}
                </span>
              )}
            </div>
            {scanResult.visibleReadings?.length > 0 && (
              <p className="text-xs text-gray-400">
                +{scanResult.visibleReadings.length} additional readings detected from graph
              </p>
            )}
            <button
              onClick={handleSaveScan}
              className="w-full bg-red-600 text-white font-semibold py-2.5 rounded-xl"
            >
              Save from screenshot
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Screenshot Dexcom Follow app and upload — Claude reads the current value and trend
        </p>
      </div>
    </div>
  );
}
