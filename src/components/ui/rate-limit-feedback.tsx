import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RateLimitFeedbackProps {
    attemptsRemaining: number;
    maxAttempts: number;
    cooldownSeconds?: number;
    onCooldownComplete?: () => void;
    className?: string;
}

export function RateLimitFeedback({
    attemptsRemaining,
    maxAttempts,
    cooldownSeconds = 0,
    onCooldownComplete,
    className,
}: RateLimitFeedbackProps) {
    const [countdown, setCountdown] = useState(cooldownSeconds);
    const isLocked = countdown > 0;
    const attemptsUsed = maxAttempts - attemptsRemaining;
    const percentage = (attemptsUsed / maxAttempts) * 100;

    useEffect(() => {
        if (cooldownSeconds > 0) {
            setCountdown(cooldownSeconds);
        }
    }, [cooldownSeconds]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        onCooldownComplete?.();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [countdown, onCooldownComplete]);

    const getColor = () => {
        if (isLocked) return "red";
        if (attemptsRemaining <= 1) return "red";
        if (attemptsRemaining <= 2) return "amber";
        return "emerald";
    };

    const color = getColor();

    const colorClasses = {
        emerald: {
            bg: "bg-emerald-500/10",
            text: "text-emerald-500",
            bar: "bg-emerald-500",
        },
        amber: {
            bg: "bg-amber-500/10",
            text: "text-amber-500",
            bar: "bg-amber-500",
        },
        red: {
            bg: "bg-red-500/10",
            text: "text-red-500",
            bar: "bg-red-500",
        },
    };

    if (attemptsRemaining === maxAttempts && !isLocked) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                    "p-3 rounded-lg border",
                    colorClasses[color].bg,
                    "border-current/20",
                    className
                )}
            >
                <div className="flex items-center gap-3">
                    {isLocked ? (
                        <Clock className={cn("flex-shrink-0", colorClasses[color].text)} size={20} />
                    ) : (
                        <AlertCircle className={cn("flex-shrink-0", colorClasses[color].text)} size={20} />
                    )}

                    <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium", colorClasses[color].text)}>
                            {isLocked ? (
                                `Aguarde ${countdown}s para tentar novamente`
                            ) : attemptsRemaining === 0 ? (
                                "Limite de tentativas atingido"
                            ) : (
                                `${attemptsRemaining} tentativa${attemptsRemaining !== 1 ? "s" : ""} restante${attemptsRemaining !== 1 ? "s" : ""}`
                            )}
                        </p>

                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-current/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                className={cn("h-full rounded-full", colorClasses[color].bar)}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Hook for rate limiting
interface UseRateLimitOptions {
    maxAttempts: number;
    cooldownSeconds: number;
    storageKey?: string;
}

export function useRateLimit({ maxAttempts, cooldownSeconds, storageKey }: UseRateLimitOptions) {
    const [attempts, setAttempts] = useState(0);
    const [lockedUntil, setLockedUntil] = useState<number | null>(null);

    // Load from storage on mount
    useEffect(() => {
        if (storageKey) {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const { attempts: storedAttempts, lockedUntil: storedLockedUntil } = JSON.parse(stored);
                setAttempts(storedAttempts);
                if (storedLockedUntil && storedLockedUntil > Date.now()) {
                    setLockedUntil(storedLockedUntil);
                }
            }
        }
    }, [storageKey]);

    // Persist to storage
    useEffect(() => {
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify({ attempts, lockedUntil }));
        }
    }, [attempts, lockedUntil, storageKey]);

    const isLocked = lockedUntil !== null && lockedUntil > Date.now();
    const attemptsRemaining = Math.max(0, maxAttempts - attempts);
    const cooldownRemaining = isLocked
        ? Math.ceil((lockedUntil - Date.now()) / 1000)
        : 0;

    const recordAttempt = () => {
        if (isLocked) return false;

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= maxAttempts) {
            setLockedUntil(Date.now() + cooldownSeconds * 1000);
            return false;
        }

        return true;
    };

    const reset = () => {
        setAttempts(0);
        setLockedUntil(null);
    };

    const onCooldownComplete = () => {
        setLockedUntil(null);
        setAttempts(0);
    };

    return {
        attemptsRemaining,
        maxAttempts,
        isLocked,
        cooldownRemaining,
        recordAttempt,
        reset,
        onCooldownComplete,
    };
}
