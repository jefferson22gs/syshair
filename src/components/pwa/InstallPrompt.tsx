import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed);
      // Show again after 3 days
      if (Date.now() - dismissedTime > 3 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('pwa-install-dismissed');
      } else {
        setDismissed(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <WifiOff size={16} />
            <span>Você está offline. Alguns recursos podem estar indisponíveis.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install Prompt */}
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-gold-light flex items-center justify-center flex-shrink-0">
                <Smartphone size={24} className="text-primary-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-foreground mb-1">
                  Instalar SysHair
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Instale o app para acesso rápido e funcionamento offline
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleInstall}
                    className="flex-1"
                  >
                    <Download size={16} className="mr-2" />
                    Instalar
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
    </>
  );
};
