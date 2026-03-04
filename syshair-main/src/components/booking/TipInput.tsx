import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, DollarSign, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TipOption {
    percentage: number;
    label: string;
    emoji?: string;
}

interface TipInputProps {
    baseAmount: number;
    currency?: string;
    options?: TipOption[];
    onTipChange: (tipAmount: number, percentage: number) => void;
    className?: string;
}

const defaultOptions: TipOption[] = [
    { percentage: 0, label: "Sem gorjeta", emoji: "😊" },
    { percentage: 10, label: "10%", emoji: "👍" },
    { percentage: 15, label: "15%", emoji: "🙏" },
    { percentage: 20, label: "20%", emoji: "💖" },
    { percentage: 25, label: "25%", emoji: "⭐" },
];

export function TipInput({
    baseAmount,
    currency = "R$",
    options = defaultOptions,
    onTipChange,
    className,
}: TipInputProps) {
    const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState<string>("");
    const [showCustom, setShowCustom] = useState(false);

    const handleOptionSelect = (percentage: number) => {
        setSelectedPercentage(percentage);
        setShowCustom(false);
        setCustomAmount("");
        const tipAmount = (baseAmount * percentage) / 100;
        onTipChange(tipAmount, percentage);
    };

    const handleCustomInput = (value: string) => {
        // Only allow numbers and decimals
        const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
        setCustomAmount(cleaned);
        setSelectedPercentage(null);

        const amount = parseFloat(cleaned) || 0;
        const percentage = baseAmount > 0 ? (amount / baseAmount) * 100 : 0;
        onTipChange(amount, percentage);
    };

    const getTipAmount = () => {
        if (customAmount) {
            return parseFloat(customAmount) || 0;
        }
        if (selectedPercentage !== null) {
            return (baseAmount * selectedPercentage) / 100;
        }
        return 0;
    };

    const tipAmount = getTipAmount();
    const totalAmount = baseAmount + tipAmount;

    return (
        <Card className={cn("p-4 glass-card", className)}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2 text-lg font-medium">
                    <Heart className="text-rose-500" size={20} />
                    <span>Gorjeta para o profissional</span>
                </div>

                <p className="text-sm text-muted-foreground">
                    Mostre sua gratidão pelo excelente trabalho! 💇
                </p>

                {/* Tip options grid */}
                <div className="grid grid-cols-3 gap-2">
                    {options.slice(0, 3).map((option) => (
                        <motion.button
                            key={option.percentage}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleOptionSelect(option.percentage)}
                            className={cn(
                                "p-3 rounded-xl border-2 transition-all text-center",
                                selectedPercentage === option.percentage && !showCustom
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <span className="text-xl">{option.emoji}</span>
                            <p className="font-medium text-sm mt-1">{option.label}</p>
                            {option.percentage > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {currency} {((baseAmount * option.percentage) / 100).toFixed(2)}
                                </p>
                            )}
                        </motion.button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {options.slice(3).map((option) => (
                        <motion.button
                            key={option.percentage}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleOptionSelect(option.percentage)}
                            className={cn(
                                "p-3 rounded-xl border-2 transition-all text-center",
                                selectedPercentage === option.percentage && !showCustom
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <span className="text-xl">{option.emoji}</span>
                            <p className="font-medium text-sm mt-1">{option.label}</p>
                            <p className="text-xs text-muted-foreground">
                                {currency} {((baseAmount * option.percentage) / 100).toFixed(2)}
                            </p>
                        </motion.button>
                    ))}
                </div>

                {/* Custom amount */}
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCustom(!showCustom)}
                        className="text-primary"
                    >
                        <Sparkles size={14} className="mr-2" />
                        Valor personalizado
                    </Button>

                    {showCustom && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-2 flex items-center gap-2"
                        >
                            <span className="text-muted-foreground">{currency}</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={customAmount}
                                onChange={(e) => handleCustomInput(e.target.value)}
                                placeholder="0,00"
                                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </motion.div>
                    )}
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-border space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Serviço</span>
                        <span>{currency} {baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gorjeta</span>
                        <span className="text-rose-500">+ {currency} {tipAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                        <span>Total</span>
                        <span className="text-primary">{currency} {totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
