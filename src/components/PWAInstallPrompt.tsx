'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const checkIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsIOS(checkIOS);

    // Check if already dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true);
      return;
    }

    // Listen for beforeinstallprompt (Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 2000);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show banner after delay
    if (checkIOS) {
      setTimeout(() => {
        if (!wasDismissed) setShowBanner(true);
      }, 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (dismissed || !showBanner) return null;

  return (
    <>
      {/* Install banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4 z-50 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-[#0b1c30] font-medium">
              {isIOS
                ? 'Add e2go to your home screen for the best experience'
                : 'Install e2go on your phone for the best experience'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isIOS ? (
              <button
                onClick={() => setShowInstructions(true)}
                className="px-4 py-2 bg-[#004ac6] text-white text-sm font-medium rounded-lg hover:bg-[#00337d] transition-colors"
              >
                How to
              </button>
            ) : (
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-[#004ac6] text-white text-sm font-medium rounded-lg hover:bg-[#00337d] transition-colors"
              >
                Install
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-[#64748b] hover:text-[#0b1c30] text-sm"
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      {/* iOS instructions modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0b1c30] mb-4">
              Add e2go to your home screen
            </h3>
            <ol className="space-y-4 text-[#45464d] mb-6">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#004ac6] text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
                <span>Tap the Share button at the bottom of your browser</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#004ac6] text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
                <span>Scroll down and tap &quot;Add to Home Screen&quot;</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#004ac6] text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
                <span>Tap &quot;Add&quot; — you are done!</span>
              </li>
            </ol>
            <button
              onClick={() => setShowInstructions(false)}
              className="w-full px-4 py-3 bg-[#004ac6] text-white font-medium rounded-lg hover:bg-[#00337d] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
