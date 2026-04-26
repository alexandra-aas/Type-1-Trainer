import { useState } from 'react';
import Dashboard from './components/Dashboard';
import MealLog from './components/MealLog';
import FavoritesShelf from './components/FavoritesShelf';
import Settings from './components/Settings';
import Toast from './components/Toast';

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'log', label: 'Log', icon: '📋' },
  { id: 'favorites', label: 'Favorites', icon: '⭐' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white shadow-sm">
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && (
          <Dashboard onNavigate={setActiveTab} showToast={showToast} />
        )}
        {activeTab === 'log' && (
          <MealLog showToast={showToast} />
        )}
        {activeTab === 'favorites' && (
          <FavoritesShelf standalone showToast={showToast} onNavigateLog={() => setActiveTab('log')} />
        )}
        {activeTab === 'settings' && (
          <Settings showToast={showToast} />
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'text-red-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl leading-none mb-0.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
