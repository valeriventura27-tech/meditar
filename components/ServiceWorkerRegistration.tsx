'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let reloading = false;

    // A new worker took control → the page is still running the old bundle.
    // Reload once so every device picks up the new code without a manual refresh.
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      // updateViaCache: 'none' keeps the browser from serving sw.js from its own
      // HTTP cache, which is what makes an installed PWA go stale for days.
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        registration = reg;
        reg.update();
      })
      .catch(() => {/* SW not critical */});

    // Check again whenever the app comes back to the foreground.
    const onVisible = () => {
      if (document.visibilityState === 'visible') registration?.update();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return null;
}
