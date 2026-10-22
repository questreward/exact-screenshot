import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
const { start } = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("@/services/game", () => ({ lifeQuery: queryOptions({ queryKey: ["daily-life"], queryFn: async () => null, staleTime: Infinity }), startLifeActivity: start, formatMoney: (n: number) => `${n} €` }));
vi.mock("./WorldClock", () => ({ useWorldClock: () => ({ time: new Date("2026-10-22T01:00:00Z") }) }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
import { WorkDay } from "./WorkDay";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("service réel", () => {
  it("reprend une activité enregistrée la veille sans créer un nouveau service", () => {
    const q = new QueryClient();
    q.setQueryData(["daily-life"], { employment: { job: { title: "Facteur" }, location: { id: "depot", name: "Dépôt" } }, position: { location_id: "depot" }, rules: [], activities: [{ id: "night", type: "work", status: "running", title: "Distribution", start_time: "2026-10-21T21:00:00Z", end_time: "2026-10-22T05:00:00Z" }] });
    render(<QueryClientProvider client={q}><WorkDay /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("link", { name: "Reprendre ma mission" }));
    expect(start).not.toHaveBeenCalled();
    expect(q.getQueryData(["daily-life"])).toMatchObject({ activities: [{ id: "night", status: "running" }] });
  });
});