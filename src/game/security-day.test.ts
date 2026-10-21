import { describe, expect, it } from "vitest";
import { securityDay } from "./security-day";

describe("securityDay", () => {
  it("firefighter fire steps follow évaluer → contrôler", () => expect(securityDay("pompier_pro").act).toEqual(["Évaluer", "Protéger", "Intervenir", "Évacuer", "Contrôler"]));
  it("police day starts with a briefing", () => expect(securityDay("police").rhythm[0]).toBe("Briefing"));
  it("SAMU nurse uses the ambulance", () => expect(securityDay("samu_infirmier").vehicle).toBe("Ambulance"));
});
