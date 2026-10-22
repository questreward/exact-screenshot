// @vitest-environment node
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { regenerateRoutes } from "../../tools/route-generation";

describe("startup route generation", () => {
  it("removes deleted route imports on a fresh startup and preserves surviving routes", async () => {
    const root = await mkdtemp(join(tmpdir(), "civitas-routes-"));
    try {
      await mkdir(join(root, "src/routes"), { recursive: true });
      await writeFile(join(root, "src/routes/__root.tsx"), 'import { createRootRoute } from "@tanstack/react-router"; export const Route = createRootRoute({});');
      for (const name of ["index", "removed", "kept"]) {
        await writeFile(join(root, `src/routes/${name}.tsx`), `import { createFileRoute } from "@tanstack/react-router"; export const Route = createFileRoute("/${name === "index" ? "" : name}")({});`);
      }
      await regenerateRoutes(root);
      expect(await readFile(join(root, "src/routeTree.gen.ts"), "utf8")).toContain("./routes/removed");
      await rm(join(root, "src/routes/removed.tsx"));
      await regenerateRoutes(root);
      const tree = await readFile(join(root, "src/routeTree.gen.ts"), "utf8");
      expect(tree).not.toContain("./routes/removed");
      expect(tree).toContain("./routes/kept");
      await regenerateRoutes(root);
      expect(await readFile(join(root, "src/routeTree.gen.ts"), "utf8")).toBe(tree);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});