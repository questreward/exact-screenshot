import { describe, expect, it } from "vitest";
import { citiesInTitle, tripEnds } from "./trip-map";

describe("trajet sur la carte", () => {
  it("lit départ puis arrivée dans le titre", () => { expect(citiesInTitle("Train Lyon → Paris")).toEqual(["lyon", "paris"]); });
  it("utilise les villes enregistrées en priorité", () => { expect(tripEnds("lille", "bordeaux", "Train Lyon → Paris")?.from[1]).toBeCloseTo(50.634); });
  it("sans deux villes, pas de trajet affiché", () => { expect(tripEnds(null, null, "Trajet")).toBeNull(); });
});
