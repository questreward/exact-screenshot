import { Suspense } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/game/communication";

const state = vi.hoisted(() => ({ messages: [] as Message[], read: vi.fn(), reply: vi.fn() }));
vi.mock("@/components/game/CivicProfileCard", () => ({ PlayerFace: () => null }));
vi.mock("@/services/game", () => ({
  communicationQuery: queryOptions({ queryKey: ["communication"], queryFn: async () => ({ unread: 1 }) }),
  threadsQuery: queryOptions({ queryKey: ["communication", "threads"], queryFn: async () => [{ id: "t1", npc_id: "npc1", last_message_at: "2026-10-22T10:00:00Z", npc: { first_name: "Camille", last_name: "Martin", location_id: "parc" } }] }),
  messagesQuery: queryOptions({ queryKey: ["communication", "messages"], queryFn: async () => [...state.messages] }),
  messageTemplatesQuery: queryOptions({ queryKey: ["communication", "templates"], queryFn: async () => ({ messages: [{ id: "welcome", replies: [{ id: "thanks", label: "Merci Camille", body: "Merci" }] }], posts: [] }) }),
  positionQuery: queryOptions({ queryKey: ["position"], queryFn: async () => ({ location_id: "parc" }) }),
  readThread: state.read, replyMessage: state.reply, interactSocial: vi.fn(),
}));
import { MessagesApp } from "./CommunicationApps";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("conversations du téléphone", () => {
  it("lit, répond puis retrouve le même historique après fermeture et réouverture", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    state.messages = [{ id: "m1", thread_id: "t1", sender: "npc", body: "Bienvenue dans le quartier", template_id: "welcome", sent_at: "2026-10-22T10:00:00Z", read_at: null, replied_with: null, location_id: "parc" }];
    state.read.mockImplementation(async () => { state.messages = state.messages.map(m => ({ ...m, read_at: "2026-10-22T10:01:00Z" })); });
    state.reply.mockImplementation(async () => { state.messages = [...state.messages.map(m => ({ ...m, replied_with: "thanks" })), { id: "m2", thread_id: "t1", sender: "player", body: "Merci", sent_at: "2026-10-22T10:02:00Z", template_id: null, read_at: null, replied_with: null, location_id: "parc" }]; });
    const q = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const mount = () => render(<QueryClientProvider client={q}><Suspense fallback={<p>Chargement</p>}><MessagesApp /></Suspense></QueryClientProvider>);
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: /Camille Martin/ }));
    await waitFor(() => expect(state.read).toHaveBeenCalledWith("t1", expect.anything()));
    fireEvent.click(await screen.findByRole("button", { name: "Merci Camille" }));
    await screen.findByText("Merci");
    expect(state.reply).toHaveBeenCalledWith({ messageId: "m1", replyId: "thanks" }, expect.anything());
    view.unmount(); mount();
    fireEvent.click(await screen.findByRole("button", { name: /Camille Martin/ }));
    expect(await screen.findByText("Merci")).toBeInTheDocument();
    expect(screen.getByText("Bienvenue dans le quartier")).toBeInTheDocument();
    expect(state.reply).toHaveBeenCalledTimes(1);
  });
});