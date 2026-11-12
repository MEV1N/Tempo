import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-[#171717] border-b border-[#080808] text-[#FFFFFF] text-xs py-2 px-4 sticky top-16 z-40 backdrop-blur flex items-center justify-center space-x-2">
      <WifiOff className="w-3.5 h-3.5" />
      <span>
        You are currently offline. Application shell is active; changes will sync when connected.
      </span>
    </div>
  );
}
