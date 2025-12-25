'use client';

import { useEffect, useRef, useState } from 'react';

// The BeforeInstallPromptEvent type is not included in TS lib.dom by default.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

declare global {
  interface Window {
    mangwaleInstall?: () => Promise<boolean>;
    mangwaleIsInstallable?: boolean;
    mangwaleIsInstalled?: boolean;
  }
}

export function ServiceWorkerRegistration() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });
  const didRegisterRef = useRef(false);

  useEffect(() => {
    // Service workers in Next.js dev often cause confusing "page reset"/cache behavior.
    // Only register in production.
    if (process.env.NODE_ENV !== 'production') return;

    // Register service worker
    if ('serviceWorker' in navigator) {
      if (didRegisterRef.current) return;
      didRegisterRef.current = true;

      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available
                  console.log('[PWA] New content available, refresh to update');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    // Handle install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log('[PWA] App is installable');
    };

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('[PWA] App was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Expose install function globally for use in UI
  useEffect(() => {
    window.mangwaleInstall = async () => {
      if (!deferredPrompt) return false;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      }
      return false;
    };

    window.mangwaleIsInstallable = isInstallable;
    window.mangwaleIsInstalled = isInstalled;
  }, [deferredPrompt, isInstallable, isInstalled]);

  return null;
}

// Hook for components to use
export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      setIsInstallable(window.mangwaleIsInstallable || false);
      setIsInstalled(window.mangwaleIsInstalled || false);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const install = async () => {
    if (window.mangwaleInstall) {
      return window.mangwaleInstall();
    }
    return false;
  };

  return { isInstallable, isInstalled, install };
}
