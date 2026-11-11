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
    <div className="bg-gradient-to-r from-sky-950/80 to-indigo-950/80 border border-sky-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">Install Tempo as a Web App</p>
          <p className="text-[11px] text-slate-400">
            Enjoy full standalone experience, offline access, and real-time push reminders.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end sm:self-auto">
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-md shadow-sky-500/20"
        >
          Install App
        </button>
      </div>
    </div>
  );
}
