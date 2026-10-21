import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Boutique d'objets de style : paiement Stripe (compte du propriétaire, clé dans .env du serveur),
// accord parental par email pour les 16–17 ans. Le parent valide et paie lui-même.

export const siteOrigin = createServerOnlyFn(async () => {
  const fixed = process.env["PUBLIC_SITE_URL"];
  if (fixed) return fixed.replace(/\/+$/, "");
  const h = getRequest()?.headers;
  const host = h?.get("x-forwarded-host") ?? h?.get("host") ?? "localhost:3000";
  const proto = h?.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
});

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function stripe(path: string, body?: URLSearchParams) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Le paiement n'est pas encore configuré sur le serveur.");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    ...(body ? { body } : {}),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) { console.error("Stripe", json); throw new Error("Le service de paiement a refusé la demande. Réessaie plus tard."); }
  return json;
}

async function createCheckout(order: { id: string; price_cents: number }, itemName: string, email?: string | null) {
  const origin = await siteOrigin();
  const p = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(order.price_cents),
    "line_items[0][price_data][product_data][name]": `CIVITAS — ${itemName}`,
    "metadata[order_id]": order.id,
    client_reference_id: order.id,
    success_url: `${origin}/paiement-style?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/paiement-style?annule=1`,
  });
  if (email) p.set("customer_email", email);
  const s = await stripe("checkout/sessions", p);
  return { id: String(s["id"]), url: String(s["url"]) };
}

async function sendParentEmail(to: string, playerName: string, itemName: string, price: string, link: string) {
  const host = process.env["SMTP_HOST"]; const user = process.env["SMTP_USER"]; const pass = process.env["SMTP_PASS"];
  if (!host || !user || !pass) throw new Error("L'envoi d'emails n'est pas encore configuré sur le serveur.");
  const port = Number(process.env["SMTP_PORT"] || 465);
  const nodemailer = await import("nodemailer");
  const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await t.sendMail({
    from: `CIVITAS <${user}>`, to,
    subject: `${playerName} vous demande votre accord pour un achat dans CIVITAS`,
    text: `Bonjour,\n\n${playerName} joue à CIVITAS, un jeu gratuit de simulation de vie citoyenne, et souhaite acheter un objet de style : « ${itemName} » pour ${price}.\n\nCet objet change seulement l'apparence. Il ne donne aucun avantage dans le jeu.\n\nSi vous êtes d'accord, ouvrez ce lien : vous pourrez accepter puis payer vous-même de façon sécurisée (Stripe).\n${link}\n\nSi vous refusez, ouvrez le même lien et appuyez sur « Refuser », ou ignorez simplement cet email. Rien ne sera payé.\n\nL'équipe CIVITAS`,
  });
}

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

export const startCosmeticOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { itemId: string; parentEmail?: string }) => {
    if (typeof i?.itemId !== "string" || i.itemId.length > 60) throw new Error("Objet invalide.");
    const email = i.parentEmail?.trim();
    if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Adresse email invalide.");
    return { itemId: i.itemId, ...(email ? { parentEmail: email } : {}) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ch } = await supabase.from("characters").select("first_name, age").eq("user_id", userId).maybeSingle();
    if (!ch) throw new Error("Crée d'abord ton personnage.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: item } = await admin.from("cosmetic_items").select("id, name, price_cents").eq("id", data.itemId).eq("active", true).maybeSingle();
    if (!item) throw new Error("Cet objet n'est pas disponible.");
    const { data: owned } = await admin.from("cosmetic_owned").select("item_id").eq("user_id", userId).eq("item_id", item.id).maybeSingle();
    if (owned) throw new Error("Tu possèdes déjà cet objet.");
    const minor = ch.age < 18;
    if (minor) {
      if (!data.parentEmail) throw new Error("Indique l'email d'un parent.");
      const token = crypto.randomUUID() + crypto.randomUUID();
      const { error } = await admin.from("cosmetic_orders").insert({ user_id: userId, item_id: item.id, price_cents: item.price_cents, status: "attente_parent", minor: true, parent_email: data.parentEmail, consent_token_hash: await sha256(token) });
      if (error) throw new Error("Impossible d'enregistrer la demande.");
      await sendParentEmail(data.parentEmail, ch.first_name, item.name, eur(item.price_cents), `${await siteOrigin()}/accord-parental?t=${token}`);
      return { kind: "parent" as const };
    }
    const { data: order, error } = await admin.from("cosmetic_orders").insert({ user_id: userId, item_id: item.id, price_cents: item.price_cents, status: "attente_paiement", minor: false }).select("id, price_cents").single();
    if (error || !order) throw new Error("Impossible d'enregistrer la commande.");
    const s = await createCheckout(order, item.name);
    await admin.from("cosmetic_orders").update({ stripe_session_id: s.id }).eq("id", order.id);
    return { kind: "pay" as const, url: s.url };
  });

async function orderByToken(token: string) {
  if (typeof token !== "string" || token.length < 40 || token.length > 100) throw new Error("Lien invalide.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data } = await admin.from("cosmetic_orders").select("id, status, price_cents, parent_email, created_at, cosmetic_items(name, description)").eq("consent_token_hash", await sha256(token)).maybeSingle();
  if (!data) throw new Error("Ce lien n'existe pas ou n'est plus valable.");
  return { admin, order: data };
}

export const readParentRequest = createServerFn({ method: "POST" })
  .inputValidator((i: { token: string }) => ({ token: String(i?.token ?? "") }))
  .handler(async ({ data }) => {
    const { order } = await orderByToken(data.token);
    return { status: order.status as string, price: eur(order.price_cents), name: order.cosmetic_items?.name as string, description: order.cosmetic_items?.description as string };
  });

export const decideParentRequest = createServerFn({ method: "POST" })
  .inputValidator((i: { token: string; accept: boolean }) => ({ token: String(i?.token ?? ""), accept: i?.accept === true }))
  .handler(async ({ data }) => {
    const { admin, order } = await orderByToken(data.token);
    if (order.status === "paye") return { kind: "done" as const };
    if (order.status === "refuse") return { kind: "refused" as const };
    if (!data.accept) {
      await admin.from("cosmetic_orders").update({ status: "refuse", decided_at: new Date().toISOString() }).eq("id", order.id).eq("status", "attente_parent");
      return { kind: "refused" as const };
    }
    const s = await createCheckout(order, order.cosmetic_items?.name ?? "Objet de style", order.parent_email);
    await admin.from("cosmetic_orders").update({ status: "attente_paiement", decided_at: new Date().toISOString(), stripe_session_id: s.id }).eq("id", order.id);
    return { kind: "pay" as const, url: s.url };
  });

// Le paiement est confirmé en interrogeant directement Stripe (source de vérité), une seule fois par commande.
export const confirmCosmeticPayment = createServerFn({ method: "POST" })
  .inputValidator((i: { session: string }) => {
    const s = String(i?.session ?? "");
    if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(s)) throw new Error("Paiement introuvable.");
    return { session: s };
  })
  .handler(async ({ data }) => {
    const s = await stripe(`checkout/sessions/${data.session}`);
    if (s["payment_status"] !== "paid") return { paid: false, name: null as string | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: order } = await admin.from("cosmetic_orders").select("id, user_id, item_id, status, price_cents, cosmetic_items(name)").eq("stripe_session_id", data.session).maybeSingle();
    if (!order || Number(s["amount_total"]) !== order.price_cents) throw new Error("Paiement introuvable.");
    if (order.status !== "paye") {
      await admin.from("cosmetic_orders").update({ status: "paye", paid_at: new Date().toISOString() }).eq("id", order.id);
      await admin.from("cosmetic_owned").upsert({ user_id: order.user_id, item_id: order.item_id, order_id: order.id }, { onConflict: "user_id,item_id", ignoreDuplicates: true });
    }
    return { paid: true, name: (order.cosmetic_items?.name ?? null) as string | null };
  });
