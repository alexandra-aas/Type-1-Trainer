export default function Toast({ message, type = 'success' }) {
  const bg = type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-amber-500' : 'bg-red-600';
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${bg}`}>
      {message}
    </div>
  );
}
