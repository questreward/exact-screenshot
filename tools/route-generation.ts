import { access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { readFile } from "node:fs/promises";
import { Generator, getConfig } from "@tanstack/router-generator";

/** Build-tool code only. Always rescan disk, never patch the generated tree. */
export async function regenerateRoutes(root: string) {
  const config = getConfig({
    routesDirectory: resolve(root, "src/routes"),
    generatedRouteTree: resolve(root, "src/routeTree.gen.ts"),
    tmpDir: resolve(root, ".tanstack/tmp"),
  }, root);
  await new Generator({ config, root }).run();
  const tree = await readFile(config.generatedRouteTree, "utf8");
  const imports = [...tree.matchAll(/from\s+['"](\.\/routes\/[^'"]+)['"]/g)];
  for (const match of imports) {
    const path = match[1];
    if (!path) continue;
    const base = resolve(dirname(config.generatedRouteTree), path);
    const candidates = /\.[cm]?[jt]sx?$/.test(base) ? [base] : [base + ".tsx", base + ".ts"];
    const present = await Promise.all(candidates.map(file => access(file).then(() => true, () => false)));
    if (!present.some(Boolean)) throw new Error(`Route absente après régénération : ${path}. Démarrage interrompu.`);
  }
}