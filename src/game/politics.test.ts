import { describe, expect, it } from "vitest";
import { compareAxes, compareLists, politicalAffinity, type PoliticalOrganization } from "./politics";

const topics = [{ id: "services_publics", axis_id: "services_publics" }, { id: "depenses", axis_id: "marche" }, { id: "logement", axis_id: "services_publics" }];
const stances = [{ id: "undefined", target: null }, { id: "weak", target: 35 }, { id: "moderate", target: 65 }, { id: "strong", target: 95 }];

describe("political affinity", () => {
  it("is null while no opinion is defined", () => {
    expect(politicalAffinity({ services_publics: 85 }, [], topics, stances)).toBeNull();
    expect(politicalAffinity({ services_publics: 85 }, [{ topic_id: "services_publics", stance: "undefined" }], topics, stances)).toBeNull();
  });
  it("is 100 minus the average gap between stance and party position", () => {
    expect(politicalAffinity({ services_publics: 85, marche: 35 }, [{ topic_id: "services_publics", stance: "strong" }], topics, stances)).toBe(90);
    expect(politicalAffinity({ services_publics: 85, marche: 35 }, [{ topic_id: "services_publics", stance: "strong" }, { topic_id: "depenses", stance: "strong" }], topics, stances)).toBe(65);
  });
  it("accepts contradictory opinions without failing", () => {
    const r = politicalAffinity({ services_publics: 85, marche: 82 }, [{ topic_id: "services_publics", stance: "strong" }, { topic_id: "depenses", stance: "strong" }], topics, stances);
    expect(r).toBe(89);
  });
  it("recalculates when an opinion changes", () => {
    const ideology = { services_publics: 40 };
    expect(politicalAffinity(ideology, [{ topic_id: "logement", stance: "strong" }], topics, stances)).toBe(45);
    expect(politicalAffinity(ideology, [{ topic_id: "logement", stance: "weak" }], topics, stances)).toBe(95);
  });
});

describe("comparator", () => {
  const org = (ideology: Record<string, number>) => ({ ideology } as unknown as PoliticalOrganization);
  it("lists every axis gap", () => {
    const rows = compareAxes(org({ services_publics: 85, marche: 35 }), org({ services_publics: 45, marche: 80 }), [
      { id: "services_publics", label: "", low_label: "", high_label: "", sort_order: 1 }, { id: "marche", label: "", low_label: "", high_label: "", sort_order: 2 }]);
    expect(rows.map(r => r.gap)).toEqual([40, 45]);
  });
  it("splits shared and distinct values", () => {
    expect(compareLists(["Solidarité", "Proximité"], ["Proximité", "Liberté"])).toEqual({ common: ["Proximité"], onlyA: ["Solidarité"], onlyB: ["Liberté"] });
  });
});
