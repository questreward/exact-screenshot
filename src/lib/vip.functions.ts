import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { siteOrigin, sha256, stripe } from "@/lib/cosmetics.functions";

// CIVITAS VIP : 2,99 €/mois par Stripe (abonnement), sans essai, sans avantage de jeu.
// 16–17 ans : un parent accepte par email et paie lui-même. Stripe reste la source de vérité.
const PRICE = 299;

async function admin() { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as any; }

async function vipCheckout(subId: string, email?: string | null) {
  const origin = await siteOrigin();
  const p = new URLSearchParams({
    mode: "subscription",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(PRICE),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": "CIVITAS VIP — abonnement mensuel",
    "metadata[vip_id]": subId, "subscription_data[metadata][vip_id]": subId, client_reference_id: subId,
    success_url: `${origin}/paiement-vip?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/paiement-vip?annule=1`,
  });
  if (email) p.set("customer_email", email);
  const s = await stripe("checkout/sessions", p);
  return { id: String(s["id"]), url: String(s["url"]) };
}

async function sendParentEmail(to: string, playerName: string, link: string) {
  const host = process.env["SMTP_HOST"]; const user = process.env["SMTP_USER"]; const pass = process.env["SMTP_PASS"];
  if (!host || !user || !pass) throw new Error("L'envoi d'emails n'est pas encore configuré sur le serveur.");
  const port = Number(process.env["SMTP_PORT"] || 465);
  const nodemailer = await import("nodemailer");
  const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await t.sendMail({ from: `CIVITAS <${user}>`, to,
    subject: `${playerName} vous demande votre accord pour l'abonnement CIVITAS VIP`,
    text: `Bonjour,\n\n${playerName} joue à CIVITAS, un jeu gratuit, et souhaite s'abonner à CIVITAS VIP : 2,99 € par mois, sans engagement, résiliable à tout moment.\n\nLe VIP donne seulement un badge, des tenues exclusives, des thèmes et plus de favoris. Aucun avantage pour gagner dans le jeu.\n\nPour accepter puis payer vous-même (paiement sécurisé Stripe), ou pour refuser, ouvrez ce lien :\n${link}\n\nSi vous ignorez cet email, rien ne sera payé.\n\nL'équipe CIVITAS` });
}

// Relit Stripe quand la période est finie : renouvelle ou termine l'abonnement.
async function refresh(db: any, row: any) {
  if (row.status !== "actif" || !row.stripe_subscription_id || new Date(row.period_end).getTime() > Date.now()) return row;
  const sub = await stripe(`subscriptions/${row.stripe_subscription_id}`);
  const end = new Date(Number(sub["current_period_end"] ?? (sub as any).items?.data?.[0]?.current_period_end ?? 0) * 1000);
  const alive = ["active", "past_due"].includes(String(sub["status"])) && end.getTime() > Date.now();
  const next = alive ? { period_end: end.toISOString(), cancel_at_period_end: sub["cancel_at_period_end"] === true } : { status: "termine" };
  await db.from("vip_subscriptions").update(next).eq("id", row.id);
  return { ...row, ...next };
}

export const vipStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await admin();
  const { data: row } = await db.from("vip_subscriptions").select("*").eq("user_id", context.userId).in("status", ["attente_parent", "attente_paiement", "actif"]).maybeSingle();
  const r = row ? await refresh(db, row) : null;
  return { status: (r?.status ?? "aucun") as string, periodEnd: (r?.period_end ?? null) as string | null, cancelAtEnd: !!r?.cancel_at_period_end, minor: !!r?.minor };
});

export const startVip = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: { parentEmail?: string }) => {
    const email = i?.parentEmail?.trim();
    if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Adresse email invalide.");
    return email ? { parentEmail: email } : {};
  })
  .handler(async ({ data, context }) => {
    const { data: ch } = await context.supabase.from("characters").select("first_name, age").eq("user_id", context.userId).maybeSingle();
    if (!ch) throw new Error("Crée d'abord ton personnage.");
    const db = await admin();
    // Une demande en attente de paiement non finalisée est remplacée.
    await db.from("vip_subscriptions").update({ status: "refuse" }).eq("user_id", context.userId).in("status", ["attente_parent", "attente_paiement"]);
    const { data: live } = await db.from("vip_subscriptions").select("id").eq("user_id", context.userId).eq("status", "actif").maybeSingle();
    if (live) throw new Error("Tu es déjà VIP.");
    if (ch.age < 18) {
      if (!data.parentEmail) throw new Error("Indique l'email d'un parent.");
      const token = crypto.randomUUID() + crypto.randomUUID();
      const { error } = await db.from("vip_subscriptions").insert({ user_id: context.userId, status: "attente_parent", minor: true, parent_email: data.parentEmail, consent_token_hash: await sha256(token) });
      if (error) throw new Error("Impossible d'enregistrer la demande.");
      await sendParentEmail(data.parentEmail, ch.first_name, `${await siteOrigin()}/accord-vip?t=${token}`);
      return { kind: "parent" as const };
    }
    const { data: row, error } = await db.from("vip_subscriptions").insert({ user_id: context.userId, status: "attente_paiement", minor: false }).select("id").single();
    if (error || !row) throw new Error("Impossible d'enregistrer la demande.");
    const s = await vipCheckout(row.id);
    await db.from("vip_subscriptions").update({ stripe_session_id: s.id }).eq("id", row.id);
    return { kind: "pay" as const, url: s.url };
  });

export const cancelVip = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await admin();
  const { data: row } = await db.from("vip_subscriptions").select("id, stripe_subscription_id").eq("user_id", context.userId).eq("status", "actif").maybeSingle();
  if (!row?.stripe_subscription_id) throw new Error("Aucun abonnement actif.");
  await stripe(`subscriptions/${row.stripe_subscription_id}`, new URLSearchParams({ cancel_at_period_end: "true" }));
  await db.from("vip_subscriptions").update({ cancel_at_period_end: true }).eq("id", row.id);
  return { ok: true };
});

export const claimVipItems = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await admin();
  const { data: row } = await db.from("vip_subscriptions").select("id, period_end").eq("user_id", context.userId).eq("status", "actif").maybeSingle();
  if (!row || new Date(row.period_end).getTime() < Date.now()) throw new Error("Réservé aux membres VIP.");
  const { data: items } = await db.from("vip_items").select("item_id");
  for (const it of items ?? []) {
    const { data: has } = await db.from("cosmetic_owned").select("item_id").eq("user_id", context.userId).eq("item_id", it.item_id).maybeSingle();
    if (has) continue;
    const { data: order } = await db.from("cosmetic_orders").insert({ user_id: context.userId, item_id: it.item_id, price_cents: 0, status: "paye", minor: false, paid_at: new Date().toISOString() }).select("id").single();
    if (order) await db.from("cosmetic_owned").upsert({ user_id: context.userId, item_id: it.item_id, order_id: order.id }, { onConflict: "user_id,item_id", ignoreDuplicates: true });
  }
  return { ok: true };
});

async function byToken(token: string) {
  if (typeof token !== "string" || token.length < 40 || token.length > 100) throw new Error("Lien invalide.");
  const db = await admin();
  const { data } = await db.from("vip_subscriptions").select("id, status, parent_email").eq("consent_token_hash", await sha256(token)).maybeSingle();
  if (!data) throw new Error("Ce lien n'existe pas ou n'est plus valable.");
  return { db, row: data };
}

export const readVipParent = createServerFn({ method: "POST" }).inputValidator((i: { token: string }) => ({ token: String(i?.token ?? "") }))
  .handler(async ({ data }) => ({ status: (await byToken(data.token)).row.status as string }));

export const decideVipParent = createServerFn({ method: "POST" }).inputValidator((i: { token: string; accept: boolean }) => ({ token: String(i?.token ?? ""), accept: i?.accept === true }))
  .handler(async ({ data }) => {
    const { db, row } = await byToken(data.token);
    if (row.status === "actif") return { kind: "done" as const };
    if (row.status === "refuse" || row.status === "termine") return { kind: "refused" as const };
    if (!data.accept) { await db.from("vip_subscriptions").update({ status: "refuse" }).eq("id", row.id); return { kind: "refused" as const }; }
    const s = await vipCheckout(row.id, row.parent_email);
    await db.from("vip_subscriptions").update({ status: "attente_paiement", stripe_session_id: s.id }).eq("id", row.id);
    return { kind: "pay" as const, url: s.url };
  });

export const confirmVip = createServerFn({ method: "POST" })
  .inputValidator((i: { session: string }) => { const s = String(i?.session ?? ""); if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(s)) throw new Error("Paiement introuvable."); return { session: s }; })
  .handler(async ({ data }) => {
    const s = await stripe(`checkout/sessions/${data.session}`);
    if (s["status"] !== "complete" || !s["subscription"]) return { paid: false };
    const db = await admin();
    const { data: row } = await db.from("vip_subscriptions").select("id, status").eq("stripe_session_id", data.session).maybeSingle();
    if (!row) throw new Error("Paiement introuvable.");
    if (row.status !== "actif") {
      const sub = await stripe(`subscriptions/${String(s["subscription"])}`);
      const end = Number(sub["current_period_end"] ?? (sub as any).items?.data?.[0]?.current_period_end ?? 0) * 1000 || Date.now() + 30 * 86400000;
      await db.from("vip_subscriptions").update({ status: "actif", stripe_subscription_id: String(s["subscription"]), period_end: new Date(end).toISOString(), paid_at: new Date().toISOString() }).eq("id", row.id).neq("status", "actif");
    }
    return { paid: true };
  });
