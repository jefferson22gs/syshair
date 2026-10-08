import { tourSelector, type TourId } from "./tourIds";

/** Elemento visível na viewport (exclui menu lateral escondido fora da tela, elementos com display:none etc.). */
export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  // Fora da tela na horizontal (ex.: sidebar mobile com translate-x-full).
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
  return true;
}

/** Primeiro elemento visível com o `data-tour` informado (pode haver um para mobile e outro para desktop). */
export function findTarget(id: TourId): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(tourSelector(id));
  for (const el of Array.from(all)) if (isVisible(el)) return el;
  return null;
}

/**
 * Espera o alvo aparecer sem setTimeout fixo: confere a cada mutação do DOM (página carregando,
 * dialog abrindo, aba trocando) e a cada frame de animação (menu deslizando). Desiste após `timeoutMs`.
 */
export function waitForTarget(id: TourId, timeoutMs: number, signal: AbortSignal): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const found = findTarget(id);
    if (found) return resolve(found);

    let raf = 0;
    let done = false;
    const finish = (el: HTMLElement | null) => {
      if (done) return;
      done = true;
      observer.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve(el);
    };
    const check = () => {
      const el = findTarget(id);
      if (el) finish(el);
    };
    const loop = () => {
      check();
      if (!done) raf = requestAnimationFrame(loop);
    };
    const onAbort = () => finish(null);

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-state", "hidden"] });
    raf = requestAnimationFrame(loop);
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    signal.addEventListener("abort", onAbort);
  });
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
