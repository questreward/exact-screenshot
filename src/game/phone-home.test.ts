import { describe, expect, it } from "vitest";
import { MAIN_PHONE_APPS, MORE_PHONE_APPS, PHONE_APPS } from "./navigation";
describe("téléphone", () => {
  it("l'écran principal garde 10 applications, pas plus", () => { expect(MAIN_PHONE_APPS).toHaveLength(10); });
  it("aucune application existante n'est perdue", () => {
    const main = new Set(["profil", "banque", "messages", "social", "actualites", "agenda", "carte"]);
    expect(PHONE_APPS.every(a => main.has(a.id) || MORE_PHONE_APPS.some(m => m.id === a.id))).toBe(true);
  });
});
