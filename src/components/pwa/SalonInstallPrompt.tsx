import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SalonInstallPromptProps {
  salonName: string;
  salonSlug: string;
  salonLogo?: string;
  salonThemeColor?: string;
}

export const SalonInstallPrompt = ({
  salonName,
  salonSlug,
  salonLogo,
  salonThemeColor = '#c9a227'
}: SalonInstallPromptProps) => {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user dismissed this salon's install prompt
    const dismissKey = `pwa-install-dismissed-${salonSlug}`;
    const wasDismissed = localStorage.getItem(dismissKey);

    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed);
      // Show again after 7 days
      if (Date.now() - dismissedTime > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(dismissKey);
      } else {
        setDismissed(true);
      }
    }
  }, [salonSlug]);

  useEffect(() => {
    // Update manifest dynamically for this salon
    const updateManifest = () => {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink) {
        // Create dynamic manifest URL with salon data
        const manifestData = {
          name: `${salonName} - Agendamento`,
          short_name: salonName,
          description: `Agende seus serviços no ${salonName}`,
          theme_color: salonThemeColor,
          background_color: '#0d1117',
          display: 'standalone',
          orientation: 'portrait',
          scope: `/s/${salonSlug}/`,
          start_url: `/s/${salonSlug}?source=pwa`,
          icons: [
            {
              src: salonLogo || '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: salonLogo || '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: salonLogo || '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        };

        // Create blob URL for dynamic manifest
        const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(manifestBlob);
        manifestLink.href = manifestURL;
      }

      // Update theme color meta tag
      let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        document.head.appendChild(themeColorMeta);
      }
      themeColorMeta.content = salonThemeColor;
    };

    updateManifest();
  }, [salonName, salonSlug, salonLogo, salonThemeColor]);

  useEffect(() => {
    if (isInstallable && !isInstalled && !dismissed) {
      // Show prompt after 5 seconds on salon page
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowPrompt(false);
      // Store that user installed this salon's app
      localStorage.setItem(`pwa-installed-${salonSlug}`, Date.now().toString());
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem(`pwa-install-dismissed-${salonSlug}`, Date.now().toString());
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[99] glass-card rounded-2xl p-4 border border-primary/20 shadow-gold"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-secondary transition-colors"
          >
            <X size={18} className="text-muted-foreground" />
          </button>

          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: salonThemeColor }}
            >
              {salonLogo ? (
                <img src={salonLogo} alt={salonName} className="w-full h-full object-cover" />
              ) : (
                <Smartphone size={24} className="text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-bold text-foreground mb-1">
                Instalar {salonName}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Instale o app para agendar rapidamente e receber notificações
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1"
                >
                  <Download size={16} className="mr-2" />
                  Instalar App
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                >
                  Agora não
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
