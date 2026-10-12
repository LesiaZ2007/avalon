'use client';

import { useEffect, useState } from 'react';

/**
 * Offers to install Avalon as an app. Chrome, Edge and Android hand us an install prompt;
 * iPhone Safari doesn't, so there we explain Add to Home Screen. Hidden once installed.
 */
export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) return setInstalled(true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent));
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!prompt && !ios)) return null;

  if (prompt) {
    return (
      <button
        className="btn btn-ghost"
        onClick={async () => {
          prompt.prompt();
          await prompt.userChoice.catch(() => null);
          setPrompt(null);
        }}
      >
        Install the app
      </button>
    );
  }

  return (
    <div className="install-ios">
      <button className="btn btn-ghost" onClick={() => setShowHelp((s) => !s)} aria-expanded={showHelp}>
        Add to your home screen
      </button>
      {showHelp && (
        <p className="muted small">
          In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>. Avalon will open full-screen, like an app.
        </p>
      )}
    </div>
  );
}
