import { describe, expect, it } from "vitest";
import { dayInfo, easter, holidays, payslip } from "./france-calendar";

describe("calendrier français", () => {
  it("Pâques 2027 le 28 mars", () => { expect(easter(2027).toISOString().slice(0, 10)).toBe("2027-03-28"); });
  it("11 jours fériés, dont lundi de Pâques et Ascension 2027", () => {
    const h = holidays(2027);
    expect(h).toHaveLength(11);
    expect(h.map(x => x.date)).toEqual(expect.arrayContaining(["2027-03-29", "2027-05-06", "2027-05-17", "2027-07-14"]));
  });
  it("le 11 novembre est férié et pendant aucune vacance ; le 20 octobre est en vacances de la Toussaint", () => {
    expect(dayInfo(new Date("2026-11-11T09:00:00Z")).holiday?.label).toBe("Armistice 1918");
    expect(dayInfo(new Date("2026-10-20T09:00:00Z")).school?.label).toBe("Vacances de la Toussaint");
  });
});

describe("bulletin de paie", () => {
  it("garde le net du jeu et recalcule un brut à 22 % de cotisations", () => {
    const p = payslip(1560);
    expect(p.gross).toBe(2000);
    expect(p.gross - p.lines.reduce((s, l) => s + l.amount, 0)).toBe(1560);
  });
});
