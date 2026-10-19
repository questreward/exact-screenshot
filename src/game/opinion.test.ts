import { describe, expect, it } from "vitest";
import { percents, threadPosts } from "./opinion";

describe("opinion", () => {
  it("calcule les pourcentages des réponses de joueurs", () => {
    expect(percents([3, 1])).toEqual([75, 25]);
    expect(percents([0, 0])).toEqual([0, 0]);
  });
  it("range les réponses sous l'intervention d'origine", () => {
    const t = threadPosts([{ id: "a", parent_id: null }, { id: "b", parent_id: "a" }, { id: "c", parent_id: null }]);
    expect(t.map(x => [x.post.id, x.replies.map(r => r.id)])).toEqual([["a", ["b"]], ["c", []]]);
  });
});
