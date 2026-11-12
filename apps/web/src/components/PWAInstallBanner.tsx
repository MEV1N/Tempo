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
    <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] border border-[#D9D9D9] text-[#080808] flex items-center justify-center shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[#080808]">Install Tempo as a Web App</p>
          <p className="text-[11px] text-[#777777]">
            Enjoy full standalone experience, offline access, and real-time push reminders.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end sm:self-auto">
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-1.5 rounded-lg bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] text-xs font-semibold transition"
        >
          Install App
        </button>
      </div>
    </div>
  );
}
