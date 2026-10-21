import { describe, expect, it } from "vitest";
import { unreadFor } from "./desk-scene";
import type { PostLetter } from "./post";

const l = (sender: string, read: boolean, at = "2027-01-01"): PostLetter => ({ id: sender + at, sender, subject: "s", body: "b", registered: false, status: "delivered", presented_at: at, read_at: read ? at : null, archived: false });

describe("courriers à l'entrée des espaces", () => {
  const letters = [l("Espace fiscal · FICTIF", false), l("Banque Horizon · FICTIF", false), l("Espace fiscal · FICTIF", true, "2027-02-01")];
  it("les Impôts ne montrent que leurs courriers non lus", () => {
    expect(unreadFor("impots", letters)).toHaveLength(1);
  });
  it("la Banque ne voit pas les courriers des Impôts", () => {
    expect(unreadFor("banque", letters).map((x) => x.sender)).toEqual(["Banque Horizon · FICTIF"]);
  });
  it("La Poste montre tous les courriers non lus", () => {
    expect(unreadFor("poste", letters)).toHaveLength(2);
  });
});
