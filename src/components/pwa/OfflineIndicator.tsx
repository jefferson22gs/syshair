import { usePWA } from '@/hooks/usePWA';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-warning/90 text-warning-foreground px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium shadow-lg backdrop-blur-sm">
      <WifiOff size={16} />
      <span>Offline</span>
    </div>
  );
};
