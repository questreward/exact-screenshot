// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";
import { regenerateRoutes } from "./tools/route-generation";
import { resolve, sep } from "node:path";

// Before the app module graph is loaded; errors are fatal, not swallowed by
// the watch plugin. The existing Start plugin still owns live regeneration.
const root = fileURLToPath(new URL(".", import.meta.url));
await regenerateRoutes(root);

export default defineConfig({
  plugins: [{
    name: "civitas-route-deletion-recovery",
    configureServer(server) {
      const directory = resolve(root, "src/routes") + sep;
      let pending = Promise.resolve();
      const deleted = (file: string) => {
        if (!resolve(file).startsWith(directory)) return;
        pending = pending.then(() => regenerateRoutes(root)).catch(error => {
          server.config.logger.error(String(error));
          server.ws.send({ type: "error", err: { message: String(error), stack: "", plugin: "civitas-route-deletion-recovery" } });
        });
      };
      server.watcher.on("unlink", deleted);
      server.httpServer?.once("close", () => server.watcher.off("unlink", deleted));
    },
  }],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
