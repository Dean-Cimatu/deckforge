import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-warn/10 border-b border-warn/30 px-4 py-2 text-xs font-medium text-warn">
      <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
      You're offline — your decks are available to read and review grades will sync when you reconnect.
    </div>
  );
}
