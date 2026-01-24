import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

interface CancellationReason {
    id: string;
    label: string;
    icon?: string;
}

const defaultReasons: CancellationReason[] = [
    { id: "personal", label: "Compromisso pessoal", icon: "👤" },
    { id: "health", label: "Problema de saúde", icon: "🏥" },
    { id: "rescheduling", label: "Preciso remarcar", icon: "📅" },
    { id: "found_other", label: "Encontrei outro profissional", icon: "✂️" },
    { id: "price", label: "Preço muito alto", icon: "💰" },
    { id: "waiting", label: "Tempo de espera", icon: "⏰" },
    { id: "other", label: "Outro motivo", icon: "📝" },
];

interface CancellationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: string;
    appointmentDetails?: {
        service: string;
        date: string;
        time: string;
        client: string;
    };
    reasons?: CancellationReason[];
    onConfirm: (reason: string, details?: string) => Promise<void>;
}

export function CancellationModal({
    open,
    onOpenChange,
    appointmentId,
    appointmentDetails,
    reasons = defaultReasons,
    onConfirm,
}: CancellationModalProps) {
    const [selectedReason, setSelectedReason] = useState<string>("");
    const [additionalDetails, setAdditionalDetails] = useState("");
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selectedReason) {
            toast.error("Selecione um motivo");
            return;
        }

        setLoading(true);
        try {
            const reason = reasons.find(r => r.id === selectedReason);
            await onConfirm(
                reason?.label || selectedReason,
                additionalDetails.trim() || undefined
            );
            onOpenChange(false);
            resetForm();
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedReason("");
        setAdditionalDetails("");
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) resetForm();
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle size={20} />
                        Cancelar Agendamento
                    </DialogTitle>
                    <DialogDescription>
                        Informe o motivo do cancelamento para nos ajudar a melhorar.
                    </DialogDescription>
                </DialogHeader>

                {appointmentDetails && (
                    <div className="p-3 rounded-lg bg-secondary/50 text-sm space-y-1">
                        <p><strong>Serviço:</strong> {appointmentDetails.service}</p>
                        <p><strong>Data:</strong> {appointmentDetails.date} às {appointmentDetails.time}</p>
                        <p><strong>Cliente:</strong> {appointmentDetails.client}</p>
                    </div>
                )}

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Motivo do cancelamento *</Label>
                        <RadioGroup
                            value={selectedReason}
                            onValueChange={setSelectedReason}
                            className="space-y-2"
                        >
                            {reasons.map((reason) => (
                                <div
                                    key={reason.id}
                                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedReason === reason.id
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:bg-secondary/50"
                                        }`}
                                    onClick={() => setSelectedReason(reason.id)}
                                >
                                    <RadioGroupItem value={reason.id} id={reason.id} />
                                    <Label htmlFor={reason.id} className="flex-1 cursor-pointer">
                                        {reason.icon && <span className="mr-2">{reason.icon}</span>}
                                        {reason.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {selectedReason === "other" && (
                        <div className="space-y-2">
                            <Label>Descreva o motivo</Label>
                            <Textarea
                                value={additionalDetails}
                                onChange={(e) => setAdditionalDetails(e.target.value)}
                                placeholder="Conte-nos mais sobre o motivo..."
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Voltar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!selectedReason || loading}
                    >
                        {loading ? (
                            "Cancelando..."
                        ) : (
                            <>
                                <X size={16} className="mr-2" />
                                Confirmar Cancelamento
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
