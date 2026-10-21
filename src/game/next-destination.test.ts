import { describe, expect, it } from "vitest";
import { nextDestination } from "./next-step";
const loc = (id: string) => ({ id, name: id, city_id: "lille", district_id: "d" });
const act = (start: string, end: string, l: string, status = "planned") => ({ status, start_time: start, end_time: end, title: "x", location: loc(l) });
describe("prochaine destination", () => {
  it("prend l'activité à venir la plus proche", () => {
    expect(nextDestination([act("2026-10-20T15:00:00Z", "2026-10-20T16:00:00Z", "b"), act("2026-10-20T11:00:00Z", "2026-10-20T12:00:00Z", "a")], new Date("2026-10-20T10:00:00Z"))?.place.id).toBe("a");
  });
  it("ignore le lieu où l'on est déjà", () => {
    expect(nextDestination([act("2026-10-20T11:00:00Z", "2026-10-20T12:00:00Z", "a")], new Date("2026-10-20T10:00:00Z"), "a")).toBeNull();
  });
});
import { notificationEmoji, notificationTarget } from "./next-step";
describe("notifications", () => {
  const n = (title: string) => ({ title, body: "", news_id: null });
  it("salaire → banque 💶", () => { expect(notificationTarget(n("Salaire reçu"))).toBe("/banque"); expect(notificationEmoji(n("Salaire reçu"))).toBe("💶"); });
  it("alerte → secours 🚨", () => { expect(notificationTarget(n("ALERTE — Intervention"))).toBe("/secours"); expect(notificationEmoji(n("ALERTE — Intervention"))).toBe("🚨"); });
  it("livraison → boutique 📦", () => { expect(notificationTarget(n("Votre commande est arrivée"))).toBe("/boutique"); });
});
