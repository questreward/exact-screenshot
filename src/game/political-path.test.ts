import { describe, expect, it } from "vitest";
import { politicalPath } from "./political-path";
const base = { opinions: 0, memberships: [], candidacies: [], mandates: [] };
describe("political path", () => {
  it("new player is Citoyen", () => expect(politicalPath(base).step.label).toBe("Citoyen"));
  it("an opinion makes a Sympathisant", () => expect(politicalPath({ ...base, opinions: 1 }).step.label).toBe("Sympathisant"));
  it("active member is Militant", () => expect(politicalPath({ ...base, memberships: [{ status: "active", role: "member" }] }).step.label).toBe("Militant"));
  it("active mandate is Élu", () => expect(politicalPath({ ...base, mandates: [{ status: "active" }] }).step.label).toBe("Élu"));
});
