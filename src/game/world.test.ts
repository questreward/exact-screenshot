import { describe, expect, it } from "vitest";
import { dayPhase, movementAllowed, worldTime } from "./world";
describe("Déplacements du Bloc 2", () => {
  it("autorise un lieu accessible dans la ville actuelle", () => expect(movementAllowed("lyon", { city_id: "lyon", accessible: true })).toBe(true));
  it("interdit le voyage vers une autre ville", () => expect(movementAllowed("lyon", { city_id: "paris", accessible: true })).toBe(false));
  it("interdit un lieu inaccessible", () => expect(movementAllowed("lyon", { city_id: "lyon", accessible: false })).toBe(false));
  it("interdit un quartier indisponible", () => expect(movementAllowed("lyon", { city_id: "lyon", accessible: true }, false)).toBe(false));
  it("interdit une ville indisponible", () => expect(movementAllowed("lyon", { city_id: "lyon", accessible: true }, true, false)).toBe(false));
});
describe("Horloge du monde", () => {
  it("une minute réelle donne quatre minutes de jeu pour tous", () => expect(worldTime("2026-10-22 00:00:00", 60000, 4).toISOString()).toBe("2026-10-22T00:04:00.000Z"));
  it("avance à partir de l’heure du jeu et non de la date réelle", () => expect(worldTime("2027-09-01 08:00:00", 60000, 1).toISOString()).toBe("2027-09-01T08:01:00.000Z"));
  it("respecte la vitesse du monde", () => expect(worldTime("2027-09-01 08:00:00", 60000, 2).toISOString()).toBe("2027-09-01T08:02:00.000Z"));
  it.each([[6,"matin"],[10,"journee"],[18,"soiree"],[22,"nuit"],[0,"nuit"]] as const)("ambiance à %s heures", (hour, phase) => expect(dayPhase(hour)).toBe(phase));
});