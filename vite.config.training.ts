import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/** Exclusivo desenvolvimento: NÃO é usado por npm run build/deploy. Sem .env, sem PWA. */
function trainingIsolation(): Plugin {
  return {
    name: "training-isolation",
    enforce: "pre",
    resolveId(source) {
      if (/integrations\/supabase\/client(?:\.ts)?$/.test(source)) return path.resolve(__dirname, "src/features/training/demo/mockSupabase.ts");
      return null;
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        // CSP bloqueia todos os serviços externos, inclusive fetch direto, imagens, frames e formulários.
        // Guarda clássico síncrono executa antes de qualquer módulo do aplicativo.
        return html.replace("<head>", `<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws://127.0.0.1:8081 ws://localhost:8081; font-src 'self' data:; frame-src 'none'; form-action 'none'; worker-src 'none'">
<script>
window.__TRAINING_DEMO__ = true;
const nativeFetch = window.fetch.bind(window);
window.fetch = function(input, init) {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (url.origin === location.origin) return nativeFetch(input, init);
  return Promise.resolve(new Response(JSON.stringify({error:"Integração desabilitada na demonstração"}), {status:403, headers:{"Content-Type":"application/json"}}));
};
window.open = function() { return null; };
if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(function(rs) { rs.forEach(function(r) { r.unregister(); }); });
</script>`);
      },
    },
  };
}

export default defineConfig({
  envDir: path.resolve(__dirname, "src/features/training/demo"),
  server: { host: "127.0.0.1", port: 8081, strictPort: true },
  plugins: [trainingIsolation(), react()],
  resolve: { alias: [
    { find: "@/integrations/supabase/client", replacement: path.resolve(__dirname, "src/features/training/demo/mockSupabase.ts") },
    { find: "@", replacement: path.resolve(__dirname, "src") },
  ] },
});
