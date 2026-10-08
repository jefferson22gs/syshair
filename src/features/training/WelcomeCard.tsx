import { Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTraining } from "./TrainingProvider";
import { useFirstSteps } from "./useFirstSteps";

const WELCOME_KEY = "welcome";
const WELCOME_VERSION = 1;

/**
 * Boas-vindas depois que o salão existe. Aparece uma vez por usuário e salão, não bloqueia nada
 * e não aparece para quem já usa o sistema (salão com serviços, equipe e agendamentos).
 */
export function WelcomeCard() {
  const { progress, startTour } = useTraining();
  const { hasSalon, isLoading, snapshot, nextTask } = useFirstSteps();
  const record = progress.get(WELCOME_KEY, WELCOME_VERSION);

  if (isLoading || progress.isLoading || !hasSalon || !snapshot) return null;
  if (record && record.status !== "in_progress") return null;
  const experienced = snapshot.services > 0 && snapshot.professionals > 0 && snapshot.appointments > 0;
  if (experienced && !record) return null;

  const close = (status: "completed" | "skipped") =>
    progress.save({ key: WELCOME_KEY, version: WELCOME_VERSION, kind: "welcome", status });

  const startGuided = async () => {
    await close("completed");
    // Começa pelo que falta: o checklist define a prioridade (serviços → profissionais → link...).
    await startTour(nextTask?.tourId ?? "overview");
  };

  return (
    <Card className="glass-card border-primary/30" data-tour="welcome-card">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-gold-light flex items-center justify-center flex-shrink-0">
            <Sparkles className="text-primary-foreground" size={22} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-xl font-bold">Seu salão está criado!</h2>
              <button
                type="button"
                onClick={() => void close("skipped")}
                className="p-1 -m-1 rounded-md text-muted-foreground hover:text-foreground"
                aria-label="Fechar boas-vindas"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Agora vamos preparar o SysHair para receber seus clientes. Eu mostro onde clicar, passo a passo.
              Você pode parar quando quiser e continuar depois pelo botão <strong>Ajuda</strong>.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="gold" onClick={() => void startGuided()}>
                Começar configuração guiada
              </Button>
              <Button variant="outline" onClick={() => void startTour("overview").then(() => close("completed"))}>
                Conhecer o sistema
              </Button>
              <Button variant="ghost" onClick={() => void close("skipped")}>
                Explorar sozinho
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
