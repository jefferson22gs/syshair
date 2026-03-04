import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X, CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";

export const SubscriptionWarningBanner = () => {
    const { subscription, showPaymentWarning, warningMessage } = useSubscription();
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);

    if (!showPaymentWarning || dismissed || !subscription) {
        return null;
    }

    const isUrgent = subscription.status === 'expired' ||
        subscription.status === 'pending' ||
        subscription.daysRemaining <= 1;

    const bgColor = isUrgent
        ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30"
        : "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30";

    const iconColor = isUrgent ? "text-red-500" : "text-yellow-500";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`${bgColor} border-b px-4 py-3`}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isUrgent ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                            {isUrgent ? (
                                <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
                            ) : (
                                <Clock className={`w-5 h-5 ${iconColor}`} />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {warningMessage}
                            </p>
                            {subscription.isTrial && (
                                <p className="text-xs text-muted-foreground">
                                    Teste gratuito: {subscription.daysRemaining} dia(s) restante(s)
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => navigate('/admin/subscription')}
                            className="gap-2"
                        >
                            <CreditCard className="w-4 h-4" />
                            {subscription.isTrial ? 'Assinar Agora' : 'Renovar'}
                        </Button>

                        {!isUrgent && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDismissed(true)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
