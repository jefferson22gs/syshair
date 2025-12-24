import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface SuccessAnimationProps {
    size?: "sm" | "md" | "lg";
    message?: string;
    onComplete?: () => void;
}

const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
};

const iconSizes = {
    sm: 24,
    md: 40,
    lg: 64,
};

export function SuccessAnimation({ size = "md", message, onComplete }: SuccessAnimationProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                }}
                onAnimationComplete={onComplete}
                className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg`}
            >
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                >
                    <Check className="text-white" size={iconSizes[size]} strokeWidth={3} />
                </motion.div>
            </motion.div>

            {message && (
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-foreground font-medium text-center"
                >
                    {message}
                </motion.p>
            )}

            {/* Confetti-like particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: "50%",
                            y: "50%",
                            scale: 0,
                            opacity: 1,
                        }}
                        animate={{
                            x: `${50 + (Math.random() - 0.5) * 100}%`,
                            y: `${50 + (Math.random() - 0.5) * 100}%`,
                            scale: [0, 1, 0],
                            opacity: [1, 1, 0],
                        }}
                        transition={{
                            duration: 0.8,
                            delay: 0.2 + i * 0.05,
                            ease: "easeOut",
                        }}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            backgroundColor: [
                                "#22c55e",
                                "#f59e0b",
                                "#3b82f6",
                                "#ec4899",
                                "#8b5cf6",
                            ][i % 5],
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

interface LoadingDotsProps {
    className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{
                        y: [0, -8, 0],
                    }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                    }}
                />
            ))}
        </div>
    );
}

interface FeedbackAnimationProps {
    type: "success" | "error" | "warning";
    message: string;
    onClose?: () => void;
}

export function FeedbackAnimation({ type, message, onClose }: FeedbackAnimationProps) {
    const colors = {
        success: "from-green-400 to-emerald-500",
        error: "from-red-400 to-rose-500",
        warning: "from-yellow-400 to-amber-500",
    };

    const icons = {
        success: "✓",
        error: "✕",
        warning: "!",
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="flex flex-col items-center gap-4 p-8"
            >
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colors[type]} flex items-center justify-center text-white text-3xl font-bold shadow-xl`}>
                    {icons[type]}
                </div>
                <p className="text-xl font-medium text-foreground text-center max-w-xs">
                    {message}
                </p>
            </motion.div>
        </motion.div>
    );
}
