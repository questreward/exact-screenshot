import { describe, expect, it } from "vitest";
import { cleanDraft, validateWriting } from "./writing-help";

const ok = { kind: "petition", tone: "serieux", ideas: "Plus de bancs au parc", max: 500 };
describe("aide à l'écriture", () => {
  it("refuse des idées de plus de 300 caractères", () => expect(() => validateWriting({ ...ok, ideas: "a".repeat(301) })).toThrow(/trop longues/));
  it("refuse un type d'écrit inconnu", () => expect(() => validateWriting({ ...ok, kind: "vote" })).toThrow(/inconnu/));
  it("accepte une demande valide", () => expect(validateWriting(ok).kind).toBe("petition"));
  it("le brouillon respecte la longueur maximale de l'écran", () => expect(cleanDraft("x".repeat(900), 500).length).toBe(500));
  it("brouillon vide = indisponible", () => expect(() => cleanDraft("", 500)).toThrow(/indisponible/));
});
