import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, BellOff, X, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface NotificationPromptProps {
  onDismiss?: () => void;
}

export const NotificationPrompt = ({ onDismiss }: NotificationPromptProps) => {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show prompt after a delay if notifications are supported and not decided
    if (isSupported && permission === 'default') {
      const dismissed = localStorage.getItem('notification-prompt-dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowPrompt(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSupported, permission]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const subscription = await subscribe();
      if (subscription) {
        toast.success('Notificações ativadas com sucesso!');
        setShowPrompt(false);
      } else {
        toast.error('Não foi possível ativar as notificações');
      }
    } catch (error) {
      toast.error('Erro ao ativar notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await unsubscribe();
      toast.success('Notificações desativadas');
    } catch (error) {
      toast.error('Erro ao desativar notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
    onDismiss?.();
  };

  if (!isSupported) return null;

  return (
    <AnimatePresence>
      {showPrompt && permission === 'default' && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[90]"
        >
          <Card className="glass-card border-primary/20 shadow-gold overflow-hidden">
            <CardContent className="p-4">
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-secondary transition-colors"
              >
                <X size={18} className="text-muted-foreground" />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-gold-light flex items-center justify-center flex-shrink-0">
                  <Bell size={24} className="text-primary-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">
                    Ativar notificações?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Receba lembretes de agendamentos e atualizações importantes
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={handleEnable}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Bell size={16} className="mr-2" />
                      Ativar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      disabled={loading}
                    >
                      Agora não
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Settings component for notification management
export const NotificationSettings = () => {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    subscribe, 
    unsubscribe,
    showNotification 
  } = usePushNotifications();
  
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success('Notificações desativadas');
      } else {
        const subscription = await subscribe();
        if (subscription) {
          toast.success('Notificações ativadas!');
          // Show a test notification
          setTimeout(() => {
            showNotification('SysHair', {
              body: 'Notificações ativadas com sucesso! Você receberá lembretes de agendamentos.',
            });
          }, 1000);
        }
      }
    } catch (error) {
      toast.error('Erro ao alterar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    const success = await showNotification('Teste de Notificação', {
      body: 'Esta é uma notificação de teste do SysHair!',
      tag: 'test-notification',
    });
    
    if (success) {
      toast.success('Notificação de teste enviada!');
    } else {
      toast.error('Não foi possível enviar a notificação');
    }
  };

  if (!isSupported) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle size={20} />
            <p className="text-sm">Notificações push não são suportadas neste navegador</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card className="glass-card border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BellOff size={20} className="text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">Notificações bloqueadas</p>
              <p className="text-sm text-muted-foreground">
                Você bloqueou as notificações. Para ativá-las, acesse as configurações do seu navegador.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isSubscribed ? 'bg-success/10' : 'bg-secondary'
            }`}>
              {isSubscribed ? (
                <Bell size={20} className="text-success" />
              ) : (
                <BellOff size={20} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">Notificações Push</p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed ? 'Ativadas' : 'Desativadas'}
              </p>
            </div>
          </div>

          <Button
            variant={isSubscribed ? 'outline' : 'gold'}
            size="sm"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading ? (
              'Processando...'
            ) : isSubscribed ? (
              'Desativar'
            ) : (
              'Ativar'
            )}
          </Button>
        </div>

        {isSubscribed && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestNotification}
              className="w-full"
            >
              Enviar notificação de teste
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
