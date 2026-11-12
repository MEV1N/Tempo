import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1D1D1D] border border-[#D9D9D9] dark:border-[#353535] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-colors">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#D9D9D9] dark:border-[#353535] text-[#080808] dark:text-[#F2F2F2] flex items-center justify-center shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[#080808] dark:text-[#F2F2F2]">Install Tempo as a Web App</p>
          <p className="text-[11px] text-[#777777] dark:text-[#858585]">
            Enjoy full standalone experience, offline access, and real-time push reminders.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end sm:self-auto">
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-[#777777] dark:text-[#858585] hover:text-[#080808] dark:hover:text-[#F2F2F2] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-1.5 rounded-lg bg-[#080808] dark:bg-[#252525] hover:bg-[#171717] dark:hover:bg-[#303030] text-[#FFFFFF] dark:text-[#F2F2F2] border border-transparent dark:border-[#353535] text-xs font-semibold transition shadow-xs"
        >
          Install App
        </button>
      </div>
    </div>
  );
}
