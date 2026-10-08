import { lazy, Suspense } from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOptionalTraining } from "./TrainingProvider";
import { LAYOUT_IDS } from "./tourIds";

// Painel carrega sob demanda: o Dashboard não paga o custo da busca/artigos.
const HelpPanel = lazy(() => import("./HelpPanel"));

const Loading = () => <div className="p-6 text-sm text-muted-foreground">Carregando ajuda…</div>;

/** Botão "Ajuda" do cabeçalho do painel. Popover no computador, painel inferior no celular. */
export function HelpButton() {
  const training = useOptionalTraining();
  const isMobile = useIsMobile();
  if (!training?.isAdminArea) return null;
  const { helpOpen, setHelpOpen } = training;

  const trigger = (
    <button
      type="button"
      data-tour={LAYOUT_IDS.helpButton}
      onClick={isMobile ? () => setHelpOpen(true) : undefined}
      className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors touch-target"
      aria-label="Ajuda e treinamento"
      aria-haspopup="dialog"
      aria-expanded={helpOpen}
    >
      <HelpCircle size={18} className="text-primary" aria-hidden />
      <span className="hidden sm:inline">Ajuda</span>
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-0">
            <SheetHeader className="px-4 pt-4 text-left">
              <SheetTitle>Ajuda e treinamento</SheetTitle>
              <SheetDescription>Aprenda a usar esta tela ou busque um assunto.</SheetDescription>
            </SheetHeader>
            <Suspense fallback={<Loading />}>
              <HelpPanel />
            </Suspense>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={helpOpen} onOpenChange={setHelpOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 max-h-[80vh] overflow-y-auto" aria-label="Ajuda e treinamento">
        <div className="px-4 pt-4">
          <p className="font-semibold">Ajuda e treinamento</p>
          <p className="text-xs text-muted-foreground">Aprenda a usar esta tela ou busque um assunto.</p>
        </div>
        <Suspense fallback={<Loading />}>
          <HelpPanel />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}
