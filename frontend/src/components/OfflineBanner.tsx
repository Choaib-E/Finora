import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState<boolean>(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-[#F59E0B] text-[#111827] px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 text-center">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Vous êtes hors ligne. Les opérations financières nécessitent une connexion au serveur.
      </span>
    </div>
  );
};
