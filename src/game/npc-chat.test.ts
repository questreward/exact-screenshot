import { describe, expect, it } from "vitest";
import { cleanReply, npcSystemPrompt, validateChat, MAX_TURNS } from "./npc-chat";

const id = "11111111-1111-1111-1111-111111111111";
const persona = { first_name: "Léa", last_name: "Martin", age: 34, profession: "Boulangère", description: "Souriante", traits: ["curieuse"], place: "Marché", city: "Lyon", relation: "Connaissance", hour: "10:00", events: [] };

describe("discussion avec les habitants", () => {
  it("refuse un message de plus de 300 caractères", () => {
    expect(() => validateChat({ npcId: id, history: [{ role: "user", content: "a".repeat(301) }] })).toThrow(/trop long/);
  });
  it("accepte 300 caractères", () => {
    expect(validateChat({ npcId: id, history: [{ role: "user", content: "a".repeat(300) }] }).history).toHaveLength(1);
  });
  it("ne garde que les 8 derniers échanges", () => {
    const history = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` }));
    history.push({ role: "user", content: "fin" });
    expect(validateChat({ npcId: id, history }).history).toHaveLength(MAX_TURNS);
  });
  it("exige que le dernier message vienne du joueur", () => {
    expect(() => validateChat({ npcId: id, history: [{ role: "assistant", content: "x" }] })).toThrow();
  });
  it("interdit les promesses dans les consignes", () => {
    expect(npcSystemPrompt(persona)).toMatch(/Ne promets jamais d'argent/);
  });
  it("réponse vide = habitant indisponible", () => {
    expect(() => cleanReply("  ")).toThrow(/pour le moment/);
  });
});
