import { describe, expect, it } from "vitest";
import { conversationMessages, phoneDataKeys, phoneNotificationTarget, phoneBackTarget } from "./phone-state";
import type { Message } from "./communication";

describe("smartphone connecté au monde", () => {
  it('les achats chargent uniquement les commandes existantes', () => {
    expect(phoneDataKeys('achats')).toEqual(['clock', 'notifications', 'shop']);
  });
  it('le retour quitte la conversation avant de quitter la messagerie', () => {
    expect(phoneBackTarget('messages', 'conversation-42')).toEqual({ app: 'messages', thread: undefined });
    expect(phoneBackTarget('messages')).toEqual({ app: undefined, thread: undefined });
  });
  it('le retour d’une autre application reste dans le téléphone', () => {
    expect(phoneBackTarget('banque')).toEqual({ app: undefined, thread: undefined });
  });
  it("n'ouvre pas banque, patrimoine ou conversations pour afficher l'accueil", () => {
    expect(phoneDataKeys()).toEqual(["clock", "notifications", "life", "news", "communication"]);
  });
  it("ouvre les seules dépendances des conversations", () => {
    expect(phoneDataKeys("messages")).toEqual(["clock", "notifications", "communication", "threads", "messages", "templates", "position"]);
  });
  it("réutilise la banque et le patrimoine existants sans demander le fil social", () => {
    expect(phoneDataKeys("banque")).toEqual(["clock", "notifications", "bank", "economy", "life"]);
  });
  it("conserve les messages enregistrés dans leur conversation et leur ordre", () => {
    const row = (id: string, thread_id: string, sent_at: string): Message => ({ id, thread_id, sent_at, sender: "npc", body: id, template_id: null, read_at: null, replied_with: null, location_id: null });
    const messages = [row("b", "t1", "2026-10-22T12:00:00Z"), row("x", "t2", "2026-10-22T09:00:00Z"), row("a", "t1", "2026-10-22T10:00:00Z")];
    expect(conversationMessages(messages, "t1").map(m => m.id)).toEqual(["a", "b"]);
    expect(messages.map(m => m.id)).toEqual(["b", "x", "a"]);
  });
  it("ouvre la vraie actualité référencée plutôt qu'un article inventé", () => {
    expect(phoneNotificationTarget({ title: "Article", body: "", news_id: "article-42" }, "/actualites")).toEqual({ to: "/actualites/$id", id: "article-42" });
  });
  it("ouvre le même compte bancaire dans le téléphone", () => {
    expect(phoneNotificationTarget({ title: "Salaire", body: "", news_id: null }, "/banque")).toEqual({ to: "/telephone", app: "banque" });
  });
});