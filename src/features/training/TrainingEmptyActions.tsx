import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOptionalTraining } from "./TrainingProvider";

interface Props {
  tourId: string;
  label?: string;
  className?: string;
}

/** Botão "Ver como funciona" para estados vazios: inicia o tour da tela. Não renderiza fora do painel admin. */
export function TrainingEmptyActions({ tourId, label = "Ver como funciona", className }: Props) {
  const training = useOptionalTraining();
  if (!training?.isAdminArea) return null;
  return (
    <Button variant="outline" size="sm" className={cn(className)} onClick={() => void training.startTour(tourId)}>
      <PlayCircle size={16} className="mr-2" aria-hidden />
      {label}
    </Button>
  );
}
